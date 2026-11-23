const ExcelExport = (() => {
  const rootNumbers = new Set([
    'area_ha', 'litros', 'litros_por_hectarea', 'litros_por_hectarea_objetivo', 'variacion_porcentaje',
    'temperatura', 'humedad', 'viento', 'delta_t', 'latitud', 'longitud', 'precision_gps_m',
    'personas_llegaron', 'distanciamiento_surco', 'volumen_asperjadora', 'rpm', 'catorcena'
  ]);
  const rootTimes = new Set(['hora', 'hora_registro']);
  const normalize = value => String(value == null ? '' : value).trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const normalizeField = value => normalize(value).replace(/[_-]+/g, ' ');
  const scalar = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  function dateValue(value) {
    const text = scalar(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
    const date = new Date(text + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : '';
  }
  function firstValue(data, keys) {
    for (const key of keys) {
      const value = scalar(data && data[key]);
      if (value) return value;
    }
    return '';
  }
  function recordDetails(record) {
    const data = record.datos;
    const details = data.subregistros && data.subregistros.malezas_detalle;
    return record.tipo === 'malezas' && Array.isArray(details) && details.length
      ? details.map((detail, index) => ({ detail, index, kind: 'malezas' }))
      : record.tipo === 'clima' && Array.isArray(data.lecturas) && data.lecturas.length
        ? data.lecturas.map((detail, index) => ({ detail, index, kind: 'clima' }))
        : [{ detail: null, index: 0, kind: '' }];
  }
  function rowLabors(data, detail) {
    const childLabor = firstValue(detail, ['labor', 'LABOR']);
    return childLabor ? [childLabor] : ['labor', 'LABOR', 'labor_aplicacion', 'labor_pcpm'].map(key => scalar(data[key])).filter(Boolean);
  }
  function filterOptions(records) {
    const values = { farm: new Map(), zone: new Map(), labor: new Map(), owner: new Map() };
    const add = (key, value) => {
      const text = scalar(value);
      if (text && !values[key].has(normalize(text))) values[key].set(normalize(text), text);
    };
    for (const record of records) {
      if (!record || !record.datos || typeof record.datos !== 'object' || Array.isArray(record.datos)) continue;
      const data = record.datos;
      add('farm', firstValue(data, ['finca', 'FINCA']));
      add('zone', firstValue(data, ['zona', 'ZONA', 'zone', 'ZONE']));
      add('owner', record.owner_username);
      for (const { detail } of recordDetails(record)) {
        for (const labor of rowLabors(data, detail)) add('labor', labor);
      }
    }
    return Object.fromEntries(Object.entries(values).map(([key, entries]) =>
      [key, [...entries.values()].sort((a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }))]));
  }
  function matchingRows(record, filters) {
    if (!record || !record.datos || typeof record.datos !== 'object' || Array.isArray(record.datos)) return [];
    const data = record.datos;
    const children = recordDetails(record);
    return children.filter(({ detail }) => {
      const date = dateValue(firstValue(detail, ['fecha', 'FECHA', 'Fecha']) || firstValue(data, ['fecha', 'FECHA', 'Fecha']));
      if ((filters.from || filters.to) && !date) return false;
      if ((filters.from && date < filters.from) || (filters.to && date > filters.to)) return false;
      if (filters.farm && normalize(firstValue(data, ['finca', 'FINCA'])) !== normalize(filters.farm)) return false;
      if (filters.zone && normalize(firstValue(data, ['zona', 'ZONA', 'zone', 'ZONE'])) !== normalize(filters.zone)) return false;
      if (filters.owner && normalize(record.owner_username) !== normalize(filters.owner)) return false;
      const labors = rowLabors(data, detail);
      return !filters.labor || labors.some(labor => normalize(labor) === normalize(filters.labor));
    }).map(({ detail, index, kind }) => {
      const copy = { ...data };
      if (kind === 'malezas') copy.subregistros = { ...data.subregistros, malezas_detalle: detail };
      if (kind === 'clima') copy.lecturas = detail;
      return { record, data: copy, detailNumber: kind ? index + 1 : null };
    });
  }
  function label(key) {
    const text = String(key).replace(/[_-]+/g, ' ').trim();
    return text ? text.charAt(0).toLocaleUpperCase('es') + text.slice(1) : 'Dato';
  }
  function typedFields(childSchemas, qualityForms) {
    const result = { numbers: new Set([...rootNumbers].map(normalizeField)), times: new Set([...rootTimes].map(normalizeField)), dates: new Set(['fecha']) };
    for (const schema of Object.values(childSchemas || {})) {
      for (const field of schema) {
        const key = normalizeField(field.key || field.label);
        if (field.type === 'number') result.numbers.add(key);
        if (field.type === 'time') result.times.add(key);
        if (field.type === 'date') result.dates.add(key);
      }
    }
    for (const form of Object.values(qualityForms || {})) {
      for (const field of form.fields || []) {
        const key = normalizeField(field.key || field.label);
        if (field.type === 'number') result.numbers.add(key);
        if (field.type === 'time') result.times.add(key);
        if (field.type === 'date') result.dates.add(key);
      }
    }
    return result;
  }
  function cellValue(value, key, fields) {
    if (value == null) return '';
    if (typeof value === 'boolean' || typeof value === 'number') return value;
    const text = String(value);
    const normalizedKey = normalizeField(key);
    const date = fields.dates.has(normalizedKey) && dateValue(text);
    if (date) return { value: new Date(date + 'T00:00:00Z'), numFmt: 'dd/mm/yyyy' };
    if (fields.times.has(normalizedKey)) {
      const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(text.trim());
      if (match) return { value: (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0)) / 86400, numFmt: 'hh:mm:ss' };
    }
    if (fields.numbers.has(normalizedKey) && /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim())) {
      const number = Number(text);
      if (Number.isFinite(number) && text.replace(/[^0-9]/g, '').length <= 15) return number;
    }
    return text;
  }
  function flatten(value, path, output, fields) {
    const put = (key, item) => {
      if (output.has(key)) throw new Error('Una captura contiene nombres de campo duplicados al exportar: ' + key);
      output.set(key, item);
    };
    if (Array.isArray(value)) {
      if (!value.length) put(path.join(' · '), '[]');
      value.forEach((item, index) => flatten(item, [...path, String(index + 1)], output, fields));
      return;
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value).filter(([key]) =>
        !(key === 'dataUrl' && 'name' in value && 'mimeType' in value));
      if (!entries.length) put(path.join(' · '), '{}');
      for (const [key, item] of entries) flatten(item, [...path, label(key)], output, fields);
      return;
    }
    const key = path[path.length - 1];
    const result = cellValue(value, key, fields);
    if (typeof result === 'string' && /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(result)) {
      throw new Error('Una captura contiene caracteres que Excel no admite. Corrige el registro antes de exportar.');
    }
    if (typeof result === 'string' && result.length > 32767) {
      for (let start = 0, part = 1; start < result.length; part++) {
        let end = Math.min(start + 32767, result.length);
        if (end < result.length && /[\ud800-\udbff]/.test(result[end - 1])) end--;
        put(path.join(' · ') + ' · Parte ' + part, result.slice(start, end));
        start = end;
      }
    } else put(path.join(' · '), result);
  }
  function malezasLotCode(value) {
    const code = scalar(value);
    return /^\d{1,7}$/.test(code) ? code.padStart(7, '0') : code;
  }
  function writeMalezasSheet(workbook, rows, links, calendar) {
    const headers = ['ID', 'UBICACIÓN', 'RESPONSABLE', 'ZONA', 'PERIODO', 'FECHA', 'CATORCENA',
      'FINCA', 'LOTE', 'FECHA DE CORTE O SIEMBRA', 'LABOR', 'DIA DE EVALUACIÓN',
      '% CONTROL', '% COBERTURA', 'OBSERVACIONES'];
    if (rows.length > 1048570) throw new Error('La exportación supera los límites de Excel; reduce los filtros.');
    const cycles = new Map();
    for (const link of links) {
      const date = dateValue(link.cycle_date);
      if (!date) continue;
      const key = String(link.record_id) + ':' + malezasLotCode(link.lot_code);
      if (cycles.has(key) && cycles.get(key) !== date) {
        throw new Error('Una visita tiene fechas de ciclo contradictorias; revisa sus vínculos antes de exportar.');
      }
      cycles.set(key, date);
    }
    const sheet = workbook.addWorksheet('Visita Malezas', { views: [{ state: 'frozen', ySplit: 6 }] });
    for (const [row, title] of [
      [1, 'INGENIO MADRE TIERRA'],
      [2, 'DEPTO. CONTROL DE MALEZAS Y MADURANTES'],
      [3, 'Evaluación de la Efectividad Control de Malezas']
    ]) {
      sheet.mergeCells(row, 1, row, headers.length);
      const cell = sheet.getCell(row, 1);
      cell.value = title;
      cell.font = { bold: true, size: row === 1 ? 14 : 11 };
      cell.alignment = { horizontal: 'center' };
    }
    sheet.getRow(6).values = headers;
    sheet.getRow(6).font = { bold: true };
    sheet.getRow(6).alignment = { vertical: 'middle', wrapText: true };
    sheet.getRow(6).height = 30;
    sheet.columns.forEach((column, i) => { column.width = [38, 24, 25, 12, 12, 15, 14, 24, 14, 24, 15, 20, 15, 17, 42][i]; });
    sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: headers.length } };
    for (const item of rows) {
      const data = item.record.datos;
      const detail = item.data.subregistros && item.data.subregistros.malezas_detalle || data;
      const lot = malezasLotCode(firstValue(detail, ['LOTE', 'lote']));
      const visitDate = dateValue(firstValue(detail, ['FECHA', 'fecha']) || firstValue(data, ['FECHA', 'fecha']));
      const cycleDate = cycles.get(String(item.record.id) + ':' + lot) || '';
      const period = visitDate && calendar ? calendar(visitDate) : null;
      const percent = key => {
        const value = firstValue(detail, [key]);
        if (!value) return null;
        const number = Number(value.replace(',', '.'));
        if (!Number.isFinite(number) || number < 0 || number > 100) {
          throw new Error('El lote ' + lot + ' tiene un valor inválido de ' + key + '.');
        }
        return number / 100;
      };
      const control = percent('% CONTROL');
      const savedCoverage = percent('% COBERTURA');
      const coverage = savedCoverage === null && control !== null ? 1 - control : savedCoverage;
      const values = [
        item.record.id, firstValue(data, ['UBICACIÓN', 'ubicacion']), firstValue(data, ['RESPONSABLE', 'responsable']),
        firstValue(data, ['ZONA', 'zona']), period ? Number(period.period) : null,
        visitDate ? new Date(visitDate + 'T00:00:00Z') : null,
        Number(firstValue(detail, ['CATORCENA', 'catorcena'])) || (period ? period.number : null),
        firstValue(data, ['FINCA', 'finca']), lot,
        cycleDate ? new Date(cycleDate + 'T00:00:00Z') : null,
        firstValue(detail, ['LABOR', 'labor']),
        visitDate && cycleDate ? (Date.parse(visitDate + 'T00:00:00Z') - Date.parse(cycleDate + 'T00:00:00Z')) / 86400000 : null,
        control, coverage, firstValue(detail, ['OBSERVACIONES', 'observaciones'])
      ];
      for (const value of values) {
        if (typeof value === 'string' && (value.length > 32767 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(value))) {
          throw new Error('Un valor de Malezas supera los límites de Excel o contiene caracteres no admitidos.');
        }
      }
      const row = sheet.addRow(values);
      for (const col of [6, 10]) row.getCell(col).numFmt = 'dd/mm/yyyy';
      for (const col of [13, 14]) row.getCell(col).numFmt = '0.00%';
    }
  }
  async function createWorkbook(records, selectedModules, filters, definitions, schemas, ExcelJS, options = {}) {
    if (!ExcelJS || !ExcelJS.Workbook) throw new Error('No se pudo cargar el componente de Excel.');
    const fields = typedFields(schemas.childSchemas, schemas.qualityForms);
    const workbook = new ExcelJS.Workbook();
    let totalRows = 0;
    for (const type of selectedModules) {
      if (!definitions[type]) throw new Error('El módulo seleccionado no es válido.');
      if (type === 'malezas') {
        const malezasRows = records.filter(record => record.tipo === type).flatMap(record => matchingRows(record, filters));
        writeMalezasSheet(workbook, malezasRows, options.visitLinks || [], options.weedsCatorcenaForDate);
      }
      const sheet = workbook.addWorksheet(definitions[type].title.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
      const rows = [];
      const columns = new Set(['ID de captura', 'Usuario', 'Nombre', 'Fecha de creación (UTC)', 'Versión', 'Estado de revisión', 'Revisado por', 'Fecha de revisión (UTC)', 'Nota de revisión', 'Número de detalle']);
      for (const record of records) {
        if (record.tipo !== type) continue;
        for (const item of matchingRows(record, filters)) {
          const row = new Map([
            ['ID de captura', record.id], ['Usuario', record.owner_username || ''],
            ['Nombre', record.owner_name || ''],
            ['Fecha de creación (UTC)', record.created_at ? { value: new Date(record.created_at), numFmt: 'dd/mm/yyyy hh:mm:ss' } : ''],
            ['Versión', record.schema_version], ['Estado de revisión', record.review_status],
            ['Revisado por', record.reviewed_by || ''],
            ['Fecha de revisión (UTC)', record.reviewed_at ? { value: new Date(record.reviewed_at), numFmt: 'dd/mm/yyyy hh:mm:ss' } : ''],
            ['Nota de revisión', record.review_note || ''], ['Número de detalle', item.detailNumber || '']
          ]);
          flatten(item.data, ['Datos'], row, fields);
          for (const key of row.keys()) columns.add(key);
          rows.push(row);
        }
      }
      if (rows.length >= 1048576 || columns.size > 16384) throw new Error('La exportación supera los límites de Excel; reduce los filtros.');
      const keys = [...columns];
      sheet.columns = keys.map(key => ({ header: key, key, width: Math.min(42, Math.max(16, key.length + 2)) }));
      const positions = new Map(keys.map((key, index) => [key, index + 1]));
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: keys.length } };
      for (const row of rows) {
        const excelRow = sheet.addRow([]);
        for (const [key, value] of row) {
          if (value == null || value === '') continue;
          const cell = excelRow.getCell(positions.get(key));
          if (value && typeof value === 'object' && 'numFmt' in value) {
            cell.value = value.value;
            cell.numFmt = value.numFmt;
          } else cell.value = value;
        }
      }
      totalRows += rows.length;
    }
    return { buffer: await workbook.xlsx.writeBuffer(), totalRows };
  }
  return { matchingRows, filterOptions, typedFields, cellValue, flatten, dateValue, createWorkbook };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ExcelExport;
