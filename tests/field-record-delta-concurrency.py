"""Integration test: run only against a disposable migrated local PostgreSQL database."""
import concurrent.futures
import os
import threading
import uuid

import psycopg
from psycopg.types.json import Jsonb


dsn = os.environ["TEST_DATABASE_URL"]
with psycopg.connect(dsn) as check:
    host = check.info.host
    address = str(check.execute("select inet_server_addr()").fetchone()[0])
    if (host not in ("127.0.0.1", "localhost", "::1") or address not in ("127.0.0.1", "::1")
            or check.info.dbname != "mym_sync_test"):
        raise RuntimeError("The test requires the disposable local database mym_sync_test.")

owner, other, admin, first, second, hidden = (uuid.uuid4() for _ in range(6))
with psycopg.connect(dsn) as setup:
    for user in (owner, other, admin):
        name = "test_" + user.hex[:20]
        setup.execute(
            "insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data) values (%s,%s,%s,%s)",
            (user, name + "@example.invalid", Jsonb({"username": name, "display_name": "Test"}), Jsonb({})),
        )
    setup.execute("update public.profiles set role='aereo', status='active' where id in (%s,%s)", (owner, other))
    setup.execute("update public.profiles set role='admin', status='active' where id=%s", (admin,))
    for record, user in ((first, owner), (second, owner), (hidden, other)):
        setup.execute(
            "insert into public.field_records(id,owner_id,tipo,schema_version,datos) values (%s,%s,'clima',1,%s)",
            (record, user, Jsonb({"value": 0})),
        )

with psycopg.connect(dsn, autocommit=True) as reader:
    reader.execute("set role authenticated")
    reader.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(owner),))

    def sync(after=None):
        return reader.execute("select public.get_field_record_sync(%s)", (after,)).fetchone()[0]

    initial = sync()
    assert initial["full"] and set(initial["ids"]) == {str(first), str(second)}
    assert str(hidden) not in initial["ids"]
    reader.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(admin),))
    admin_result = sync()
    assert {str(first), str(second), str(hidden)} <= set(admin_result["ids"])
    reader.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(owner),))
    assert str(hidden) not in sync(admin_result["cursor"])["ids"]
    unchanged = sync(initial["cursor"])
    assert not unchanged["full"] and unchanged["records"] == []

    # Transaction A starts first but commits after B and after the reader's snapshot.
    with psycopg.connect(dsn) as a, psycopg.connect(dsn) as b:
        a.execute("set local statement_timeout = '2s'")
        b.execute("set local statement_timeout = '2s'")
        a.execute("update public.field_records set datos=%s where id=%s", (Jsonb({"value": 1}), first))
        b.execute("update public.field_records set datos=%s where id=%s", (Jsonb({"value": 2}), second))
        b.commit()
        middle = sync(unchanged["cursor"])
        assert {row["id"] for row in middle["records"]} == {str(second)}
        a.commit()
    later = sync(middle["cursor"])
    assert {row["id"] for row in later["records"]} == {str(first)}
    assert later["records"][0]["datos"]["value"] == 1
    assert sync(later["cursor"])["records"] == []

    # Independent row writes must not take a common lock. A can wait for B's
    # row without preventing B from committing, even when A writes it next.
    with psycopg.connect(dsn) as a, psycopg.connect(dsn) as b:
        a.execute("set local statement_timeout = '3s'")
        b.execute("set local statement_timeout = '3s'")
        a.execute("update public.field_records set datos=%s where id=%s", (Jsonb({"value": 3}), first))
        b.execute("update public.field_records set datos=%s where id=%s", (Jsonb({"value": 4}), second))
        started = threading.Event()

        def update_second():
            started.set()
            a.execute("update public.field_records set datos=%s where id=%s", (Jsonb({"value": 5}), second))

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(update_second)
            assert started.wait(1)
            b.commit()
            future.result(timeout=4)
        a.rollback()

    before_profile = sync()
    with psycopg.connect(dsn) as writer:
        writer.execute("update public.profiles set display_name='Nuevo nombre' where id=%s", (owner,))
    changed_profile = sync(before_profile["cursor"])
    assert {row["id"] for row in changed_profile["records"]} == {str(first), str(second)}
    assert all(row["profiles"]["display_name"] == "Nuevo nombre" for row in changed_profile["records"])

    with psycopg.connect(dsn) as writer:
        writer.execute("delete from public.field_records where id=%s", (first,))
    after_delete = sync(changed_profile["cursor"])
    assert set(after_delete["ids"]) == {str(second)}
    assert str(hidden) not in after_delete["ids"]

    old_epoch = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa|" + after_delete["cursor"].split("|")[1]
    reset = sync(old_epoch)
    assert reset["full"] and {row["id"] for row in reset["records"]} == {str(second)}
    future_cursor = after_delete["cursor"].split("|")[0] + "|1:9223372036854775807:"
    reset = sync(future_cursor)
    assert reset["full"] and {row["id"] for row in reset["records"]} == {str(second)}

print("Concurrent delta synchronization and privacy verified.")
