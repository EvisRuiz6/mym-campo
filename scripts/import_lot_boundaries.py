#!/usr/bin/env python3
"""Import the UTM zone 15N lot polygons into the RLS-protected Supabase table."""

import argparse
import codecs
import json
import math
import os
import re
import struct
import zipfile
from pathlib import PurePosixPath
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


EPSG = "EPSG:32615"
POLYGON_SHAPE_TYPES = {5, 15, 25}
SIMPLIFY_TOLERANCE_METERS = 2.0
DEFAULT_BATCH_SIZE = 25
DBF_FIELDS = {"desc_finca", "finca", "no_lote_1", "zona"}


class DBFDecodeError(ValueError):
    def __init__(self, field, encoding):
        super().__init__(
            "El campo DBF '" + field + "' no coincide con la codificación " + encoding + "."
        )


def _archive_name(value):
    return value.replace("\\", "/")


def _select_shapefile(names, requested):
    shapefiles = [
        name for name in names
        if PurePosixPath(_archive_name(name)).suffix.lower() == ".shp"
    ]
    if requested:
        normalized = _archive_name(requested).casefold()
        basename = PurePosixPath(normalized).name
        matches = [
            name for name in shapefiles
            if _archive_name(name).casefold() == normalized
            or PurePosixPath(_archive_name(name)).name.casefold() == basename
        ]
        if len(matches) != 1:
            raise ValueError("No se encontró un shapefile único con el nombre indicado.")
        return matches[0]

    preferred = [
        name for name in shapefiles
        if "MAESTRO_LOTES_26_27_OFICIAL_AGOSTO_UTM_V1" in name.upper()
    ]
    if len(preferred) == 1:
        return preferred[0]
    if len(shapefiles) == 1:
        return shapefiles[0]
    if not shapefiles:
        raise ValueError("El ZIP no contiene archivos .shp.")
    raise ValueError("El ZIP contiene varios shapefiles; indica cuál usar con --shapefile.")


def _sibling_member(names, shapefile, extension, required=True):
    stem = str(PurePosixPath(_archive_name(shapefile)).with_suffix(""))
    wanted = (stem + extension).casefold()
    matches = [name for name in names if _archive_name(name).casefold() == wanted]
    if len(matches) == 1:
        return matches[0]
    if required:
        raise ValueError("Falta el archivo compañero ." + extension.lstrip(".") + " del shapefile.")
    return None


def _projection_is_utm_15n(data):
    text = data.decode("utf-8-sig", errors="ignore")
    normalized = re.sub(r"[\s_]+", " ", text).casefold()
    has_epsg = "32615" in normalized
    has_wgs84 = "wgs 1984" in normalized or "wgs 84" in normalized
    has_zone_15 = re.search(r"utm zone 15n?\b", normalized) is not None
    return has_epsg or (has_wgs84 and has_zone_15)


def _dbf_encoding(data):
    label = data.decode("ascii", errors="ignore").strip().strip('"')
    if not label:
        return "cp1252"
    if label.isdigit():
        label = "cp" + label
    try:
        return codecs.lookup(label).name
    except LookupError as error:
        raise ValueError("La codificación DBF indicada en el archivo .cpg no es compatible.") from error


def _parse_dbf(data, encoding):
    if len(data) < 33:
        raise ValueError("El archivo DBF está incompleto.")

    record_count = struct.unpack_from("<I", data, 4)[0]
    header_length = struct.unpack_from("<H", data, 8)[0]
    record_length = struct.unpack_from("<H", data, 10)[0]
    if header_length < 33 or record_length < 1 or header_length > len(data):
        raise ValueError("El encabezado DBF contiene longitudes inválidas.")

    fields = []
    offset = 32
    while offset + 32 <= header_length and data[offset] != 0x0D:
        descriptor = data[offset:offset + 32]
        raw_name = descriptor[:11].split(b"\0", 1)[0]
        name = raw_name.decode("ascii", errors="ignore").strip().casefold()
        field_type = chr(descriptor[11])
        field_length = descriptor[16]
        if not name or field_length == 0:
            raise ValueError("El DBF contiene una definición de campo inválida.")
        fields.append((name, field_type, field_length))
        offset += 32

    if not fields or 1 + sum(field[2] for field in fields) > record_length:
        raise ValueError("No se pudieron leer los campos del DBF.")
    field_names = {field[0] for field in fields}
    missing = sorted({"no_lote_1", "zona"} - field_names)
    if not field_names.intersection({"desc_finca", "finca"}):
        missing.append("desc_finca o finca")
    if missing:
        raise ValueError("El DBF no contiene los campos requeridos: " + ", ".join(missing) + ".")
    if header_length + record_count * record_length > len(data):
        raise ValueError("Los registros DBF están incompletos.")

    records = []
    offset = header_length
    for _ in range(record_count):
        raw_record = data[offset:offset + record_length]
        offset += record_length
        if raw_record[0:1] == b"*":
            records.append(None)
            continue
        values = {}
        field_offset = 1
        for name, field_type, field_length in fields:
            raw_value = raw_record[field_offset:field_offset + field_length]
            field_offset += field_length
            if name not in DBF_FIELDS:
                continue
            try:
                value = raw_value.decode(encoding, errors="strict").strip()
            except UnicodeDecodeError as error:
                raise DBFDecodeError(name, encoding) from error
            if field_type in {"N", "F"} and value.endswith(".0"):
                value = value[:-2]
            values[name] = value
        records.append(values)
    return records


def _parse_shapefile(data):
    if len(data) < 100 or struct.unpack_from(">i", data, 0)[0] != 9994:
        raise ValueError("El archivo SHP no tiene un encabezado válido.")
    file_length = struct.unpack_from(">i", data, 24)[0] * 2
    header_shape_type = struct.unpack_from("<i", data, 32)[0]
    if file_length > len(data) or header_shape_type not in POLYGON_SHAPE_TYPES:
        raise ValueError("El SHP no contiene polígonos válidos.")

    records = []
    offset = 100
    while offset < file_length:
        if offset + 8 > file_length:
            raise ValueError("El SHP termina dentro del encabezado de un registro.")
        _, content_words = struct.unpack_from(">2i", data, offset)
        offset += 8
        content_length = content_words * 2
        end = offset + content_length
        if content_length < 4 or end > file_length:
            raise ValueError("El SHP contiene un registro incompleto.")
        content = data[offset:end]
        offset = end

        shape_type = struct.unpack_from("<i", content, 0)[0]
        if shape_type == 0:
            records.append(None)
            continue
        if shape_type not in POLYGON_SHAPE_TYPES or len(content) < 44:
            raise ValueError("El SHP contiene una geometría que no es poligonal.")

        part_count, point_count = struct.unpack_from("<2i", content, 36)
        if part_count < 1 or point_count < 4:
            raise ValueError("El SHP contiene un polígono sin anillos válidos.")
        parts_end = 44 + part_count * 4
        points_end = parts_end + point_count * 16
        if points_end > len(content):
            raise ValueError("El SHP contiene coordenadas incompletas.")
        parts = struct.unpack_from("<" + str(part_count) + "i", content, 44)
        if parts[0] != 0 or any(part < 0 or part >= point_count for part in parts):
            raise ValueError("El SHP contiene índices de anillo inválidos.")

        points = [
            struct.unpack_from("<2d", content, parts_end + index * 16)
            for index in range(point_count)
        ]
        if any(not math.isfinite(x) or not math.isfinite(y) for x, y in points):
            raise ValueError("El SHP contiene coordenadas no finitas.")
        starts = list(parts) + [point_count]
        rings = []
        for index in range(part_count):
            ring = list(points[starts[index]:starts[index + 1]])
            if len(ring) < 3:
                raise ValueError("El SHP contiene un anillo con menos de tres puntos.")
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            simplified = _simplify_ring(ring, SIMPLIFY_TOLERANCE_METERS)
            rings.append([[round(x, 2), round(y, 2)] for x, y in simplified])
        records.append(rings)
    return records


def _squared_distance_to_segment(point, start, end):
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length_squared = dx * dx + dy * dy
    if length_squared == 0:
        nearest_x, nearest_y = start
    else:
        fraction = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length_squared
        fraction = max(0.0, min(1.0, fraction))
        nearest_x = start[0] + fraction * dx
        nearest_y = start[1] + fraction * dy
    return (point[0] - nearest_x) ** 2 + (point[1] - nearest_y) ** 2


def _simplify_open_line(points, tolerance):
    if len(points) <= 2 or tolerance <= 0:
        return points
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    threshold = tolerance * tolerance
    while stack:
        start_index, end_index = stack.pop()
        farthest_index = None
        farthest_distance = threshold
        for index in range(start_index + 1, end_index):
            distance = _squared_distance_to_segment(
                points[index], points[start_index], points[end_index]
            )
            if distance > farthest_distance:
                farthest_index = index
                farthest_distance = distance
        if farthest_index is not None:
            keep.add(farthest_index)
            stack.append((start_index, farthest_index))
            stack.append((farthest_index, end_index))
    return [points[index] for index in sorted(keep)]


def _simplify_ring(ring, tolerance):
    vertices = ring[:-1] if ring[0] == ring[-1] else ring[:]
    if len(vertices) <= 4 or tolerance <= 0:
        return vertices + [vertices[0]]

    start = vertices[0]
    farthest_index = max(
        range(1, len(vertices)),
        key=lambda index: (vertices[index][0] - start[0]) ** 2 + (vertices[index][1] - start[1]) ** 2,
    )
    first_half = _simplify_open_line(vertices[:farthest_index + 1], tolerance)
    second_half = _simplify_open_line(vertices[farthest_index:] + [start], tolerance)
    simplified = first_half[:-1] + second_half[:-1] + [start]
    if len(simplified) < 4:
        return vertices + [vertices[0]]
    return simplified


def _plain_value(value):
    text = str(value or "").strip()
    if re.fullmatch(r"[0-9]+\.0+", text):
        return text.split(".", 1)[0]
    return text


def _lot_code(value):
    code = _plain_value(value)
    if not code.isdigit() or len(code) > 7:
        raise ValueError("El campo No_Lote_1 debe contener un código numérico de hasta siete dígitos.")
    return code.zfill(7)


def load_boundaries(zip_path, shapefile_member=None):
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        shp_member = _select_shapefile(names, shapefile_member)
        dbf_member = _sibling_member(names, shp_member, ".dbf")
        prj_member = _sibling_member(names, shp_member, ".prj")
        cpg_member = _sibling_member(names, shp_member, ".cpg", required=False)

        if not _projection_is_utm_15n(archive.read(prj_member)):
            raise ValueError("La proyección del shapefile no es WGS 84 / UTM zona 15N (EPSG:32615).")
        dbf_data = archive.read(dbf_member)
        if cpg_member:
            attributes = _parse_dbf(dbf_data, _dbf_encoding(archive.read(cpg_member)))
        else:
            try:
                attributes = _parse_dbf(dbf_data, "utf-8")
            except DBFDecodeError:
                try:
                    attributes = _parse_dbf(dbf_data, "cp1252")
                except DBFDecodeError as error:
                    raise ValueError(
                        "No se pudo inferir la codificación del DBF como UTF-8 o Windows-1252: "
                        + str(error)
                    ) from error
        shapes = _parse_shapefile(archive.read(shp_member))

    if len(shapes) != len(attributes):
        raise ValueError("El número de polígonos no coincide con los registros DBF.")

    rows = []
    seen_codes = set()
    for index, (rings, record) in enumerate(zip(shapes, attributes), start=1):
        if record is None:
            continue
        if rings is None:
            raise ValueError("El registro " + str(index) + " no tiene geometría.")
        code = _lot_code(record.get("no_lote_1", ""))
        zone = _plain_value(record.get("zona", ""))
        finca = _plain_value(record.get("desc_finca", "")) or _plain_value(record.get("finca", ""))
        if not zone or not finca:
            raise ValueError("El registro " + str(index) + " no tiene zona o finca.")
        if code in seen_codes:
            raise ValueError("El código de lote " + code + " aparece más de una vez en el shapefile.")
        seen_codes.add(code)
        rows.append({
            "lot_code": code,
            "zone": zone,
            "finca": finca,
            "geometry": {"crs": EPSG, "rings": rings},
        })

    if not rows:
        raise ValueError("El shapefile no contiene lotes importables.")
    return shp_member, rows


def _validate_supabase_url(url):
    parsed = urlparse(url)
    if parsed.scheme != "https" and not (
        parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
    ):
        raise ValueError("SUPABASE_URL debe usar HTTPS (excepto en desarrollo local).")
    if not parsed.netloc:
        raise ValueError("SUPABASE_URL no es válida.")


def upload_boundaries(rows, url, service_role_key, batch_size=DEFAULT_BATCH_SIZE):
    _validate_supabase_url(url)
    endpoint = url.rstrip("/") + "/rest/v1/field_lot_boundaries?on_conflict=lot_code"
    headers = {
        "apikey": service_role_key,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    if not service_role_key.startswith("sb_secret_"):
        headers["Authorization"] = "Bearer " + service_role_key
    batch_count = (len(rows) + batch_size - 1) // batch_size
    for batch_index, offset in enumerate(range(0, len(rows), batch_size), start=1):
        body = json.dumps(
            rows[offset:offset + batch_size], ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        request = Request(endpoint, data=body, headers=headers, method="POST")
        try:
            with urlopen(request, timeout=90):
                pass
        except HTTPError as error:
            raise RuntimeError(
                "Supabase rechazó el lote " + str(batch_index) + "/" + str(batch_count)
                + " (HTTP " + str(error.code) + "). Verifica la migración, la URL y la clave."
            ) from None
        except URLError as error:
            raise RuntimeError("No se pudo conectar con Supabase: " + str(error.reason)) from error


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Lee el maestro de lotes y, con --upload, lo carga en la tabla protegida por RLS."
    )
    parser.add_argument("zip_path", help="Ruta del ZIP que contiene el shapefile")
    parser.add_argument("--shapefile", help="Nombre del .shp dentro del ZIP si hay varios")
    parser.add_argument("--upload", action="store_true", help="Envía los polígonos a Supabase")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    args = parser.parse_args(argv)
    if args.batch_size < 1 or args.batch_size > 100:
        parser.error("--batch-size debe estar entre 1 y 100.")

    try:
        shp_member, rows = load_boundaries(args.zip_path, args.shapefile)
        if not args.upload:
            print(
                "Lectura correcta: " + str(len(rows)) + " lotes de "
                + shp_member + ". No se enviaron datos; agrega --upload para importar."
            )
            return 0
        url = os.environ.get("SUPABASE_URL", "").strip()
        service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not url or not service_role_key:
            raise ValueError(
                "Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno local antes de usar --upload."
            )
        upload_boundaries(rows, url, service_role_key, args.batch_size)
    except (OSError, ValueError, RuntimeError, zipfile.BadZipFile) as error:
        parser.error(str(error))

    print("Importación completada: " + str(len(rows)) + " lotes cargados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
