const DB_NAME = 'mym-campo-local';
const DB_VERSION = 2;
const SESSION_KEY = 'mym-campo-auth-session';
const PROFILE_KEY = 'mym-campo-auth-profile';
const INVITE_PENDING_KEY = 'mym-campo-invite-pending';
const LOT_LOOKUP_CACHE_KEY = 'mym-campo-lot-lookup:';
const NO_EMAIL_AUTH_DOMAIN = 'users.mym-campo.invalid';
const ROLE_OPTIONS = ['aereo', 'terrestre', 'supervisor', 'admin'];
const modules = {
  clima: { title: 'Clima', subtitle: 'Ubicación y lecturas de las condiciones de campo.', icon: '☀', group: 'aereo', roles: ['aereo'] },
  malezas: { title: 'Malezas', subtitle: 'Visita y captura de control por lote.', icon: '⌁', group: 'supervision', roles: ['supervisor'] },
  epp: { title: 'EPP', subtitle: 'Asistencia y cumplimiento por función y EPP.', icon: '✳', group: 'aereo', roles: ['aereo'] },
  vuelos: { title: 'Vuelos', subtitle: 'Aplicaciones con dron y consumo por hectárea.', icon: '↗', group: 'aereo', roles: ['aereo'] },
  calidad: { title: 'Calidad', subtitle: 'Supervisión de Aguilón, Arranque y PC/PM.', icon: '✓', group: 'supervision', roles: ['supervisor'] },
  variacion_aguilon: { title: 'Variación Aguilón', subtitle: 'Variación de área y mezcla por lote.', icon: '≈', group: 'terrestre', roles: ['terrestre'] },
  calibracion_aguilon: { title: 'Calibraciones Aguilón', subtitle: 'Calibración de equipos de aplicación terrestre.', icon: '◉', group: 'terrestre', roles: ['terrestre'] },
  calibraciones_pcpm: { title: 'Calibraciones PC y PM', subtitle: 'Presión constante, presión manual, foqueo y rondeo.', icon: '⚙', group: 'terrestre', roles: ['terrestre'] }
};
const eppFunctions = [
  { key: '1_MEZCLA', label: 'Mezcla', items: ['Mascarilla con filtro de carbono', 'Overol impermeable/gabacha', 'Botas de hule', 'Guantes', 'Gorra', 'Lentes'] },
  { key: '2_MONITOREO', label: 'Monitoreo', items: ['Mascarilla con filtro de carbono', 'Overol impermeable', 'Lentes', 'Gorra', 'Botas de hule'] },
  { key: '3_ENCARGADO', label: 'Encargado', items: ['Chaleco reflectante', 'Gorra', 'Lentes'] },
  { key: '4_PILOTO DRON', label: 'Piloto de dron', items: ['Chaleco reflectante', 'Gorra', 'Lentes'] },
  { key: '5_APOYO DRON', label: 'Apoyo de dron', items: ['Chaleco reflectante', 'Gorra', 'Guantes', 'Lentes', 'Protectores auditivos', 'Botas de hule/ Botas industriales'] },
  { key: '6_ZONA SENSIBLE', label: 'Zona sensible', items: ['Chaleco', 'Lentes', 'Gorra', 'Camisa manga larga'] },
  { key: '7_ ENVASES', label: 'Envases', items: ['Guantes', 'Lentes'] },
  { key: '8_INVESTIGACIÓN', label: 'Investigación', items: ['Mascarilla con filtro de carbono', 'Overol impermeable/gabacha', 'Botas de hule', 'Guantes', 'Gorra', 'Lentes'] }
];
const qualityForms = {
  aguilon: {
    label: 'F.C. AGUILÓN',
    fields: [
      { label: 'FECHA', key: 'FECHA', type: 'date', value: localDate(), required: true },
      { label: 'Equipo de Aplicación', key: 'Equipo de Aplicación' },
      { label: 'Nombre del Caporal', key: 'Nombre del Caporal' },
      { label: 'Nombre del Tractorista', key: 'Nombre del Tractorista' },
      { label: '¿Hay presencia de fugas?', key: '¿Hay presencia de fugas?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Días después del corte/siembra (Edad del cultivo)', key: 'Días después del corte/siembra (Edad del cultivo)', type: 'number', step: '1' },
      { label: 'Volumen de aplicación (Litros/ha)', key: 'Volumen de aplicación (Litros/ha)', type: 'number', step: '0.01' },
      { label: 'Velocidad de aplicación (Km/Hr)', key: 'Velocidad de aplicación (Km/Hr)', type: 'number', step: '0.01' },
      { label: 'Tipo de Boquilla', key: 'Tipo de Boquilla' },
      { label: '¿El equipo fue calibrado previo a la aplicación?', key: '¿El equipo fue calibrado previo a la aplicación?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'PSI de aplicación (Manómetro)', key: 'PSI de aplicación (Manómetro)', type: 'number', step: '0.01' },
      { label: 'Ancho de faja de aplicación (Metros)', key: 'Ancho de faja de aplicación (Metros)', type: 'number', step: '0.01' },
      { label: '¿Hay agitación constante?', key: '¿Hay agitación constante?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Deriva en la cortina de aplicación', key: 'Deriva en la cortina de aplicación' },
      { label: '¿Existe traslape de la aplicación?', key: '¿Existe traslape de la aplicación?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: '¿Se observan boquillas tapadas?', key: '¿Se observan boquillas tapadas?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: '¿Cuál es la altura de la barra (Metros)?', key: '¿Cuál es la altura de la barra (Metros)?', type: 'number', step: '0.01' },
      { label: 'Hora de inicio de supervisión', key: 'Hora de inicio de supervisión', type: 'time' },
      { label: 'Hora fin de supervisión', key: 'Hora fin de supervisión', type: 'time' },
      { label: '¿El Sistema de iluminación está en buen estado?', key: '¿El Sistema de iluminación está en buen estado?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: '¿El personal está usando EPP en buen estado?', key: '¿El personal está usando EPP en buen estado?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Observaciones Generales', key: 'Observaciones Generales', type: 'textarea', full: true },
      { label: 'IMAGEN', key: 'IMAGEN', type: 'file', accept: 'image/*', full: true }
    ]
  },
  arranque: {
    label: 'F.C. ARRANQUE',
    fields: [
      { label: 'FECHA', key: 'FECHA', type: 'date', value: localDate(), required: true },
      { label: 'Días después del corte/siembra (Edad del cultivo)', key: 'Días después del corte/siembra (Edad del cultivo)', type: 'number', step: '1' },
      { label: '¿Existe Maleza con altura mayor a 15 cm en área ya arrancada?', key: '¿Existe Maleza con altura mayor a 15 cm en área ya arrancada?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: '¿Existen Malezas con flor?', key: '¿Existen Malezas con flor?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Se esta utilizando machete', key: 'Se esta utilizando machete', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Observaciones Generales', key: 'Observaciones Generales', type: 'textarea', full: true },
      { label: 'IMAGEN', key: 'IMAGEN', type: 'file', accept: 'image/*', full: true }
    ]
  },
  pcpm: {
    label: 'F.C. PC Y PM',
    fields: [
      { label: 'FECHA', key: 'FECHA', type: 'date', value: localDate(), required: true },
      { label: 'Equipo de Aplicación', key: 'Equipo de Aplicación' },
      { label: 'Código del Caporal', key: 'Código del Caporal' },
      { label: 'Nombre del Caporal', key: 'Nombre del Caporal' },
      { label: 'Código del Tractorista', key: 'Código del Tractorista' },
      { label: 'Nombre del Tractorista', key: 'Nombre del Tractorista' },
      { label: '¿Hay presencia de fugas?', key: '¿Hay presencia de fugas?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Días después del corte/siembra (Edad del cultivo)', key: 'Días después del corte/siembra (Edad del cultivo)', type: 'number', step: '1' },
      { label: 'Volumen de aplicación (Litros/ha)', key: 'Volumen de aplicación (Litros/ha)', type: 'number', step: '0.01' },
      { label: 'Velocidad de aplicación (Km/Hr)', key: 'Velocidad de aplicación (Km/Hr)', type: 'number', step: '0.01' },
      { label: 'Tipo de Boquilla', key: 'Tipo de Boquilla' },
      { label: '¿El equipo fue calibrado previo a la aplicación?', key: '¿El equipo fue calibrado previo a la aplicación?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'PSI de aplicación (Manómetro)', key: 'PSI de aplicación (Manómetro)', type: 'number', step: '0.01' },
      { label: '¿Hay agitación constante?', key: '¿Hay agitación constante?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: '¿Se observan boquillas tapadas?', key: '¿Se observan boquillas tapadas?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: '¿Cuál es la altura de las boquillas (Metros)?', key: '¿Cuál es la altura de las boquillas (Metros)?', type: 'number', step: '0.01' },
      { label: 'Horario Inicio de Supervisión', key: 'Horario Inicio de Supervisión', type: 'time' },
      { label: 'Horario Fin Supervisión', key: 'Horario Fin Supervisión', type: 'time' },
      { label: '¿El personal está usando EPP en buen estado?', key: '¿El personal está usando EPP en buen estado?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Observaciones Generales', key: 'Observaciones Generales', type: 'textarea', full: true },
      { label: 'IMAGEN', key: 'IMAGEN', type: 'file', accept: 'image/*', full: true }
    ]
  }
};
const childSchemas = {
  malezas_detalle: [
    { label: 'FECHA', key: 'FECHA', type: 'date', value: localDate() },
    { label: 'LOTE', key: 'LOTE', lotLookup: true },
    { label: 'LABOR', key: 'LABOR' },
    { label: '% CONTROL', key: '% CONTROL', type: 'number', step: '0.01', min: '0', max: '100' },
    { label: '% COBERTURA', key: '% COBERTURA', type: 'number', step: '0.01', min: '0', max: '100' },
    { label: 'IMAGEN', key: 'IMAGEN', type: 'file', accept: 'image/*', full: true },
    { label: 'CATORCENA', key: 'CATORCENA', type: 'number', step: '1' },
    { label: 'OBSERVACIONES', key: 'OBSERVACIONES', type: 'textarea', full: true }
  ],
  calibracion_pc: [
    { label: 'CODIGO DE APLICADOR' }, { label: 'NOMBRE DEL APLICADOR' }, { label: 'Código de Bomba' },
    { label: 'Presión manométrica llenado de aire', type: 'number', step: '0.01' },
    { label: 'Presión manométrica llenado de mezcla', type: 'number', step: '0.01' },
    { label: 'Presión manométrica salida de boquillas', type: 'number', step: '0.01' },
    { label: 'Tiempo recorrido', type: 'number', step: '0.01' }, { label: 'Largo de Calibración (m)', type: 'number', step: '0.01' },
    { label: 'Velocidad de aplicación', type: 'number', step: '0.01', calculated: true },
    { label: 'Ancho de labor o aplicación (m)', type: 'number', step: '0.01' },
    { label: 'Área de Calibración (m2)', type: 'number', step: '0.01', calculated: true },
    { label: 'Vol mezcla (L/Ha)', type: 'number', step: '0.01' }, { label: 'DESCARGA L/MIN', type: 'number', step: '0.01' },
    { label: 'Vol mezcla (L/Ha) Real', type: 'number', step: '0.01', calculated: true },
    { label: '% VARIACIÓN', type: 'number', step: '0.01', calculated: true }
  ],
  calibracion_pm: [
    { label: 'CODIGO DE APLICADOR' }, { label: 'NOMBRE DEL APLICADOR' }, { label: 'Código de Bomba' },
    { label: 'Presión manométrica llenado de aire', type: 'number', step: '0.01' },
    { label: 'Presión manométrica llenado de mezcla', type: 'number', step: '0.01' },
    { label: 'Presión manométrica salida de boquillas', type: 'number', step: '0.01' },
    { label: 'Tiempo recorrido', type: 'number', step: '0.01' }, { label: 'Largo de Calibración (m)', type: 'number', step: '0.01' },
    { label: 'Velocidad de aplicación', type: 'number', step: '0.01', calculated: true },
    { label: 'Ancho de labor o aplicación (m)', type: 'number', step: '0.01' },
    { label: 'Área de Calibración (m2)', type: 'number', step: '0.01', calculated: true },
    { label: 'Vol mezcla (L/Ha)', type: 'number', step: '0.01' }, { label: 'DESCARGA L/MIN', type: 'number', step: '0.01' },
    { label: 'Vol mezcla (L/Ha) Real', type: 'number', step: '0.01', calculated: true },
    { label: '% VARIACIÓN', type: 'number', step: '0.01', calculated: true }
  ],
  foqueo_persona: [
    { label: 'FECHA', type: 'date' }, { label: 'CODIGO DE APLICADOR' }, { label: 'NOMBRE DEL APLICADOR' },
    { label: 'Ancho de labor o aplicación (m)', type: 'number', step: '0.01' },
    { label: 'Velocidad de aplicación', type: 'number', step: '0.01' }, { label: 'Vol mezcla (L/Ha)', type: 'number', step: '0.01' },
    { label: 'DESCARGA L/MIN', type: 'number', step: '0.01', calculated: true },
    { label: 'DESCARGA L/MIN REAL', type: 'number', step: '0.01' }, { label: '% VARIACIÓN', type: 'number', step: '0.01', calculated: true }
  ],
  foqueo_volumen: [
    { label: 'FECHA', type: 'date' }, { label: 'Vol mezcla (L/Ha) Teórico', type: 'number', step: '0.01' },
    { label: 'Ancho de labor o aplicación (m)', type: 'number', step: '0.01' },
    { label: 'DESCARGA L/MIN', type: 'number', step: '0.01' }, { label: 'Velocidad de aplicación', type: 'number', step: '0.01' },
    { label: 'Vol mezcla (L/Ha)', type: 'number', step: '0.01', calculated: true },
    { label: '% VARIACIÓN', type: 'number', step: '0.01', calculated: true }
  ],
  var_aguilonada: [
    { label: 'Fecha', type: 'date' }, { label: 'LTS/HA', type: 'number', step: '0.01' },
    { label: 'CARGA POR AGUILONADA', type: 'number', step: '0.01' },
    { label: 'AREA ANTERIOR', type: 'number', step: '0.01' }, { label: 'AREA ACUMULADA', type: 'number', step: '0.01' },
    { label: 'AREA REAL', type: 'number', step: '0.01', calculated: true },
    { label: '% VARIACIÓN', type: 'number', step: '0.01', calculated: true },
    { label: 'VARIACIÓN AREA', type: 'number', step: '0.01', calculated: true },
    { label: 'Observaciones', type: 'textarea' }
  ],
  var_mezcla: [
    { label: 'LOTE 1', lotLookup: true }, { label: 'LOTE 2', lotLookup: true }, { label: 'LOTE 3', lotLookup: true }, { label: 'LOTE 4', lotLookup: true }, { label: 'LOTE 5', lotLookup: true },
    { label: 'AREA PROGRAMADA', type: 'number', step: '0.01' }, { label: 'VOLUMEN/HA TEORICO', type: 'number', step: '0.01' },
    { label: 'MEZCLA TEORICA', type: 'number', step: '0.01', calculated: true },
    { label: 'AREA REAL', type: 'number', step: '0.01' }, { label: 'VOLUMEN/HA REAL', type: 'number', step: '0.01' },
    { label: 'MEZCLA REAL', type: 'number', step: '0.01', calculated: true },
    { label: 'VARIACIÓN AREA', type: 'number', step: '0.01', calculated: true },
    { label: 'VARIACIÓN VOLUMEN', type: 'number', step: '0.01', calculated: true }
  ],
  aguilon_electro: [
    { label: 'ID_TRACTOR' }, { label: 'ID_AGUILÓN' },
    { label: 'INGRESO A PROG. CALIBRACION', type: 'select', options: ['NO', 'SI'] },
    { label: 'PANTALLA DE CALIBRACION', type: 'select', options: ['NO', 'SI'] },
    { label: 'LARGO DE CALIBRACIÓN', type: 'number', step: '0.01' },
    { label: 'TIEMPO RECORRIDO 1', type: 'number', step: '0.01' }, { label: 'TIEMPO RECORRIDO 2', type: 'number', step: '0.01' },
    { label: 'TIEMPO RECORRIDO 3', type: 'number', step: '0.01' }, { label: 'PROMEDIO TIEMPO RECORRIDO', type: 'number', step: '0.01', calculated: true },
    { label: 'TIEMPO PANTALLA', type: 'number', step: '0.01' }, { label: 'VEL. APLICACIÓN', type: 'number', step: '0.01', calculated: true },
    { label: 'PRESION MANOMETRICA', type: 'number', step: '0.01' },
    { label: 'PRESION SECCION 1', type: 'number', step: '0.01' }, { label: 'PRESION SECCION 2', type: 'number', step: '0.01' },
    { label: 'PRESION SECCION 3', type: 'number', step: '0.01' }, { label: 'PRESION SECCION 4', type: 'number', step: '0.01' },
    { label: 'DIST. ENTRE BOQUILLAS', type: 'number', step: '0.01' }, { label: 'ALTURA BOQUILLAS', type: 'number', step: '0.01' },
    { label: 'ANCHO DE LABOR', type: 'number', step: '0.01' }, { label: 'AREA CALIBRACIÓN', type: 'number', step: '0.01', calculated: true },
    { label: 'NUMERO DE BOQUILLAS', type: 'number', step: '1' },
    ...Array.from({ length: 30 }, (_, i) => ({ label: 'B' + (i + 1), type: 'number', step: '0.01' })),
    { label: 'BOQUILLAS EVALUADAS', type: 'number', step: '1' }, { label: 'PROMEDIO BOQUILLAS', type: 'number', step: '0.01', calculated: true },
    { label: 'Descarga real (Lts/min)', type: 'number', step: '0.01', calculated: true }, { label: 'DECARGA PANTALLA', type: 'number', step: '0.01' },
    { label: 'VOLUMEN APLICACIÓN', type: 'number', step: '0.01' }, { label: 'VOLUMEN REAL', type: 'number', step: '0.01', calculated: true },
    { label: '% VARIACION', type: 'number', step: '0.01', calculated: true },
    { label: 'CONSTANTE PANTALLA', type: 'number', step: '0.01' }, { label: 'CONSTANTE NUEVA', type: 'number', step: '0.01', calculated: true }
  ],
  aguilon_polea: [
    { label: 'ID_TRACTOR' }, { label: 'ID_AGUILÓN' }, { label: 'LARGO DE CALIBRACION', type: 'number', step: '0.01' },
    { label: 'TIEMPO RECORRIDO 1', type: 'number', step: '0.01' }, { label: 'TIEMPO RECORRIDO 2', type: 'number', step: '0.01' },
    { label: 'TIEMPO RECORRIDO 3', type: 'number', step: '0.01' }, { label: 'TIEMPO RECORRIDO 4', type: 'number', step: '0.01' },
    { label: 'PROMEDIO TIEMPO RECORRIDO', type: 'number', step: '0.01', calculated: true },
    { label: 'VEL. APLICACION', type: 'number', step: '0.01', calculated: true }, { label: 'PRESION MANOMETRICA', type: 'number', step: '0.01' },
    { label: 'DIST. ENTRE BOQUILLAS', type: 'number', step: '0.01' }, { label: 'ALTURA BOQUILLAS', type: 'number', step: '0.01' },
    { label: 'ANCHO DE LABOR', type: 'number', step: '0.01' }, { label: 'AREA DE CALIBRACIÓN', type: 'number', step: '0.01', calculated: true },
    { label: 'NUMERO DE BOQUILLAS', type: 'number', step: '1' },
    ...Array.from({ length: 30 }, (_, i) => ({ label: 'B' + (i + 1), type: 'number', step: '0.01' })),
    { label: 'BOQUILLAS EVALUADAS', type: 'number', step: '1' }, { label: 'PROMEDIO BOQUILLAS', type: 'number', step: '0.01', calculated: true },
    { label: 'VOLUMEN APLICACIÓN', type: 'number', step: '0.01' }, { label: 'VOLUMEN REAL', type: 'number', step: '0.01', calculated: true },
    { label: 'Descarga real (Lts/min)', type: 'number', step: '0.01', calculated: true },
    { label: '% VARIACION', type: 'number', step: '0.01', calculated: true },
    { label: 'ESTADO', type: 'select', options: ['DENTRO DE RANGO', 'FUERA DE RANGO, VOLVER A CALIBRAR'] }
  ]
};
const $ = (selector, root) => (root || document).querySelector(selector);
const $$ = (selector, root) => [...(root || document).querySelectorAll(selector)];
const state = { db: null, user: null, authSession: null, configured: false, syncConnected: false, syncBusy: false, refreshPromise: null, currentModule: null, recordTimeTimer: null, lotLookup: Object.create(null), zoneOptions: [], acceptingInvite: false };

async function loadLotLookup() {
  const scopeKey = [state.user.role, ...(state.user.allowedZones || []).slice().sort()].join(':');
  const cacheKey = LOT_LOOKUP_CACHE_KEY + state.user.id + ':' + encodeURIComponent(scopeKey);
  try {
    if (!navigator.onLine) throw new Error('Sin conexión: se usará la lista de lotes guardada para esta cuenta.');
    const lots = [];
    for (let offset = 0, page; ; offset += 1000) {
      page = await cloudRequest('field_lots?select=lot_code,zone,finca&order=lot_code.asc&limit=1000&offset=' + offset);
      lots.push(...page);
      if (page.length < 1000) break;
    }
    state.lotLookup = Object.create(null);
    for (const lot of lots) state.lotLookup[lot.lot_code] = { zona: lot.zone, finca: lot.finca };
    localStorage.setItem(cacheKey, JSON.stringify(state.lotLookup));
  } catch (error) {
    try {
      state.lotLookup = JSON.parse(localStorage.getItem(cacheKey) || '{}');
    } catch (cacheError) {
      state.lotLookup = Object.create(null);
      console.warn('No se pudo abrir la lista de lotes guardada para esta cuenta.', cacheError);
    }
    console.warn('No se pudo actualizar la lista de lotes autorizados; se usará la copia local si existe.', error);
  }
}

function localDate() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function localDateTime(value) {
  const d = value ? new Date(value) : new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function slug(value) {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'username' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function storeRequest(storeName, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, mode);
    const req = action(tx.objectStore(storeName));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error || new Error('La transacción local fue cancelada.'));
  });
}
const getRecords = () => storeRequest('records', 'readonly', store => store.getAll());
const getRecord = id => storeRequest('records', 'readonly', store => store.get(id));
const putRecord = record => storeRequest('records', 'readwrite', store => store.put(record));
function supabaseConfig() {
  const config = window.MYM_CONFIG || {};
  const url = String(config.supabaseUrl || '').trim().replace(/\/+$/, '');
  const anonKey = String(config.supabaseAnonKey || '').trim();
  if (!url || !anonKey) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('La URL de Supabase debe usar HTTPS (excepto en desarrollo local).');
  }
  return { url, anonKey };
}
async function apiRequest(path, options) {
  const config = supabaseConfig();
  if (!config) throw new Error('Falta configurar Supabase en config.js.');
  const headers = { apikey: config.anonKey, ...(options.headers || {}) };
  if (options.token) headers.Authorization = 'Bearer ' + options.token;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(config.url + path, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let result = null;
  if (text) {
    try { result = JSON.parse(text); }
    catch { throw new Error('Supabase devolvió una respuesta no válida.'); }
  }
  if (!response.ok) throw new Error(result && (result.msg || result.message || result.error_description || result.hint) || 'La solicitud al espacio compartido falló (' + response.status + ').');
  return result;
}
function saveAuthSession(session) {
  state.authSession = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function normalizeProfile(profile) {
  return { id: profile.id, email: profile.email, username: profile.username, displayName: profile.display_name, role: profile.role, status: profile.status, allowedZones: Array.isArray(profile.allowed_zones) ? profile.allowed_zones : [] };
}
function saveProfile(profile) {
  state.user = profile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
async function accessToken() {
  const session = state.authSession;
  if (!session) throw new Error('Inicia sesión para conectar con el espacio compartido.');
  if (session.expires_at * 1000 > Date.now() + 60000) return session.access_token;
  if (!navigator.onLine) return session.access_token;
  if (!session.refresh_token) throw new Error('La sesión venció. Inicia sesión de nuevo.');
  if (!state.refreshPromise) {
    state.refreshPromise = apiRequest('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: session.refresh_token }
    }).then(refreshed => {
      saveAuthSession({ ...refreshed, expires_at: refreshed.expires_at || Math.floor(Date.now() / 1000) + refreshed.expires_in });
      return refreshed.access_token;
    }).finally(() => { state.refreshPromise = null; });
  }
  return state.refreshPromise;
}
async function cloudRequest(path, options) {
  return apiRequest('/rest/v1/' + path, { ...options, token: await accessToken() });
}
async function fetchProfile(userId) {
  const rows = await cloudRequest('profiles?id=eq.' + encodeURIComponent(userId) + '&select=id,email,username,display_name,role,status,allowed_zones');
  if (!Array.isArray(rows) || !rows.length) throw new Error('No se encontró el perfil de esta cuenta en el espacio compartido.');
  return normalizeProfile(rows[0]);
}
function mapCloudRecord(row) {
  const profile = row.profiles || {};
  return {
    id: row.id, tipo: row.tipo, createdAt: row.created_at, schemaVersion: row.schema_version,
    syncStatus: 'synced', ownerId: row.owner_id, ownerUsername: profile.username || '',
    ownerName: profile.display_name || '', datos: row.datos, reviewStatus: row.review_status,
    reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, reviewNote: row.review_note
  };
}
async function syncCloudRecords(importLegacy) {
  if (!state.configured || !state.user) {
    if (importLegacy) throw new Error('Configura el espacio compartido e inicia sesión antes de importar.');
    return { uploaded: 0, downloaded: 0 };
  }
  if (!navigator.onLine) {
    if (importLegacy) throw new Error('Conéctate a internet antes de importar los registros.');
    return { uploaded: 0, downloaded: 0 };
  }
  if (state.syncBusy) {
    if (importLegacy) throw new Error('La sincronización ya está en curso. Intenta de nuevo en unos segundos.');
    return { uploaded: 0, downloaded: 0 };
  }
  state.syncBusy = true;
  try {
    const records = await getRecords();
    const outgoing = records.filter(record =>
      record.syncStatus === 'pending' &&
      record.ownerUsername === state.user.username &&
      (record.syncOrigin === 'new' || importLegacy)
    );
    for (const record of outgoing) {
      await cloudRequest('field_records?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: {
          id: record.id,
          owner_id: state.user.id,
          tipo: record.tipo,
          schema_version: record.schemaVersion || 1,
          datos: record.datos
        }
      });
      delete record.syncOrigin;
      record.syncStatus = 'synced';
      await putRecord(record);
    }

    const remote = [];
    for (let offset = 0, page; ; offset += 1000) {
      page = await cloudRequest(
        'field_records?select=id,owner_id,tipo,created_at,schema_version,datos,review_status,reviewed_by,reviewed_at,review_note,profiles!field_records_owner_id_fkey(username,display_name)&order=created_at.desc&limit=1000&offset=' + offset
      );
      remote.push(...page);
      if (page.length < 1000) break;
    }
    await Promise.all(remote.map(row => putRecord(mapCloudRecord(row))));
    state.syncConnected = true;
    updateConnection();
    await refreshLists();
    return { uploaded: outgoing.length, downloaded: remote.length };
  } finally {
    state.syncBusy = false;
  }
}
async function refreshCloudProfile() {
  const profile = await fetchProfile(state.authSession.user.id);
  saveProfile(profile);
  if (profile.status === 'active' && profile.role !== 'pending') {
    await startSession(profile, state.authSession);
  } else {
    state.user = profile;
    showAuthScreen('pending');
  }
}
function roleName(role) {
  return role === 'admin' ? 'Administrador' : role === 'supervisor' ? 'Supervisor' : role === 'aereo' ? 'Aplicaciones aéreas' : role === 'terrestre' ? 'Aplicaciones terrestres' : 'Pendiente';
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
function authMessage(id, message) {
  const node = $('#' + id);
  node.textContent = message;
  node.hidden = !message;
}
function isActiveAdmin() {
  return !!state.user && state.user.status === 'active' && state.user.role === 'admin';
}
function consumeInviteLink() {
  const fragment = new URLSearchParams(location.hash.slice(1));
  const accessToken = fragment.get('access_token');
  if (fragment.get('type') !== 'invite' || !accessToken) return false;
  const expiresIn = Number(fragment.get('expires_in')) || 3600;
  saveAuthSession({
    access_token: accessToken,
    refresh_token: fragment.get('refresh_token'),
    token_type: fragment.get('token_type') || 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + expiresIn
  });
  state.acceptingInvite = true;
  localStorage.setItem(INVITE_PENDING_KEY, 'true');
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}
function showAuthScreen(mode) {
  $('#app-shell').hidden = true;
  $('#auth-screen').hidden = false;
  $('#auth-login').hidden = mode !== 'login';
  $('#auth-signup').hidden = mode !== 'signup';
  $('#auth-invite').hidden = mode !== 'invite';
  $('#auth-pending').hidden = mode !== 'pending';
  $('#auth-config-warning').hidden = state.configured;
  authMessage('login-error', '');
  authMessage('signup-error', '');
  authMessage('invite-password-error', '');
  authMessage('pending-error', '');
  if (mode === 'pending' && state.user && state.user.status === 'suspended') {
    $('#auth-pending h1').textContent = 'Acceso suspendido';
    $('#auth-pending .subtitle').textContent = 'Contacta al administrador del espacio compartido para revisar tu acceso.';
  } else {
    $('#auth-pending h1').textContent = 'Cuenta pendiente';
    $('#auth-pending .subtitle').textContent = 'Un administrador debe asignarte un perfil. Cuando lo haga, vuelve a comprobar tu acceso.';
  }
}
function userCanOpenModule(key) {
  const module = modules[key];
  if (!state.user || !module) return false;
  const hasZoneScope = ['admin', 'aereo'].includes(state.user.role) || (state.user.allowedZones || []).length > 0;
  return hasZoneScope && (state.user.role === 'admin' || module.roles.includes(state.user.role));
}
function groupsForRole(role) {
  const groups = [];
  if (role === 'admin' || role === 'aereo') groups.push({ title: 'Aplicaciones aéreas', keys: Object.keys(modules).filter(key => modules[key].group === 'aereo' && userCanOpenModule(key)) });
  if (role === 'admin' || role === 'terrestre') groups.push({ title: 'Aplicaciones terrestres', keys: Object.keys(modules).filter(key => modules[key].group === 'terrestre' && userCanOpenModule(key)) });
  if (role === 'admin' || role === 'supervisor') groups.push({ title: 'Supervisión', keys: Object.keys(modules).filter(key => modules[key].group === 'supervision' && userCanOpenModule(key)) });
  groups.push({ title: 'Capturas compartidas', keys: Object.keys(modules).filter(key => modules[key].group === 'shared' && userCanOpenModule(key)) });
  return groups.filter(group => group.keys.length);
}
function moduleCard(key) {
  const module = modules[key];
  return '<button class="module-card" data-module="' + esc(key) + '" type="button"><span class="module-icon ' + esc(module.group === 'aereo' ? 'flights' : module.group === 'terrestre' ? 'calibration' : module.icon === '✳' ? 'safety' : 'weeds') + '">' + module.icon + '</span><span class="module-copy"><strong>' + esc(module.title) + '</strong><small>' + esc(module.subtitle) + '</small></span><span class="module-arrow">→</span></button>';
}
function renderGroups(container) {
  const groups = groupsForRole(state.user.role);
  container.innerHTML = groups.length
    ? groups.map(group => '<section class="module-group"><div class="section-heading"><div><p class="eyebrow">' + esc(group.title.toUpperCase()) + '</p><h2>' + esc(group.title) + '</h2></div></div><div class="module-grid">' + group.keys.map(moduleCard).join('') + '</div></section>').join('')
    : 'No tienes zonas asignadas. Contacta a un administrador para solicitar acceso.';
}
function fieldMarkup(field, prefix, includeName) {
  const id = prefix + '-' + slug(field.label);
  const name = includeName ? ' name="' + esc(field.name || field.key || slug(field.label).replace(/-/g, '_')) + '"' : '';
  const childField = includeName ? '' : ' data-child-field="' + esc(field.key || field.label) + '"';
  const lotLookup = field.lotLookup ? ' data-lot-lookup="true"' : '';
  const locationTarget = field.locationTarget ? ' data-location-target="' + esc(field.locationTarget) + '"' : '';
  const farmSelector = field.farmSelector ? ' data-farm-selector="true"' : '';
  const farmZoneTarget = field.farmZoneTarget ? ' data-farm-zone-target="true"' : '';
  const fieldAttributes = name + childField + lotLookup + locationTarget + farmSelector + farmZoneTarget;
  const required = field.required ? ' required' : '';
  const step = field.step ? ' step="' + esc(field.step) + '"' : '';
  const min = field.min != null ? ' min="' + esc(field.min) + '"' : '';
  const max = field.max != null ? ' max="' + esc(field.max) + '"' : '';
  const accept = field.accept ? ' accept="' + esc(field.accept) + '"' : '';
  const readonly = field.readonly ? ' readonly' : '';
  let control = '';
  if (field.type === 'select') {
    control = '<select id="' + esc(id) + '"' + fieldAttributes + ' class="select-input"' + required + '><option value="">Selecciona</option>' + (field.options || []).map(option => '<option value="' + esc(option.value == null ? option : option.value) + '">' + esc(option.label == null ? option : option.label) + '</option>').join('') + '</select>';
  } else if (field.type === 'textarea') {
    control = '<textarea id="' + esc(id) + '"' + fieldAttributes + ' class="text-area"' + required + '></textarea>';
  } else {
    const type = field.type || 'text';
    const inputMode = field.lotLookup ? ' inputmode="numeric"' : type === 'number' ? ' inputmode="decimal"' : '';
    const value = field.value != null ? ' value="' + esc(field.value) + '"' : '';
    const placeholder = field.calculated ? ' placeholder="Resultado de la hoja; fórmula pendiente de confirmar"' : field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '';
    control = '<input id="' + esc(id) + '" type="' + esc(type) + '"' + fieldAttributes + ' class="text-input"' + required + step + min + max + accept + inputMode + value + placeholder + readonly + '>';
  }
  const hint = field.calculated ? '<div class="field-hint">Campo calculado en AppSheet; queda capturable hasta validar su fórmula.</div>' : field.hint ? '<div class="field-hint">' + esc(field.hint) + '</div>' : '';
  return '<div class="field' + (field.full ? ' full' : '') + '"><label class="field-label" for="' + esc(id) + '">' + esc(field.label) + (field.required ? ' *' : '') + '</label>' + control + hint + '</div>';
}
function commonFields(withLotLookup) {
  const lotLookup = !!withLotLookup;
  const farmOptions = [...new Set(Object.values(state.lotLookup).map(location => location.finca).filter(Boolean))].sort();
  return '<section class="form-section"><h2>Datos de la actividad</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Fecha', name: 'fecha', type: 'date', value: localDate(), required: true }, 'f-date', true) +
    fieldMarkup({ label: 'Responsable', name: 'responsable', value: state.user.displayName, required: true }, 'f-user', true) +
    (!lotLookup ? fieldMarkup({ label: 'Lote', name: 'lote', lotLookup: true, required: true, hint: 'Ingresa el lote para completar finca y zona.' }, 'f-lot', true) : '') +
    fieldMarkup({ label: 'Zona', name: 'zona', placeholder: 'Se completa al ingresar un lote', locationTarget: 'zona', farmZoneTarget: true }, 'f-zone', true) +
    fieldMarkup({ label: 'Finca', name: 'finca', type: lotLookup ? 'text' : 'select', required: true, placeholder: lotLookup ? 'Se completa al ingresar un lote' : undefined, locationTarget: 'finca', farmSelector: true, options: lotLookup ? undefined : farmOptions }, 'f-farm', true) +
    '<div class="field full"><div class="field-hint" data-lot-location-status role="status">Ingresa un lote para completar finca y zona.</div></div>' +
    '<div class="field full"><div class="field-hint" data-farm-zone-status role="status"></div></div>' +
    '<div class="field"><label class="field-label" for="f-recorded-at">Hora de registro (automática)</label><input id="f-recorded-at" name="hora_registro" class="text-input" type="datetime-local" value="' + localDateTime() + '" readonly><div class="field-hint">Se fija al guardar la captura.</div></div>' +
    '</div></section>';
}

function clearAutoLocation(targets) {
  for (const target of Object.values(targets)) {
    if (!target) continue;
    if (target.dataset.autofilledValue !== undefined && target.value === target.dataset.autofilledValue) target.value = '';
    delete target.dataset.autofilledValue;
  }
}

function updateLotLocations(form) {
  if (!form) return;
  const targets = {
    finca: form.querySelector('[data-location-target="finca"]'),
    zona: form.querySelector('[data-location-target="zona"]')
  };
  const status = form.querySelector('[data-lot-location-status]');
  if (!targets.finca || !targets.zona || !status) return;
  const lots = [...form.querySelectorAll('[data-lot-lookup]')]
    .map(input => String(input.value || '').trim())
    .filter(Boolean);
  if (!lots.length) {
    clearAutoLocation(targets);
    status.textContent = 'Ingresa un lote para completar finca y zona.';
    return;
  }
  const matches = lots.map(lot => ({ lot, location: state.lotLookup[lot] || null }));
  const missing = matches.find(match => !match.location);
  if (missing) {
    clearAutoLocation(targets);
    status.textContent = 'El lote ' + missing.lot + ' no está disponible para esta cuenta; verifica el código y la zona asignada.';
    return;
  }
  const locations = new Map(matches.map(match => [match.location.zona + '|' + match.location.finca, match.location]));
  if (locations.size !== 1) {
    clearAutoLocation(targets);
    status.textContent = 'Los lotes ingresados corresponden a varias fincas o zonas; no se completó una ubicación única.';
    return;
  }
  const location = locations.values().next().value;
  targets.finca.value = location.finca;
  targets.zona.value = location.zona;
  targets.finca.dataset.autofilledValue = location.finca;
  targets.zona.dataset.autofilledValue = location.zona;
  status.textContent = 'Ubicación encontrada: finca ' + location.finca + ' · zona ' + location.zona + '.';
}

function updateZoneFromFarm(form) {
  const finca = form.querySelector('[data-farm-selector]');
  const zona = form.querySelector('[data-farm-zone-target]');
  const status = form.querySelector('[data-farm-zone-status]');
  if (!finca || !zona || !status) return;
  if (zona.dataset.autofilledValue !== undefined && zona.value === zona.dataset.autofilledValue) zona.value = '';
  delete zona.dataset.autofilledValue;
  const farmName = String(finca.value || '').trim();
  if (!farmName) {
    status.textContent = '';
    return;
  }
  const zones = [...new Set(Object.values(state.lotLookup)
    .filter(location => location.finca === farmName)
    .map(location => String(location.zona)))].sort();
  if (zones.length === 1) {
    zona.value = zones[0];
    zona.dataset.autofilledValue = zones[0];
    status.textContent = 'Zona ' + zones[0] + ' completada según la finca.';
  } else if (zones.length > 1) {
    status.textContent = 'La finca ' + farmName + ' tiene varias zonas (' + zones.join(', ') + '); ingresa la zona correcta.';
  } else {
    status.textContent = 'No se encontró una zona para esta finca en el catálogo de lotes.';
  }
}
function climateFields() {
  return commonFields(true) + '<section class="form-section"><h2>Datos del lote</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Lote', name: 'lote', lotLookup: true, required: true }, 'climate-lot', true) +
    '</div></section><section class="form-section"><h2>Ubicación</h2><div class="field-grid"><div class="field full"><label class="field-label" for="f-location">Coordenadas GPS (automáticas)</label><input id="f-location" name="ubicacion" class="text-input" placeholder="Solicitando ubicación…" readonly><input id="f-location-lat" name="latitud" type="hidden"><input id="f-location-lon" name="longitud" type="hidden"><input id="f-location-accuracy" name="precision_gps_m" type="hidden"><div class="location-controls"><span id="location-status" class="field-hint" role="status">Solicitando ubicación del dispositivo…</span><button id="retry-location" class="add-row" type="button">Actualizar ubicación</button></div></div></div></section>' +
    '<section class="form-section"><h2>Lecturas de clima</h2><p class="field-hint">Añade una fila por medición. Unidades: °C, %, km/h y °C para Delta T.</p><div id="weather-rows"></div><div class="inline-actions"><button id="add-weather" class="add-row" type="button">＋ Agregar lectura</button></div></section>';
}
function weedsFields() {
  return '<section class="form-section"><h2>Visita de malezas</h2><p class="field-hint">Campos de la tabla Visita Malezas. El ID se genera al guardar la captura.</p><div class="field-grid">' +
    fieldMarkup({ label: 'FECHA', name: 'FECHA', type: 'date', value: localDate(), required: true }, 'weeds-date', true) +
    fieldMarkup({ label: 'UBICACIÓN', name: 'UBICACIÓN', placeholder: 'Latitud, longitud', hint: 'La hoja de origen guarda las coordenadas en este campo.' }, 'weeds-location', true) +
    fieldMarkup({ label: 'RESPONSABLE', name: 'RESPONSABLE', value: state.user.displayName }, 'weeds-owner', true) +
    fieldMarkup({ label: 'ZONA', name: 'ZONA', locationTarget: 'zona' }, 'weeds-zone', true) +
    fieldMarkup({ label: 'FINCA', name: 'FINCA', locationTarget: 'finca' }, 'weeds-farm', true) +
    '<div class="field full"><div class="field-hint" data-lot-location-status role="status">Ingresa un lote para completar finca y zona.</div></div></div></section><section class="form-section"><h2>Datos Malezas por lote</h2><p class="field-hint">Puedes agregar un detalle por cada lote visitado. Los registros quedan vinculados a esta visita en la captura local.</p>' +
    repeatSection('malezas_detalle', 'Detalle de malezas', 'Agregar lote', 'Incluye lote, labor, porcentajes de control y cobertura, imagen, catorcena y observaciones.') + '</section>';
}
function eppFields() {
  return commonFields() + '<section class="form-section"><h2>Labor y asistencia</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Tipo de labor', name: 'labor', type: 'select', required: true, options: ['Madurante', 'Premadurante', 'Bioestimulante'] }, 'f-labor', true) +
    fieldMarkup({ label: 'Personas que llegaron a esta labor', name: 'personas_llegaron', type: 'number', min: '0', step: '1', value: '0', readonly: true, hint: 'Se calcula sumando las personas que asistieron por función.' }, 'f-arrived-count', true) +
    '</div></section><section class="form-section"><h2>Personas que asistieron por función</h2><p class="field-hint">Ingresa las personas por función; el total de la sección anterior se actualizará automáticamente.</p><div class="field-grid">' +
    eppFunctions.map((role, i) => '<div class="field"><label class="field-label" for="attended-' + i + '">' + esc(role.label) + '</label><input id="attended-' + i + '" class="text-input attendance-count" type="number" min="0" step="1" data-function="' + esc(role.key) + '" value="0" inputmode="numeric"></div>').join('') +
    '<div class="field full"><div class="calc-readout">Asistencia total por función <strong id="attendance-total-output">0 personas</strong></div></div></div></section><section class="form-section"><h2>Personas que cumplen con todo el EPP por función</h2><p class="field-hint">Estimación automática con base en el menor conteo de cumplimiento entre los elementos requeridos. Puede no representar a las mismas personas.</p><div class="field-grid">' +
    eppFunctions.map((role, i) => '<div class="field"><label class="field-label" for="fully-equipped-' + i + '">' + esc(role.label) + '</label><input id="fully-equipped-' + i + '" class="text-input fully-equipped-count" type="number" min="0" max="0" step="1" data-function="' + esc(role.key) + '" value="0" readonly><small class="field-hint">Estimación de quienes cumplen con todo</small></div>').join('') +
    '<div class="field full"><div class="calc-readout">Cumplimiento general <strong id="epp-general-output">0% (0 de 0 personas)</strong></div></div></div></section><section class="form-section"><h2>Cumplimiento por persona y elemento de EPP</h2><p class="field-hint">Ingresa manualmente cuántas personas de cada función cumplen con cada elemento. El total no puede superar la asistencia de esa función.</p>' +
    eppFunctions.map((role, roleIndex) => '<section class="epp-role-card"><h3>' + esc(role.label) + '</h3><div class="epp-item-grid">' + role.items.map((item, itemIndex) => {
      const inputId = 'epp-' + roleIndex + '-' + itemIndex;
      return '<div class="field"><label class="field-label" for="' + inputId + '">' + esc(item) + '</label><input id="' + inputId + '" class="text-input epp-item-count" type="number" min="0" max="0" step="1" data-function="' + esc(role.key) + '" data-item="' + esc(item) + '" value="0" inputmode="numeric" required><small class="field-hint">Cantidad de personas que cumplen</small></div>';
    }).join('') + '</div></section>').join('') + '</section>';
}
function flightFields() {
  return commonFields() + '<section class="form-section"><h2>Datos del vuelo</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Labor', name: 'labor', type: 'select', required: true, options: ['Madurante', 'Premadurante', 'Bioestimulante', 'Control de malezas'] }, 'f-labor', true) +
    fieldMarkup({ label: 'Dron', name: 'dron', placeholder: 'Identificador del dron' }, 'f-drone', true) +
    fieldMarkup({ label: 'Área aplicada (ha)', name: 'area_ha', type: 'number', min: '0.01', step: '0.01', required: true }, 'f-area', true) +
    fieldMarkup({ label: 'Litros aplicados (L)', name: 'litros', type: 'number', min: '0', step: '0.1', required: true }, 'f-liters', true) +
    '<div class="field full"><div class="calc-readout">Aplicación calculada <strong id="rate-output">— L/ha</strong></div></div>' +
    fieldMarkup({ label: 'Observaciones', name: 'observaciones', type: 'textarea' }, 'f-notes', true) + '</div></section>';
}
function qualityFields() {
  return '<section class="form-section"><h2>Supervisión de calidad</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Formulario', name: 'calidad_tipo', type: 'select', required: true, options: Object.entries(qualityForms).map(([value, form]) => ({ value, label: form.label })) }, 'quality-type', true) +
    '</div><div id="quality-details"><p class="field-hint">Selecciona F.C. Aguilón, F.C. Arranque o F.C. PC y PM para abrir sus campos originales.</p></div></section>';
}
function repeatSection(key, title, addLabel, note) {
  return '<section class="nested-section"><div class="nested-heading"><div><h3>' + esc(title) + '</h3><p class="field-hint">' + esc(note || 'Añade una fila por medición relacionada.') + '</p></div></div><div class="child-list" data-repeat-list="' + esc(key) + '"></div><button class="add-row" type="button" data-add-child="' + esc(key) + '">＋ ' + esc(addLabel || 'Agregar detalle') + '</button></section>';
}
function variacionAguilonFields() {
  return commonFields(true) + '<section class="form-section"><h2>Datos de Variación Aguilón</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Lote', name: 'lote', lotLookup: true }, 'var-lote', true) +
    fieldMarkup({ label: 'ID_CAPORAL', name: 'id_caporal' }, 'var-caporal', true) +
    fieldMarkup({ label: 'LABOR', name: 'labor' }, 'var-labor', true) +
    fieldMarkup({ label: 'ID TRACTORISTA', name: 'id_tractorista' }, 'var-tractorista', true) +
    fieldMarkup({ label: 'ID AGUILÓN', name: 'id_aguilon' }, 'var-aguilon', true) +
    fieldMarkup({ label: 'ID TRACTOR', name: 'id_tractor' }, 'var-tractor', true) +
    '</div></section><section class="form-section"><h2>Variación por aguilonada</h2>' +
    repeatSection('var_aguilonada', 'Var Aguilonada', 'Agregar aguilonada', 'Incluye carga, área, variación y observaciones. Los resultados marcados se capturan según la hoja hasta confirmar su fórmula.') +
    '</section><section class="form-section"><h2>Variación de mezcla</h2>' +
    repeatSection('var_mezcla', 'Var Mezcla', 'Agregar mezcla', 'Registra hasta cinco lotes por detalle. Los resultados calculados quedan capturables mientras se validan las fórmulas.') + '</section>';
}
function calibracionAguilonFields() {
  return commonFields(true) + '<section class="form-section"><h2>Datos de Calibraciones Aguilón</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Lote', name: 'lote', lotLookup: true }, 'ag-lote', true) +
    fieldMarkup({ label: 'DISTANCIAMIENTO SURCO', name: 'distanciamiento_surco', type: 'number', step: '0.01' }, 'ag-surco', true) +
    fieldMarkup({ label: 'LABOR', name: 'labor' }, 'ag-labor', true) +
    fieldMarkup({ label: 'Tipo de descarga', name: 'tipo_descarga' }, 'ag-descarga', true) +
    fieldMarkup({ label: 'Caporal', name: 'caporal' }, 'ag-caporal', true) +
    fieldMarkup({ label: 'Tractorista', name: 'tractorista' }, 'ag-tractorista', true) +
    fieldMarkup({ label: 'VOLUMEN ASPERJADORA', name: 'volumen_asperjadora', type: 'number', step: '0.01' }, 'ag-volumen', true) +
    fieldMarkup({ label: 'RPM', name: 'rpm', type: 'number', step: '1' }, 'ag-rpm', true) +
    fieldMarkup({ label: 'MARCHA', name: 'marcha' }, 'ag-marcha', true) +
    fieldMarkup({ label: 'TIPO BOQUILLA', name: 'tipo_boquilla' }, 'ag-boquilla', true) +
    fieldMarkup({ label: 'Tipo Aguilón', name: 'tipo_aguilon', type: 'select', required: true, options: ['Electroelectronico', 'Polea'] }, 'ag-tipo-aguilon', true) +
    '</div></section><div id="aguilon-details"></div>';
}
function pcpmFields() {
  return commonFields(true) + '<section class="form-section"><h2>Datos de Calibración PC y PM</h2><div class="field-grid">' +
    fieldMarkup({ label: 'CODIGO RESPONSABLE', name: 'codigo_responsable', required: true }, 'pcpm-codigo-responsable', true) +
    fieldMarkup({ label: 'NOMBRE DEL RESPONSABLE', name: 'nombre_responsable', required: true, value: state.user.displayName }, 'pcpm-nombre-responsable', true) +
    fieldMarkup({ label: 'CATORCENA', name: 'catorcena', type: 'number', value: String(Math.ceil((new Date().getDate() + 2) / 15)) }, 'pcpm-catorcena', true) +
    fieldMarkup({ label: 'ID_Lote', name: 'id_lote', required: true, lotLookup: true }, 'pcpm-lote', true) +
    fieldMarkup({ label: 'CODIGO DEL TANQUE', name: 'codigo_tanque' }, 'pcpm-tanque', true) +
    fieldMarkup({ label: 'TIPO DE BOQUILLA', name: 'tipo_boquilla' }, 'pcpm-boquilla', true) +
    fieldMarkup({ label: 'LABOR DE APLICACIÓN', name: 'labor_aplicacion' }, 'pcpm-labor-aplicacion', true) +
    fieldMarkup({ label: 'LABOR', name: 'labor_pcpm', type: 'select', required: true, options: ['PRESIÓN MANUAL', 'PRESIÓN CONSTANTE', 'FOQUEO', 'RONDEO'] }, 'pcpm-labor', true) +
    '</div><div id="pcpm-details"><p class="field-hint">Selecciona la labor para mostrar sus subapartados.</p></div></section>';
}
const renderers = {
  clima: climateFields, malezas: weedsFields, epp: eppFields, vuelos: flightFields, calidad: qualityFields,
  variacion_aguilon: variacionAguilonFields, calibracion_aguilon: calibracionAguilonFields, calibraciones_pcpm: pcpmFields
};
function childRowMarkup(key, index) {
  const fields = childSchemas[key] || [];
  const controls = fields.map(field => fieldMarkup(field, 'child-' + slug(key) + '-' + index, false)).join('');
  return '<div class="child-row"><div class="field-grid">' + controls + '</div><button type="button" class="remove-row" data-remove-child aria-label="Quitar detalle">Quitar detalle</button></div>';
}
function addChildRow(key) {
  const list = $('[data-repeat-list="' + key + '"]', $('#form-fields'));
  if (!list) return;
  list.insertAdjacentHTML('beforeend', childRowMarkup(key, list.children.length));
}
function renderQualityDetails(type) {
  const target = $('#quality-details');
  const form = qualityForms[type];
  if (!target) return;
  if (!form) { target.innerHTML = '<p class="field-hint">Selecciona el formulario de calidad para mostrar sus campos.</p>'; return; }
  target.innerHTML = '<section class="nested-section"><div class="nested-heading"><div><h3>' + esc(form.label) + '</h3><p class="field-hint">Campos copiados de la hoja correspondiente. El ID se genera al guardar.</p></div></div><div class="field-grid">' +
    form.fields.map((field, index) => fieldMarkup(field.key === 'FECHA' ? { ...field, value: localDate() } : field, 'quality-' + type + '-' + index, true)).join('') + '</div></section>';
}
function renderPcpmDetails(labor) {
  const target = $('#pcpm-details');
  if (!target) return;
  if (labor === 'PRESIÓN MANUAL') {
    target.innerHTML = '<h3>Calibración PM</h3><p class="field-hint">Subformulario de presión manual. Puedes agregar un detalle por aplicador o equipo.</p>' + repeatSection('calibracion_pm', 'Detalle PM', 'Agregar detalle PM', 'Incluye presiones de aire, mezcla y salida de boquilla, recorrido, medidas, descarga y variación.') ;
  } else if (labor === 'PRESIÓN CONSTANTE') {
    target.innerHTML = '<h3>Calibración PC</h3><p class="field-hint">Subformulario de presión constante. Puedes agregar un detalle por aplicador o equipo.</p>' + repeatSection('calibracion_pc', 'Detalle PC', 'Agregar detalle PC', 'Incluye presiones de aire, mezcla y salida de boquilla, recorrido, medidas, descarga y variación.');
  } else if (labor === 'FOQUEO') {
    target.innerHTML = '<h3>Subapartados de Foqueo</h3>' + repeatSection('foqueo_persona', 'Foqueo calibración por persona', 'Agregar calibración por persona', 'Datos del aplicador, velocidad, mezcla y descarga real.') + repeatSection('foqueo_volumen', 'Foqueo calibración de volumen', 'Agregar calibración de volumen', 'Volumen teórico, ancho, descarga, velocidad y volumen medido.');
  } else if (labor === 'RONDEO') {
    target.innerHTML = '<h3>Rondeo</h3><p class="field-hint">En el formulario revisado de AppSheet no apareció un subformulario adicional para Rondeo.</p>';
  } else {
    target.innerHTML = '<p class="field-hint">Selecciona la labor para mostrar sus subapartados.</p>';
  }
}
function renderAguilonDetails(type) {
  const target = $('#aguilon-details');
  if (!target) return;
  if (type === 'Electroelectronico') {
    target.innerHTML = '<section class="form-section"><h2>Ingrese calibración aguilón Electroelectronico</h2>' + repeatSection('aguilon_electro', 'Detalle electrónico', 'Agregar calibración electrónica', 'Incluye tiempos, pantalla, presiones por sección y lecturas B1 a B30. Los cálculos se conservan como campos pendientes de fórmula confirmada.') + '</section>';
  } else if (type === 'Polea') {
    target.innerHTML = '<section class="form-section"><h2>Ingrese calibración aguilón de Polea</h2>' + repeatSection('aguilon_polea', 'Detalle de polea', 'Agregar calibración de polea', 'Incluye cuatro recorridos, datos de presión, boquillas, volumen y estado.') + '</section>';
  } else {
    target.innerHTML = '';
  }
}
function rowMarkup(kind, index) {
  if (kind !== 'weather') return '';
  const hours = new Date().toTimeString().slice(0, 5);
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO', 'Calma'];
  return '<div class="repeat-row" data-row="' + index + '">' +
    '<div class="field"><label class="field-label">Hora</label><input class="small-input" name="hora" type="time" value="' + hours + '"></div>' +
    '<div class="field"><label class="field-label">Temperatura (°C)</label><input class="small-input" name="temperatura" type="number" step="0.1" inputmode="decimal"></div>' +
    '<div class="field"><label class="field-label">Humedad (%)</label><input class="small-input" name="humedad" type="number" min="0" max="100" step="0.1" inputmode="decimal"></div>' +
    '<div class="field"><label class="field-label">Viento (km/h)</label><input class="small-input" name="viento" type="number" min="0" step="0.1" inputmode="decimal"></div>' +
    '<div class="field"><label class="field-label">Dirección</label><select class="small-input" name="direccion"><option value="">—</option>' + directions.map(value => '<option>' + value + '</option>').join('') + '</select></div>' +
    '<div class="field"><label class="field-label">Delta T (°C)</label><input class="small-input" name="delta_t" type="number" step="0.1" inputmode="decimal"></div>' +
    '<button type="button" class="remove-row" aria-label="Quitar lectura">Quitar</button></div>';
}
function chooseModule(key) {
  const module = modules[key];
  if (!module || !userCanOpenModule(key)) { toast('Este apartado no está disponible para tu perfil.'); return; }
  state.currentModule = key;
  $('#form-title').textContent = module.title;
  $('#form-subtitle').textContent = module.subtitle;
  $('#module-picker').hidden = true;
  $('#capture-form').hidden = false;
  $('#form-fields').innerHTML = renderers[key]();
  if (state.recordTimeTimer) clearInterval(state.recordTimeTimer);
  state.recordTimeTimer = setInterval(() => {
    const input = $('#f-recorded-at');
    if (input) input.value = localDateTime();
  }, 15000);
  if (key === 'clima') {
    let index = 0;
    const add = () => $('#weather-rows').insertAdjacentHTML('beforeend', rowMarkup('weather', index++));
    add();
    $('#add-weather').addEventListener('click', add);
    $('#weather-rows').addEventListener('click', event => { if (event.target.matches('.remove-row')) event.target.closest('.repeat-row').remove(); });
    $('#retry-location').addEventListener('click', captureLocation);
    captureLocation();
  }
  if (key === 'epp') {
    const updateEppSummary = () => {
      const attendance = $$('.attendance-count', $('#form-fields'));
      const attendanceByFunction = Object.fromEntries(attendance.map(input => [input.dataset.function, Number(input.value) || 0]));
      $('#form-fields [name="personas_llegaron"]').value = String(Object.values(attendanceByFunction).reduce((sum, count) => sum + count, 0));
      $$('.epp-item-count, .fully-equipped-count', $('#form-fields')).forEach(input => {
        const max = attendanceByFunction[input.dataset.function] || 0;
        input.max = String(max);
        input.setCustomValidity(Number(input.value) > max ? 'No puede superar la asistencia registrada para esta función.' : '');
      });
      $$('.fully-equipped-count', $('#form-fields')).forEach(input => {
        const role = eppFunctions.find(item => item.key === input.dataset.function);
        const itemCounts = role ? role.items.map(item => {
          const itemInput = $$('.epp-item-count', $('#form-fields')).find(candidate =>
            candidate.dataset.function === role.key && candidate.dataset.item === item
          );
          return Number(itemInput && itemInput.value) || 0;
        }) : [];
        input.value = String(itemCounts.length ? Math.min(...itemCounts, attendanceByFunction[input.dataset.function] || 0) : 0);
      });
      $$('.fully-equipped-count', $('#form-fields')).forEach(input => {
        input.setCustomValidity(Number(input.value) > (attendanceByFunction[input.dataset.function] || 0)
          ? 'No puede superar la asistencia registrada para esta función.'
          : '');
      });
      const attended = Object.values(attendanceByFunction).reduce((sum, count) => sum + count, 0);
      const fullyEquipped = $$('.fully-equipped-count', $('#form-fields')).reduce((sum, input) => sum + (Number(input.value) || 0), 0);
      const percent = attended > 0 ? (fullyEquipped / attended) * 100 : 0;
      $('#attendance-total-output').textContent = attended + (attended === 1 ? ' persona' : ' personas');
      $('#epp-general-output').textContent = percent.toFixed(1) + '% (' + fullyEquipped + ' de ' + attended + ' personas)';
    };
    $('#form-fields').addEventListener('input', event => {
      if (event.target.matches('.attendance-count, .fully-equipped-count, .epp-item-count')) updateEppSummary();
    });
    updateEppSummary();
  }
  if (key === 'vuelos') {
    const updateRate = () => {
      const area = Number($('#f-area').value), liters = Number($('#f-liters').value);
      $('#rate-output').textContent = area > 0 && Number.isFinite(liters) ? (liters / area).toFixed(2) + ' L/ha' : '— L/ha';
    };
    $('#f-area').addEventListener('input', updateRate);
    $('#f-liters').addEventListener('input', updateRate);
  }
  if (key === 'calibraciones_pcpm') $('#pcpm-labor').addEventListener('change', event => renderPcpmDetails(event.target.value));
  if (key === 'calibracion_aguilon') $('#ag-tipo-aguilon').addEventListener('change', event => renderAguilonDetails(event.target.value));
  $$('.picker-groups [data-module]').forEach(button => button.classList.toggle('selected', button.dataset.module === key));
  $('#capture-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function serializeForm(form, recordId) {
  const attachment = file => new Promise((resolve, reject) => {
    if (!file || !file.name) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, mimeType: file.type, size: file.size, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
  const data = {};
  for (const [key, value] of new FormData(form).entries()) {
    data[key] = typeof File !== 'undefined' && value instanceof File ? await attachment(value) : value;
  }
  if (state.currentModule === 'clima') data.lecturas = $$('.repeat-row', $('#weather-rows')).map(row => Object.fromEntries(new FormData(row).entries()));
  if (state.currentModule === 'epp') {
    const attendance = $$('.attendance-count', $('#form-fields'));
    data.asistencia_por_funcion = Object.fromEntries(attendance.map(input => [input.dataset.function, Number(input.value) || 0]));
    data.asistencia_general = Object.values(data.asistencia_por_funcion).reduce((sum, count) => sum + count, 0);
    data.personas_completamente_equipadas_por_funcion = Object.fromEntries($$('.fully-equipped-count', $('#form-fields')).map(input => [input.dataset.function, Number(input.value) || 0]));
    data.personas_completamente_equipadas = Object.values(data.personas_completamente_equipadas_por_funcion).reduce((sum, count) => sum + count, 0);
    data.cumplimiento_epp_general_pct = data.asistencia_general > 0 ? (data.personas_completamente_equipadas / data.asistencia_general) * 100 : null;
    data.cumplimiento_epp_por_funcion = Object.fromEntries(eppFunctions.map(role => [role.key, Object.fromEntries($$('.epp-item-count', $('#form-fields')).filter(input => input.dataset.function === role.key).map(input => [input.dataset.item, Number(input.value) || 0]))]));
    data.personas_llegaron = Number(data.personas_llegaron) || 0;
  }
  if (state.currentModule === 'vuelos') data.litros_por_hectarea = Number(data.area_ha) > 0 ? Number(data.litros) / Number(data.area_ha) : null;
  const subregistros = {};
  for (const list of $$('[data-repeat-list]', $('#form-fields'))) {
    const key = list.dataset.repeatList;
    subregistros[key] = await Promise.all($$('.child-row', list).map(async row => Object.fromEntries(await Promise.all($$('[data-child-field]', row).map(async input => [
      input.dataset.childField, input.type === 'file' ? await attachment(input.files && input.files[0]) : input.value
    ])))));
  }
  if (state.currentModule === 'malezas') {
    data.ID = recordId;
    (subregistros.malezas_detalle || []).forEach(detail => {
      detail.ID = crypto.randomUUID();
      detail.ID_NEW = recordId;
    });
  }
  if (state.currentModule === 'calidad') data.ID = recordId;
  if (Object.keys(subregistros).length) data.subregistros = subregistros;
  return data;
}
function titleFor(record) {
  if (record.tipo === 'clima') return (record.datos.lecturas || []).length + ' lecturas de clima';
  if (record.tipo === 'malezas') return 'Visita de malezas';
  if (record.tipo === 'epp') return 'Conteo EPP · ' + (record.datos.labor || 'Labor');
  if (record.tipo === 'vuelos') return 'Aplicación · ' + (record.datos.litros_por_hectarea ? record.datos.litros_por_hectarea.toFixed(2) + ' L/ha' : 'vuelo');
  if (record.tipo === 'calidad') return (qualityForms[record.datos.calidad_tipo] || {}).label || 'Supervisión de calidad';
  if (record.tipo === 'calibraciones_pcpm') return 'Calibración · ' + (record.datos.labor_pcpm || 'PC / PM');
  if (record.tipo === 'calibracion_aguilon') return 'Calibraciones Aguilón · ' + (record.datos.tipo_aguilon || '');
  if (record.tipo === 'variacion_aguilon') return 'Variación Aguilón';
  return record.tipo;
}
function formatDate(date) {
  return date ? new Date(date + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';
}
function recordRow(record) {
  const module = modules[record.tipo] || { icon: '•' };
  const site = record.datos.finca || record.datos.lote || record.datos.id_lote || 'Sin finca/lote';
  const detail = [site, record.ownerName, formatDate(record.datos.fecha || record.datos.FECHA)].filter(Boolean).join(' · ');
  const reviewer = state.user && ['admin', 'supervisor'].includes(state.user.role);
  const status = record.syncStatus !== 'synced' ? 'En cola' : record.reviewStatus === 'approved' ? 'Aprobado' : record.reviewStatus === 'rejected' ? 'Rechazado' : 'Pendiente de revisión';
  const actions = reviewer && record.ownerId && record.ownerId !== state.user.id && record.reviewStatus === 'pending'
    ? '<span class="record-review-actions"><button type="button" data-review="approved" data-record-id="' + esc(record.id) + '">Aprobar</button><button type="button" data-review="rejected" data-record-id="' + esc(record.id) + '">Rechazar</button></span>'
    : '';
  return '<article class="record-row"><span class="record-symbol" aria-hidden="true">' + module.icon + '</span><span class="record-info"><strong>' + esc(titleFor(record)) + '</strong><small>' + esc(detail) + '</small></span><span class="record-status">' + esc(status) + '</span>' + actions + '</article>';
}
function emptyState(message) { return '<div class="empty-state">' + esc(message) + '</div>'; }
async function refreshLists() {
  if (!state.db || !state.user) return;
  let records = (await getRecords()).filter(recordHasLotAccess).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!['admin', 'supervisor'].includes(state.user.role)) records = records.filter(record => record.ownerUsername === state.user.username);
  const pending = records.filter(record => record.syncStatus === 'pending');
  $('#pending-badge').textContent = pending.length;
  $('#record-total').textContent = records.length + (records.length === 1 ? ' registro' : ' registros');
  $('#recent-list').innerHTML = records.slice(0, 4).map(recordRow).join('') || emptyState('Todavía no hay capturas de esta cuenta en el dispositivo.');
  $('#pending-list').innerHTML = pending.map(recordRow).join('') || emptyState('No hay capturas pendientes.');
  const query = ($('#record-search').value || '').trim().toLocaleLowerCase('es');
  const filtered = records.filter(record => !query || JSON.stringify(record).toLocaleLowerCase('es').includes(query));
  $('#all-records').innerHTML = filtered.map(recordRow).join('') || emptyState(records.length ? 'No hay coincidencias.' : 'Todavía no hay capturas de esta cuenta en el dispositivo.');
}
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('visible'), 3200);
}
function captureLocation() {
  const input = $('#f-location');
  if (!input) return;
  const status = $('#location-status'), button = $('#retry-location');
  if (!navigator.geolocation) { status.textContent = 'Este navegador no permite obtener la ubicación automática.'; return; }
  button.disabled = true;
  status.textContent = 'Buscando GPS; permite el acceso si el navegador lo solicita…';
  navigator.geolocation.getCurrentPosition(position => {
    if (!input.isConnected) return;
    const coords = position.coords;
    input.value = coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6);
    $('#f-location-lat').value = coords.latitude;
    $('#f-location-lon').value = coords.longitude;
    $('#f-location-accuracy').value = Math.round(coords.accuracy);
    status.textContent = 'Ubicación capturada; precisión aproximada: ' + Math.round(coords.accuracy) + ' m.';
    button.disabled = false;
  }, error => {
    if (!input.isConnected) return;
    status.textContent = error.code === 1 ? 'Permite la ubicación para este sitio y vuelve a intentarlo.' : error.code === 3 ? 'El GPS tardó demasiado. Pulsa “Actualizar ubicación” para reintentar.' : 'No se pudo obtener el GPS. Revisa el dispositivo y vuelve a intentarlo.';
    button.disabled = false;
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
}
function renderUsers(users, zones) {
  $('#users-list').innerHTML = users.slice().sort((a, b) => a.display_name.localeCompare(b.display_name, 'es')).map(user =>
    '<article class="user-row"><span class="user-avatar">' + esc(initials(user.display_name)) + '</span><span class="user-info"><strong>' + esc(user.display_name) + '</strong><small>' + esc((user.email || 'Sin correo') + ' · ' + user.username + ' · ' + (user.status === 'active' ? 'Activa' : user.status === 'suspended' ? 'Suspendida' : 'Pendiente')) + '</small></span><span class="member-actions"><select class="select-input" data-member-role="' + esc(user.id) + '" data-original-role="' + esc(user.role) + '" aria-label="Perfil para ' + esc(user.display_name) + '">' + ROLE_OPTIONS.map(role => '<option value="' + role + '"' + (user.role === role ? ' selected' : '') + '>' + esc(roleName(role)) + '</option>').join('') + '</select></span><details class="member-zone-picker"' + (['admin', 'aereo'].includes(user.role) ? ' hidden' : '') + '><summary>' + (['admin', 'aereo'].includes(user.role) ? 'Todas las zonas' : 'Zonas permitidas (' + (user.allowed_zones || []).length + ')') + '</summary><div class="zone-checkboxes">' + zones.map(zone => '<label><input type="checkbox" data-member-zone="' + esc(user.id) + '" value="' + esc(zone) + '"' + ((user.allowed_zones || []).includes(zone) ? ' checked' : '') + '> ' + esc(zone) + '</label>').join('') + '</div></details><button class="secondary-button" type="button" data-member-save="' + esc(user.id) + '">Guardar</button></article>'
  ).join('') || emptyState('Aún no hay cuentas.');
}
async function refreshUsers() {
  if (!isActiveAdmin()) return;
  const users = await cloudRequest('profiles?select=id,email,username,display_name,role,status,allowed_zones&order=created_at.asc');
  const zones = new Set();
  for (let offset = 0, lots; ; offset += 1000) {
    lots = await cloudRequest('field_lots?select=zone&order=lot_code.asc&limit=1000&offset=' + offset);
    for (const lot of lots) zones.add(lot.zone);
    if (lots.length < 1000) break;
  }
  state.zoneOptions = [...zones];
  updateInviteZoneVisibility();
  updateCreateUserZoneVisibility();
  renderUsers(users, state.zoneOptions);
}
function populateInviteRoles() {
  const select = $('#invite-user-role');
  select.innerHTML = ROLE_OPTIONS.map(role => '<option value="' + esc(role) + '">' + esc(roleName(role)) + '</option>').join('');
}
function populateCreateUserRoles() {
  const select = $('#create-user-role');
  select.innerHTML = ROLE_OPTIONS.map(role => '<option value="' + esc(role) + '">' + esc(roleName(role)) + '</option>').join('');
}
function renderZoneCheckboxes(container, zones, selected, attribute) {
  container.innerHTML = zones.map(zone => '<label><input type="checkbox" ' + attribute + ' value="' + esc(zone) + '"' + (selected.includes(zone) ? ' checked' : '') + '> ' + esc(zone) + '</label>').join('');
}
function updateCreateUserZoneVisibility() {
  const role = $('#create-user-role').value;
  const unrestricted = ['admin', 'aereo'].includes(role);
  $('#create-user-zone-picker').hidden = unrestricted;
  $('#create-user-zone-policy').textContent = unrestricted
    ? 'Este perfil tiene acceso a todas las zonas.'
    : 'Selecciona las zonas que podrá consultar y capturar.';
  renderZoneCheckboxes($('#create-user-zones'), state.zoneOptions, [], 'name="create_allowed_zones"');
}
function updateInviteZoneVisibility() {
  const zonePicker = $('#invite-user-zone-picker');
  const role = $('#invite-user-role').value;
  const unrestricted = ['admin', 'aereo'].includes(role);
  zonePicker.hidden = unrestricted;
  $('#invite-zone-policy').textContent = unrestricted
    ? 'Este perfil tiene acceso a todas las zonas.'
    : 'Selecciona las zonas que podrá consultar y capturar.';
  renderZoneCheckboxes($('#invite-user-zones'), state.zoneOptions, [], 'name="allowed_zones"');
}
function userCanAccessLot(lotCode) {
  const lot = state.lotLookup[lotCode];
  if (!lot || !state.user) return false;
  return userCanAccessZone(lot.zona);
}
function userCanAccessZone(zone) {
  if (!state.user) return false;
  return ['admin', 'aereo'].includes(state.user.role) || (state.user.allowedZones || []).includes(String(zone));
}
function invalidLotsInForm(form) {
  const invalidLots = [...form.querySelectorAll('[data-lot-lookup]')]
    .map(input => String(input.value || '').trim())
    .filter(Boolean)
    .filter(lot => !userCanAccessLot(lot));
  const invalidZones = [...form.querySelectorAll('[name="zona"], [name="ZONA"]')]
    .map(input => String(input.value || '').trim())
    .filter(Boolean)
    .filter(zone => !userCanAccessZone(zone));
  return [...new Set([...invalidLots, ...invalidZones])];
}
function recordHasLotAccess(record) {
  if (!state.user || !record || !record.datos) return false;
  if (['admin', 'aereo'].includes(state.user.role)) return true;
  const lotCodes = [];
  const zones = [];
  const lotKey = /^(id[\s_]*lote|lote)(\s+\d+)?$/i;
  const visit = value => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (lotKey.test(key) && (typeof child === 'string' || typeof child === 'number')) {
        const code = String(child).trim();
        if (code) lotCodes.push(code);
      } else if (/^(zona|zone)$/i.test(key) && (typeof child === 'string' || typeof child === 'number')) {
        const zone = String(child).trim();
        if (zone) zones.push(zone);
      } else {
        visit(child);
      }
    }
  };
  visit(record.datos);
  return lotCodes.every(userCanAccessLot) && zones.every(userCanAccessZone);
}
function renderHome() {
  renderGroups($('#module-groups'));
  renderGroups($('#module-picker'));
  $('#welcome-user').textContent = state.user.displayName.split(/\s+/)[0];
  $('#active-user').textContent = state.user.displayName;
  $('#active-role').textContent = roleName(state.user.role);
  $('.admin-nav').hidden = !isActiveAdmin();
  $('.admin-mobile-nav').hidden = !isActiveAdmin();
  $('#invite-user-form').hidden = !isActiveAdmin();
  $('#create-user-form').hidden = !isActiveAdmin();
  populateInviteRoles();
  populateCreateUserRoles();
  $('#home-subtitle').textContent = state.user.role === 'aereo' ? 'Captura vuelos y datos de apoyo para aplicaciones aéreas.' : state.user.role === 'terrestre' ? 'Captura calibraciones y labores de aplicación terrestre.' : state.user.role === 'supervisor' ? 'Revisa capturas y los apartados de Malezas y Calidad.' : 'Administra perfiles y revisa las capturas aéreas y terrestres.';
  refreshLists();
}
function navigate(page) {
  if (!state.user) return;
  if (page === 'usuarios' && !isActiveAdmin()) { toast('Solo una cuenta administradora activa puede gestionar usuarios.'); return; }
  if (state.recordTimeTimer) { clearInterval(state.recordTimeTimer); state.recordTimeTimer = null; }
  $$('.page').forEach(section => { section.hidden = section.id !== 'page-' + page; });
  $$('.nav-item,.mobile-nav button').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  if (page === 'capturar') {
    state.currentModule = null;
    $('#capture-form').hidden = true;
    $('#module-picker').hidden = false;
    $('#form-title').textContent = 'Selecciona una actividad';
    $('#form-subtitle').textContent = 'Elige un apartado disponible para tu perfil.';
    renderGroups($('#module-picker'));
  }
  if (page === 'pendientes' || page === 'registros' || page === 'inicio') refreshLists();
  if (page === 'usuarios') refreshUsers().catch(handleCloudError);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateConnection() {
  const online = navigator.onLine;
  $('#connection-state').classList.toggle('offline', !online);
  $('#connection-state span').textContent = !online ? 'Sin conexión' : state.syncConnected ? 'Espacio compartido' : 'Solo dispositivo';
  $('#offline-banner').hidden = online;
}
function downloadJson(records, name) {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
function handleCloudError(error) {
  state.syncConnected = false;
  updateConnection();
  console.error('No se pudo completar la operación con el espacio compartido.', error);
  if (state.user) toast(error.message || 'No se pudo conectar con el espacio compartido.');
}
async function startSession(user, session) {
  state.authSession = session;
  saveAuthSession(session);
  saveProfile(user);
  if (user.status !== 'active' || user.role === 'pending') {
    showAuthScreen('pending');
    return;
  }
  await loadLotLookup();
  state.syncConnected = false;
  $('#auth-screen').hidden = true;
  $('#app-shell').hidden = false;
  renderHome();
  updateConnection();
  navigate('inicio');
  if (navigator.onLine) {
    try { await syncCloudRecords(false); }
    catch (error) { handleCloudError(error); }
  }
}
async function endSession() {
  const session = state.authSession;
  if (session && navigator.onLine && state.configured) {
    try {
      await apiRequest('/auth/v1/logout', { method: 'POST', token: await accessToken() });
    } catch (error) {
      console.warn('Se cerró la sesión local, pero no se pudo revocar la sesión remota.', error);
    }
  }
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PROFILE_KEY);
  state.authSession = null;
  state.user = null;
  state.acceptingInvite = false;
  localStorage.removeItem(INVITE_PENDING_KEY);
  state.syncConnected = false;
  state.currentModule = null;
  if (state.recordTimeTimer) { clearInterval(state.recordTimeTimer); state.recordTimeTimer = null; }
  $('#capture-form').reset();
  $('#form-fields').innerHTML = '';
  showAuthScreen('login');
}
document.addEventListener('click', event => {
  const authMode = event.target.closest('[data-auth-mode]');
  if (authMode) { showAuthScreen(authMode.dataset.authMode); return; }
  const reviewButton = event.target.closest('[data-review]');
  if (reviewButton) {
    reviewRecord(reviewButton.dataset.recordId, reviewButton.dataset.review).catch(handleCloudError);
    return;
  }
  const memberButton = event.target.closest('[data-member-save]');
  if (memberButton) {
    saveMemberRole(memberButton.dataset.memberSave).catch(handleCloudError);
    return;
  }
  const childAdd = event.target.closest('[data-add-child]');
  if (childAdd) { addChildRow(childAdd.dataset.addChild); return; }
  const childRemove = event.target.closest('[data-remove-child]');
  if (childRemove) { childRemove.closest('.child-row').remove(); updateLotLocations($('#form-fields')); return; }
  const pageButton = event.target.closest('[data-page],[data-goto]');
  if (pageButton) { event.preventDefault(); navigate(pageButton.dataset.page || pageButton.dataset.goto); return; }
  const moduleButton = event.target.closest('[data-module]');
  if (moduleButton) { navigate('capturar'); chooseModule(moduleButton.dataset.module); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'create-user-role') {
    updateCreateUserZoneVisibility();
    return;
  }
  if (event.target.id === 'invite-user-role') {
    updateInviteZoneVisibility();
    return;
  }
  if (!event.target.matches('[data-member-role]')) return;
  const userRow = event.target.closest('.user-row');
  const zonePicker = $('.member-zone-picker', userRow);
  const unrestricted = ['admin', 'aereo'].includes(event.target.value);
  const previousRole = event.target.dataset.originalRole;
  if (['admin', 'aereo'].includes(previousRole) && !unrestricted) {
    $$('[data-member-zone]', userRow).forEach(input => { input.checked = false; });
  }
  zonePicker.hidden = unrestricted;
  zonePicker.querySelector('summary').textContent = unrestricted
    ? 'Todas las zonas'
    : 'Zonas permitidas (' + $$('[data-member-zone]:checked', userRow).length + ')';
  event.target.dataset.originalRole = event.target.value;
});
document.addEventListener('change', event => {
  if (!event.target.matches('[data-member-zone]')) return;
  const userRow = event.target.closest('.user-row');
  const roleSelect = $('[data-member-role]', userRow);
  if (['admin', 'aereo'].includes(roleSelect.value)) return;
  $('.member-zone-picker summary', userRow).textContent =
    'Zonas permitidas (' + $$('[data-member-zone]:checked', userRow).length + ')';
});
$('#capture-form').addEventListener('input', event => {
  if (event.target.matches('[data-lot-lookup]')) updateLotLocations($('#form-fields'));
  if (event.target.matches('[data-farm-selector]')) updateZoneFromFarm($('#form-fields'));
});
$('#capture-form').addEventListener('change', event => {
  if (event.target.matches('[data-farm-selector]')) updateZoneFromFarm($('#form-fields'));
});
$('#form-fields').addEventListener('change', event => {
  if (event.target.id === 'pcpm-labor') renderPcpmDetails(event.target.value);
  if (event.target.id === 'ag-tipo-aguilon') renderAguilonDetails(event.target.value);
  if (event.target.id === 'quality-type') renderQualityDetails(event.target.value);
});
$('#capture-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const unauthorizedLots = invalidLotsInForm(form);
  if (unauthorizedLots.length) {
    toast('Sin acceso a los lotes: ' + unauthorizedLots.join(', '));
    return;
  }
  if (state.currentModule === 'clima' && !$$('.repeat-row', $('#weather-rows')).length) { toast('Agrega por lo menos una lectura de clima.'); return; }
  const createdAt = new Date().toISOString();
  const recordId = crypto.randomUUID();
  let datos;
  try { datos = await serializeForm(form, recordId); }
  catch (error) { console.error(error); toast('No se pudo leer una imagen adjunta.'); return; }
  datos.hora_registro = createdAt;
  const record = {
    id: recordId, tipo: state.currentModule, createdAt, schemaVersion: 5, syncStatus: 'pending',
    syncOrigin: 'new', ownerUsername: state.user.username, ownerName: state.user.displayName, ownerRole: state.user.role, datos: datos
  };
  try {
    await putRecord(record);
    await refreshLists();
    form.reset();
    toast('Guardado en este dispositivo.');
    navigate('inicio');
    if (navigator.onLine) syncCloudRecords(false).catch(handleCloudError);
  } catch (error) {
    console.error(error);
    toast('No se pudo guardar localmente. Revisa el almacenamiento del dispositivo.');
  }
});
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const identifier = $('#login-email').value.trim().toLowerCase();
  const email = identifier.includes('@') ? identifier : identifier + '@' + NO_EMAIL_AUTH_DOMAIN;
  const password = $('#login-password').value;
  try {
    const result = await apiRequest('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    $('#login-password').value = '';
    saveAuthSession({ ...result, expires_at: result.expires_at || Math.floor(Date.now() / 1000) + result.expires_in });
    await refreshCloudProfile();
  } catch (error) {
    console.error(error);
    authMessage('login-error', error.message || 'No se pudo iniciar sesión.');
  }
});
$('#create-user-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if ($('#create-user-password').value !== $('#create-user-password-confirm').value) {
    authMessage('create-user-message', 'Las contraseñas no coinciden.');
    return;
  }
  if (!isActiveAdmin()) {
    authMessage('create-user-message', 'Solo una cuenta administradora activa puede crear usuarios.');
    return;
  }
  if (!navigator.onLine) {
    authMessage('create-user-message', 'Conéctate a internet para crear una cuenta.');
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  authMessage('create-user-message', '');
  $('#create-user-message').classList.remove('success-message');
  let created;
  try {
    created = await apiRequest('/functions/v1/create-user', {
      method: 'POST',
      token: await accessToken(),
      body: {
        username: $('#create-user-username').value.trim().toLowerCase(),
        display_name: $('#create-user-name').value.trim(),
        password: $('#create-user-password').value,
        role: $('#create-user-role').value,
        allowed_zones: ['admin', 'aereo'].includes($('#create-user-role').value)
          ? []
          : $$('input[name="create_allowed_zones"]:checked', $('#create-user-zone-picker')).map(input => input.value)
      }
    });
  } catch (error) {
    console.error(error);
    authMessage('create-user-message', error.message || 'No se pudo crear la cuenta.');
  } finally {
    $('#create-user-password').value = '';
    $('#create-user-password-confirm').value = '';
    submitButton.disabled = false;
  }
  if (!created) return;

  form.reset();
  updateCreateUserZoneVisibility();
  authMessage('create-user-message', 'Cuenta creada para ' + created.username + '. Entrégale la contraseña inicial de forma privada.');
  $('#create-user-message').classList.add('success-message');
  try {
    await refreshUsers();
  } catch (error) {
    console.error(error);
    authMessage('create-user-message', 'La cuenta se creó, pero no se pudo actualizar la lista de usuarios.');
  }
});
$('#signup-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  try {
    const result = await apiRequest('/auth/v1/signup', {
      method: 'POST',
      body: {
        email: $('#signup-email').value.trim().toLowerCase(),
        password: $('#signup-password').value,
        data: {
          display_name: $('#signup-name').value.trim(),
          username: $('#signup-username').value.trim().toLowerCase()
        }
      }
    });
    event.currentTarget.reset();
    if (result && result.access_token) {
      saveAuthSession({ ...result, expires_at: result.expires_at || Math.floor(Date.now() / 1000) + result.expires_in });
      await refreshCloudProfile();
    } else {
      showAuthScreen('login');
      authMessage('login-error', 'Solicitud registrada. Confirma tu correo si se solicita; un administrador debe activar tu perfil.');
    }
  } catch (error) {
    console.error(error);
    authMessage('signup-error', error.message || 'No se pudo registrar la solicitud.');
  }
});
$('#invite-password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const password = $('#invite-password').value;
  if (!event.currentTarget.reportValidity()) return;
  if (password !== $('#invite-password-confirm').value) {
    authMessage('invite-password-error', 'Las contraseñas no coinciden.');
    return;
  }
  if (!state.acceptingInvite || !state.authSession) {
    authMessage('invite-password-error', 'La invitación no está disponible. Solicita al administrador que envíe otra.');
    return;
  }
  try {
    const result = await apiRequest('/auth/v1/user', {
      method: 'PUT',
      token: state.authSession.access_token,
      body: { password }
    });
    $('#invite-password').value = '';
    $('#invite-password-confirm').value = '';
    state.authSession.user = result;
    state.acceptingInvite = false;
    localStorage.removeItem(INVITE_PENDING_KEY);
    saveAuthSession(state.authSession);
  } catch (error) {
    console.error(error);
    authMessage('invite-password-error', error.message || 'No se pudo guardar la contraseña. Verifica que el enlace siga vigente.');
    return;
  }
  try {
    await refreshCloudProfile();
  } catch (error) {
    console.error(error);
    showAuthScreen('pending');
    authMessage('pending-error', 'La contraseña se guardó, pero no se pudo comprobar el perfil. Intenta comprobar el acceso de nuevo.');
  }
});
$('#invite-user-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (!isActiveAdmin()) {
    authMessage('invite-user-message', 'Solo una cuenta administradora activa puede invitar usuarios.');
    return;
  }
  if (!navigator.onLine) {
    authMessage('invite-user-message', 'Conéctate a internet para enviar una invitación.');
    return;
  }
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  let invitationSent = false;
  authMessage('invite-user-message', '');
  $('#invite-user-message').classList.remove('success-message');
  try {
    const invitation = await apiRequest('/functions/v1/invite-user', {
      method: 'POST',
      token: await accessToken(),
      body: {
        email: $('#invite-user-email').value.trim().toLowerCase(),
        username: $('#invite-user-username').value.trim().toLowerCase(),
        display_name: $('#invite-user-name').value.trim(),
        role: $('#invite-user-role').value,
        allowed_zones: ['admin', 'aereo'].includes($('#invite-user-role').value)
          ? []
          : $$('input[name="allowed_zones"]:checked', $('#invite-user-zone-picker')).map(input => input.value)
      }
    });
    invitationSent = true;
    form.reset();
    updateInviteZoneVisibility();
    authMessage('invite-user-message', 'Invitación enviada a ' + invitation.email + '. La persona establecerá su contraseña desde el correo.');
    $('#invite-user-message').classList.add('success-message');
  } catch (error) {
    console.error(error);
    authMessage('invite-user-message', error.message || 'No se pudo enviar la invitación.');
  } finally {
    submitButton.disabled = false;
  }
  if (!invitationSent) return;
  try {
    await refreshUsers();
  } catch (error) {
    console.error(error);
    authMessage('invite-user-message', 'La invitación se envió, pero no se pudo actualizar la lista de usuarios.');
  }
});
async function saveMemberRole(userId) {
  if (!isActiveAdmin()) throw new Error('Solo un administrador activo puede asignar perfiles.');
  const roleSelect = $$('[data-member-role]').find(item => item.dataset.memberRole === userId);
  if (!roleSelect) throw new Error('No se encontró el perfil seleccionado.');
  const zones = ['admin', 'aereo'].includes(roleSelect.value) ? [] :
    $$('[data-member-zone]').filter(input => input.dataset.memberZone === userId && input.checked).map(input => input.value);
  await cloudRequest('rpc/set_member_access', {
    method: 'POST',
    body: { p_user_id: userId, p_role: roleSelect.value, p_allowed_zones: zones }
  });
  authMessage('user-create-message', 'Perfil actualizado.');
  $('#user-create-message').classList.add('success-message');
  await refreshUsers();
}
async function reviewRecord(recordId, decision) {
  if (!['approved', 'rejected'].includes(decision) || !['admin', 'supervisor'].includes(state.user.role)) return;
  await cloudRequest('rpc/review_field_record', {
    method: 'POST',
    body: { p_record_id: recordId, p_decision: decision, p_note: null }
  });
  const record = await getRecord(recordId);
  if (record) {
    record.reviewStatus = decision;
    record.reviewedBy = state.user.id;
    record.reviewedAt = new Date().toISOString();
    await putRecord(record);
  }
  await refreshLists();
  await syncCloudRecords(false);
  toast(decision === 'approved' ? 'Captura aprobada.' : 'Captura rechazada.');
}
$('#check-access').addEventListener('click', async () => {
  try { await refreshCloudProfile(); }
  catch (error) { authMessage('pending-error', error.message || 'No se pudo comprobar el acceso.'); }
});
$('#pending-logout').addEventListener('click', endSession);
$('#record-search').addEventListener('input', refreshLists);
function visibleLocalRecords(records) {
  const scoped = records.filter(recordHasLotAccess);
  return ['admin', 'supervisor'].includes(state.user.role) ? scoped : scoped.filter(record => record.ownerUsername === state.user.username);
}
$('#import-local').addEventListener('click', async () => {
  try {
    const result = await syncCloudRecords(true);
    toast(result.uploaded + ' registros locales importados; ' + result.downloaded + ' registros compartidos actualizados.');
  } catch (error) { handleCloudError(error); }
});
$('#sync-now').addEventListener('click', async () => {
  try {
    const result = await syncCloudRecords(false);
    toast(result.uploaded + ' capturas nuevas sincronizadas; ' + result.downloaded + ' registros compartidos actualizados.');
  } catch (error) { handleCloudError(error); }
});
$('#export-all').addEventListener('click', async () => downloadJson(visibleLocalRecords(await getRecords()), 'mym-campo-' + localDate() + '.json'));
$('#export-pending').addEventListener('click', async () => downloadJson(visibleLocalRecords(await getRecords()).filter(record => record.syncStatus === 'pending'), 'mym-campo-pendientes-' + localDate() + '.json'));
$('#logout-button').addEventListener('click', endSession);
window.addEventListener('online', () => {
  updateConnection();
  syncCloudRecords(false).catch(handleCloudError);
});
window.addEventListener('offline', updateConnection);
async function init() {
  try {
    try { state.configured = !!supabaseConfig(); }
    catch (error) {
      state.configured = false;
      $('#auth-config-warning small').textContent = error.message;
    }
    state.db = await openDb();
    const acceptingInvite = consumeInviteLink() || localStorage.getItem(INVITE_PENDING_KEY) === 'true';
    state.acceptingInvite = acceptingInvite;
    const session = localStorage.getItem(SESSION_KEY);
    const profile = localStorage.getItem(PROFILE_KEY);
    if (!acceptingInvite) state.authSession = session ? JSON.parse(session) : null;
    state.user = acceptingInvite ? null : profile ? JSON.parse(profile) : null;
    if (!state.configured) showAuthScreen('login');
    else if (acceptingInvite) showAuthScreen('invite');
    else if (state.authSession && state.user && state.user.status === 'active' && state.user.role !== 'pending') {
      if (navigator.onLine) {
        try { await refreshCloudProfile(); }
        catch (error) {
          console.warn('Se usará la sesión local hasta recuperar conexión con el espacio compartido.', error);
          await startSession(state.user, state.authSession);
          handleCloudError(error);
        }
      } else {
        await startSession(state.user, state.authSession);
      }
    } else if (state.authSession) {
      showAuthScreen('pending');
    } else showAuthScreen('login');
  } catch (error) {
    console.error(error);
    showAuthScreen('login');
    authMessage('login-error', 'No se pudo abrir el almacenamiento local. Usa HTTPS o localhost y vuelve a abrir la app.');
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('No se pudo activar el modo sin conexión', error));
}
init();
