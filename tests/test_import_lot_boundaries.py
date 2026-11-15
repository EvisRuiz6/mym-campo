import struct
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import import_lot_boundaries


def _shapefile_bytes():
    points = [
        (500000.0, 1500000.0),
        (500100.0, 1500000.0),
        (500100.0, 1500100.0),
        (500000.0, 1500100.0),
        (500000.0, 1500000.0),
    ]
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    content = struct.pack(
        "<i4d2i", 5, min(xs), min(ys), max(xs), max(ys), 1, len(points)
    )
    content += struct.pack("<i", 0)
    content += b"".join(struct.pack("<2d", *point) for point in points)

    file_length = 100 + 8 + len(content)
    header = bytearray(100)
    struct.pack_into(">i", header, 0, 9994)
    struct.pack_into(">i", header, 24, file_length // 2)
    struct.pack_into("<i", header, 28, 1000)
    struct.pack_into("<i", header, 32, 5)
    struct.pack_into("<4d", header, 36, min(xs), min(ys), max(xs), max(ys))
    record_header = struct.pack(">2i", 1, len(content) // 2)
    return bytes(header) + record_header + content


def _dbf_bytes(description="CAMANTULUL", encoding="ascii"):
    fields = [
        ("No_Lote_1", "N", 16, "100101.000000"),
        ("Finca", "C", 8, "001"),
        ("Desc_Finca", "C", 20, description),
        ("Zona", "N", 16, "1.000000"),
    ]
    header_length = 32 + 32 * len(fields) + 1
    record_length = 1 + sum(field[2] for field in fields)
    header = bytearray(32)
    header[0] = 0x03
    struct.pack_into("<I", header, 4, 1)
    struct.pack_into("<H", header, 8, header_length)
    struct.pack_into("<H", header, 10, record_length)

    descriptors = bytearray()
    values = bytearray(b" ")
    for name, field_type, length, value in fields:
        descriptor = bytearray(32)
        encoded_name = name.encode("ascii")
        descriptor[:len(encoded_name)] = encoded_name
        descriptor[11] = ord(field_type)
        descriptor[16] = length
        descriptors.extend(descriptor)
        encoded_value = value.encode(encoding)
        values.extend(encoded_value.rjust(length) if field_type == "N" else encoded_value.ljust(length))
    return bytes(header) + bytes(descriptors) + b"\r" + bytes(values) + b"\x1a"


def _write_archive(
    path,
    projection="WGS_1984_UTM_Zone_15N",
    with_cpg=True,
    description="CAMANTULUL",
    dbf_encoding="ascii",
):
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("shape/lots.shp", _shapefile_bytes())
        archive.writestr("shape/lots.dbf", _dbf_bytes(description, dbf_encoding))
        archive.writestr("shape/lots.prj", projection)
        if with_cpg:
            archive.writestr("shape/lots.cpg", "1252")


class ImportLotBoundariesTests(unittest.TestCase):
    def test_reads_polygon_attributes_and_preserves_seven_digit_lot_code(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "lots.zip"
            _write_archive(archive_path)

            shapefile, rows = import_lot_boundaries.load_boundaries(archive_path)

        self.assertEqual(shapefile, "shape/lots.shp")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["lot_code"], "0100101")
        self.assertEqual(rows[0]["zone"], "1")
        self.assertEqual(rows[0]["finca"], "CAMANTULUL")
        self.assertEqual(rows[0]["geometry"]["crs"], "EPSG:32615")
        self.assertEqual(rows[0]["geometry"]["rings"][0][0], [500000.0, 1500000.0])
        self.assertEqual(
            rows[0]["geometry"]["rings"][0][0],
            rows[0]["geometry"]["rings"][0][-1],
        )

    def test_rejects_a_shapefile_outside_utm_zone_15n(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "lots.zip"
            _write_archive(archive_path, "WGS_1984_UTM_Zone_14N")

            with self.assertRaisesRegex(ValueError, "zona 15N"):
                import_lot_boundaries.load_boundaries(archive_path)

    def test_detects_utf8_dbf_when_no_cpg_file_is_present(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "lots.zip"
            _write_archive(
                archive_path,
                with_cpg=False,
                description="SAN MIGUEL MÁLAGA",
                dbf_encoding="utf-8",
            )

            _, rows = import_lot_boundaries.load_boundaries(archive_path)

        self.assertEqual(rows[0]["finca"], "SAN MIGUEL MÁLAGA")


if __name__ == "__main__":
    unittest.main()
