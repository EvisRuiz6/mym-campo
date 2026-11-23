const DB_NAME = 'mym-campo-local';
const DB_VERSION = 5;
const SESSION_KEY = 'mym-campo-auth-session';
const PROFILE_KEY = 'mym-campo-auth-profile';
const INVITE_PENDING_KEY = 'mym-campo-invite-pending';
const LOT_LOOKUP_CACHE_KEY = 'mym-campo-lot-lookup:';
const WORKSPACE_MENU_KEY = 'mym-campo-workspace-menu:';
const WORKSPACE_PAGES = ['inicio', 'capturar', 'pendientes', 'registros', 'gestionar', 'variacion-vuelo', 'clima-grafica', 'seguimiento-lotes', 'programacion-semanal', 'usuarios', 'exportar-excel'];
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
const eppReportRoles = {
  '1_MEZCLA': 'Personal de preparación de la mezcla y abastecedor',
  '2_MONITOREO': 'Personal de monitoreo de calidad de aplicación',
  '3_ENCARGADO': 'Personal encargado de aplicación',
  '4_PILOTO DRON': 'Personal encargado de dron - Operario',
  '5_APOYO DRON': 'Personal de apoyo de dron',
  '6_ZONA SENSIBLE': 'Personal de monitoreo en zonas sensibles',
  '7_ ENVASES': 'Personal que manipula envases vacíos',
  '8_INVESTIGACIÓN': 'Personal de Investigación'
};
const qualityForms = {
  aguilon: {
    label: 'F.C. AGUILÓN',
    fields: [
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
      { label: 'IMÁGENES', key: 'IMAGEN', type: 'file', accept: 'image/*', multiple: true, full: true }
    ]
  },
  arranque: {
    label: 'F.C. ARRANQUE',
    fields: [
      { label: 'Días después del corte/siembra (Edad del cultivo)', key: 'Días después del corte/siembra (Edad del cultivo)', type: 'number', step: '1' },
      { label: '¿Existe Maleza con altura mayor a 15 cm en área ya arrancada?', key: '¿Existe Maleza con altura mayor a 15 cm en área ya arrancada?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: '¿Existen Malezas con flor?', key: '¿Existen Malezas con flor?', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Se esta utilizando machete', key: 'Se esta utilizando machete', type: 'select', options: [{ label: 'Sí', value: 'TRUE' }, { label: 'No', value: 'FALSE' }] },
      { label: 'Observaciones Generales', key: 'Observaciones Generales', type: 'textarea', full: true },
      { label: 'IMÁGENES', key: 'IMAGEN', type: 'file', accept: 'image/*', multiple: true, full: true }
    ]
  },
  pcpm: {
    label: 'F.C. PC Y PM',
    fields: [
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
      { label: 'IMÁGENES', key: 'IMAGEN', type: 'file', accept: 'image/*', multiple: true, full: true }
    ]
  }
};
const childSchemas = {
  malezas_detalle: [
    { label: 'FECHA', key: 'FECHA', type: 'date', value: localDate() },
    { label: 'LOTE', key: 'LOTE', lotLookup: true },
    { label: 'LABOR', key: 'LABOR', type: 'select', required: true, options: ['Plantilla', 'Soca'] },
    { label: '% CONTROL', key: '% CONTROL', type: 'number', step: '0.01', min: '0', max: '100' },
    { label: '% COBERTURA', key: '% COBERTURA', type: 'number', step: '0.01', min: '0', max: '100', readonly: true, hint: 'Se calcula automáticamente como 100 menos el % CONTROL.' },
    { label: 'IMÁGENES', key: 'IMAGEN', type: 'file', accept: 'image/*', multiple: true, hint: 'Puedes seleccionar una o varias imágenes para este lote.', full: true },
    { label: 'CATORCENA', key: 'CATORCENA', type: 'number', step: '1', readonly: true, hint: 'Se calcula automáticamente según la fecha del detalle.' },
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
const state = { db: null, user: null, authSession: null, configured: false, syncConnected: false, syncBusy: false, syncIdleWaiters: [], syncRequested: false, flightActivityLaborBusy: false, flightActivityLaborQueue: Promise.resolve(), flightActivityLaborUpdatePromise: null, refreshPromise: null, currentModule: null, editingRecord: null, recordTimeTimer: null, lotLookup: Object.create(null), lotLookupRequests: new Map(), zoneOptions: [], zonesReady: false, usersLoadPromise: null, visitMap: null, flightReportRecords: [], flightVariationRecords: [], flightVariationLoadSeq: 0, flightVariationDrone: '', flightVariationSource: '', climateRecords: [], climateLoadSeq: 0, climateSelected: '', climateSource: '', acceptingInvite: false, lotFollowupPlans: [], lotFollowupVisits: [], lotWeeklyPrograms: [], lotFollowupLoadPromise: null, lotFollowupDateId: 0, editingLotFollowup: null, editingLotWeeklyProgramId: null, lotWeeklyProgramDraftKey: '', lotWeeklyProgramDraftLotCodes: [] };

function lotLookupCacheKey() {
  const scopeKey = [state.user.role, ...(state.user.allowedZones || []).slice().sort()].join(':');
  return LOT_LOOKUP_CACHE_KEY + state.user.id + ':' + encodeURIComponent(scopeKey);
}
async function loadLotLookup() {
  const cacheKey = lotLookupCacheKey();
  try {
    if (!navigator.onLine) throw new Error('Sin conexión: se usará la lista de lotes guardada para esta cuenta.');
    const lots = [];
    for (let offset = 0, page; ; offset += 1000) {
      page = await cloudRequest('field_lots?select=lot_code,zone,finca&order=lot_code.asc&limit=1000&offset=' + offset);
      lots.push(...page);
      if (page.length < 1000) break;
    }
    state.lotLookup = Object.create(null);
    for (const lot of lots) {
      const lotCode = String(lot.lot_code || '').trim();
      const zone = normalizeZoneValue(lot.zone);
      const finca = String(lot.finca || '').trim();
      if (!lotCode) continue;
      state.lotLookup[lotCode] = { zona: zone, finca };
    }
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
async function refreshLotLookupEntry(lotCode) {
  if (state.lotLookup[lotCode]) return true;
  if (!navigator.onLine || !state.user) return false;
  const requestKey = state.user.id + ':' + lotCode;
  if (state.lotLookupRequests.has(requestKey)) return state.lotLookupRequests.get(requestKey);
  const userId = state.user.id;
  const request = cloudRequest('field_lots?select=lot_code,zone,finca&lot_code=eq.' + encodeURIComponent(lotCode) + '&limit=1')
    .then(rows => {
      const lot = Array.isArray(rows) ? rows[0] : null;
      if (!lot || !state.user || state.user.id !== userId) return false;
      state.lotLookup[lot.lot_code] = { zona: lot.zone, finca: lot.finca };
      try {
        localStorage.setItem(lotLookupCacheKey(), JSON.stringify(state.lotLookup));
      } catch (error) {
        console.warn('No se pudo guardar el lote verificado para uso sin conexión.', error);
      }
      return true;
    })
    .finally(() => state.lotLookupRequests.delete(requestKey));
  state.lotLookupRequests.set(requestKey, request);
  return request;
}

function localDate() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function localTime(date) {
  const d = date || new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
const WORK_CONTEXT_MODULES = ['clima', 'vuelos'];
const WORK_CONTEXT_DRAFT_PREFIX = 'mym-campo-work-context-v1:';
function captureTimestamp(value) {
  const date = value == null ? new Date() : new Date(value);
  return { createdAt: date.toISOString(), horaRegistro: localTime(date) };
}
function workContextDraftKey(moduleKey, ownerId) {
  return WORK_CONTEXT_DRAFT_PREFIX + encodeURIComponent(String(ownerId)) + ':' + moduleKey;
}
function buildWorkContextDraftData(moduleKey, fields, weatherReadings) {
  const data = {};
  for (const field of Array.isArray(fields) ? fields : []) {
    if (!field || !field.name || field.type === 'file' ||
        (moduleKey === 'clima' && field.inWeatherRow)) continue;
    data[field.name] = field.value == null ? '' : String(field.value);
  }
  if (moduleKey === 'clima') {
    data.lecturas = (Array.isArray(weatherReadings) ? weatherReadings : []).map(reading =>
      Object.fromEntries((Array.isArray(reading) ? reading : [])
        .filter(field => field && field.name && field.type !== 'file')
        .map(field => [field.name, field.value == null ? '' : String(field.value)]))
    );
  }
  return data;
}
function workContextDraftHasContent(data) {
  return Object.entries(data || {}).some(([name, value]) => {
    if (name === 'contexto_vuelos_id' || name === 'hora_registro') return false;
    if (Array.isArray(value)) {
      return value.some(row => row && Object.values(row).some(item => String(item == null ? '' : item).trim() !== ''));
    }
    return String(value == null ? '' : value).trim() !== '';
  });
}
function createWorkContextDraft(moduleKey, ownerId, data, updatedAt) {
  if (!WORK_CONTEXT_MODULES.includes(moduleKey) || !ownerId ||
      !data || typeof data !== 'object' || Array.isArray(data)) return null;
  return {
    version: 1,
    moduleKey,
    ownerId,
    updatedAt: updatedAt || new Date().toISOString(),
    data
  };
}
function clearFlightEntryFields(form) {
  for (const name of ['dron', 'area_ha', 'litros', 'observaciones']) {
    const input = form && form.querySelector('[name="' + name + '"]');
    if (input) input.value = '';
  }
}
function flightActivityLaborUpdates(records, contextId, labor, ownerId, ownerUsername) {
  const activityId = String(contextId || '');
  const activityLabor = String(labor || '').trim();
  if (!activityId || !activityLabor) return [];
  return (Array.isArray(records) ? records : []).reduce((updates, record) => {
    const data = record && record.datos && typeof record.datos === 'object' && !Array.isArray(record.datos)
      ? record.datos
      : null;
    const sameOwner = record && ownerId && record.ownerId
      ? record.ownerId === ownerId
      : !!(record && ownerUsername && record.ownerUsername === ownerUsername);
    if (!data || record.tipo !== 'vuelos' || record.syncStatus === 'delete-pending' || !sameOwner ||
        String(data.contexto_vuelos_id || '') !== activityId ||
        String(data.labor || '').trim() === activityLabor) return updates;
    const updated = { ...record, datos: { ...data, labor: activityLabor } };
    if (record.syncStatus === 'synced') {
      updated.syncStatus = 'pending';
      updated.syncOrigin = 'activity-update';
      updated.reviewStatus = 'pending';
      updated.reviewedBy = null;
      updated.reviewedAt = null;
      updated.reviewNote = null;
    }
    updates.push(updated);
    return updates;
  }, []);
}
function resolveFlightActivityLaborSelection(input, requestedLabor, result) {
  if (!input) return false;
  if (result && result.ok) input.dataset.activityLabor = requestedLabor;
  const isCurrentSelection = input.isConnected && input.value === requestedLabor;
  if (isCurrentSelection && (!result || !result.ok)) {
    input.value = input.dataset.activityLabor || '';
  }
  return isCurrentSelection;
}
function setWorkContextStatus(moduleKey, message, hasError) {
  const status = $('[data-work-context-status="' + moduleKey + '"]', $('#form-fields'));
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('work-context-error', !!hasError);
}
function readWorkContextDraft(moduleKey) {
  if (!state.user || !WORK_CONTEXT_MODULES.includes(moduleKey)) return null;
  const key = workContextDraftKey(moduleKey, state.user.id);
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const draft = JSON.parse(stored);
    if (!draft || draft.version !== 1 || draft.moduleKey !== moduleKey ||
        draft.ownerId !== state.user.id || !draft.data ||
        typeof draft.data !== 'object' || Array.isArray(draft.data)) {
      throw new Error('El contexto guardado no coincide con esta cuenta o este formulario.');
    }
    return draft;
  } catch (error) {
    console.error('No se pudo recuperar el contexto de trabajo.', error);
    setWorkContextStatus(moduleKey, 'No se pudo recuperar el contexto guardado.', true);
    toast('No se pudo recuperar el contexto guardado en este dispositivo.');
    return null;
  }
}
function saveWorkContextDraft(moduleKey, force) {
  if (!state.user || state.currentModule !== moduleKey ||
      !WORK_CONTEXT_MODULES.includes(moduleKey) || state.editingRecord) return false;
  const fieldsRoot = $('#form-fields');
  if (!fieldsRoot) return false;
  const readingsRoot = moduleKey === 'clima' ? $('#weather-rows') : null;
  const fields = $$('[name]', fieldsRoot).map(input => ({
    name: input.name,
    value: input.type === 'checkbox' ? String(input.checked) : input.value,
    type: input.type,
    inWeatherRow: !!(readingsRoot && readingsRoot.contains(input))
  }));
  const readings = readingsRoot
    ? $$('.repeat-row', readingsRoot).map(row => $$('[name]', row).map(input => ({
      name: input.name,
      value: input.type === 'checkbox' ? String(input.checked) : input.value,
      type: input.type
    })))
    : [];
  const data = buildWorkContextDraftData(moduleKey, fields, readings);
  const draft = createWorkContextDraft(moduleKey, state.user.id, data);
  if (!draft) return false;
  const key = workContextDraftKey(moduleKey, state.user.id);
  try {
    const existing = localStorage.getItem(key);
    if (!force && !existing && !workContextDraftHasContent(data)) {
      setWorkContextStatus(moduleKey, 'Autoguardado activo. Se recuperará el contexto cuando haya datos.', false);
      return true;
    }
    localStorage.setItem(key, JSON.stringify(draft));
    setWorkContextStatus(moduleKey, 'Contexto guardado en este dispositivo.', false);
    return true;
  } catch (error) {
    console.error('No se pudo guardar el contexto de trabajo.', error);
    setWorkContextStatus(moduleKey, 'No se pudo guardar el contexto. Revisa el almacenamiento del dispositivo.', true);
    return false;
  }
}
function clearWorkContextDraft(moduleKey) {
  if (!state.user || !WORK_CONTEXT_MODULES.includes(moduleKey)) return false;
  try {
    localStorage.removeItem(workContextDraftKey(moduleKey, state.user.id));
    return true;
  } catch (error) {
    console.error('No se pudo borrar el contexto de trabajo.', error);
    toast('No se pudo borrar el contexto guardado en este dispositivo.');
    return false;
  }
}
function restoreWorkContextDraft(moduleKey, draft) {
  if (!draft || draft.moduleKey !== moduleKey) return false;
  const data = { ...draft.data };
  const readings = moduleKey === 'clima' && Array.isArray(data.lecturas) ? data.lecturas : [];
  delete data.lecturas;
  setNamedFields($('#form-fields'), data);
  if (moduleKey === 'clima') {
    const target = $('#weather-rows');
    target.innerHTML = '';
    readings.forEach((reading, index) => {
      target.insertAdjacentHTML('beforeend', rowMarkup('weather', index));
      setNamedFields(target.lastElementChild, reading);
    });
  }
  return true;
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
      if (!db.objectStoreNames.contains('weekly-visit-drafts')) db.createObjectStore('weekly-visit-drafts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('offline-snapshots')) db.createObjectStore('offline-snapshots', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('weekly-visit-outbox')) db.createObjectStore('weekly-visit-outbox', { keyPath: 'id' });
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
const getWeeklyVisitDraft = id => storeRequest('weekly-visit-drafts', 'readonly', store => store.get(id));
function putWeeklyVisitDraft(draft) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('weekly-visit-drafts', 'readwrite');
    tx.objectStore('weekly-visit-drafts').put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudo guardar el borrador.'));
    tx.onabort = () => reject(tx.error || new Error('Se canceló el guardado del borrador.'));
  });
}
const deleteWeeklyVisitDraft = id => storeRequest('weekly-visit-drafts', 'readwrite', store => store.delete(id));
const getWeeklyVisitOutbox = () => storeRequest('weekly-visit-outbox', 'readonly', store => store.getAll());
function writeWeeklyVisitOutbox(group, operation) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(operation === 'delete'
      ? ['weekly-visit-outbox', 'weekly-visit-drafts'] : 'weekly-visit-outbox', 'readwrite');
    const store = tx.objectStore('weekly-visit-outbox');
    let abortMessage = '';
    if (operation === 'add') store.add(group);
    else if (operation === 'delete') {
      store.delete(group.id);
      tx.objectStore('weekly-visit-drafts').delete(group.id);
    }
    else if (operation === 'replace-conflict') {
      const request = store.get(group.id);
      request.onsuccess = () => {
        const previous = request.result;
        if (!previous || previous.userId !== group.userId || previous.status !== 'conflict') {
          abortMessage = 'El grupo cambió; actualiza Pendientes antes de guardar.';
          tx.abort();
          return;
        }
        store.put(group);
      };
    }
    else store.put(group);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudo guardar la cola de visitas.'));
    tx.onabort = () => reject(new Error(abortMessage || (tx.error && tx.error.message) || 'Se canceló la actualización de la cola de visitas.'));
  });
}
function offlineSnapshotKey(type, user) {
  const zones = [...(user.allowedZones || [])].map(normalizeZoneValue).sort();
  return JSON.stringify([type, user.id, user.role, zones]);
}
const getOfflineSnapshot = id => storeRequest('offline-snapshots', 'readonly', store => store.get(id));
function putOfflineSnapshot(snapshot) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('offline-snapshots', 'readwrite');
    tx.objectStore('offline-snapshots').put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudo guardar la copia sin conexión.'));
    tx.onabort = () => reject(tx.error || new Error('Se canceló la copia sin conexión.'));
  });
}
function sameOfflineScope(user) {
  return !!state.user && state.user.status === 'active' &&
    offlineSnapshotKey('scope', state.user) === offlineSnapshotKey('scope', user);
}
function offlineSnapshotDate(snapshot) {
  return new Date(snapshot.savedAt).toLocaleString('es-GT');
}
function putRecords(records) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    for (const record of records) store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudieron actualizar los registros locales.'));
    tx.onabort = () => reject(tx.error || new Error('La actualización local de registros fue cancelada.'));
  });
}
function reconcileCloudRecords(remote, user, visibleIds, snapshot) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(snapshot ? ['records', 'offline-snapshots'] : 'records', 'readwrite');
    const store = tx.objectStore('records');
    const request = store.getAll();
    let needsFullSync = false;
    request.onsuccess = () => {
      if (!sameOfflineScope(user)) {
        tx.abort();
        return;
      }
      const local = request.result;
      const localById = new Map(local.map(record => [record.id, record]));
      const remoteIds = new Set(visibleIds || remote.map(record => record.id));
      const changedIds = new Set(remote.map(record => record.id));
      const previousIds = new Set(snapshot && snapshot.previousIds || []);
      if (snapshot && [...remoteIds].some(id =>
        (!localById.has(id) || (!snapshot.full && !previousIds.has(id))) && !changedIds.has(id))) {
        needsFullSync = true;
        tx.abort();
        return;
      }
      for (const record of local) {
        if (record.syncStatus === 'synced' && !remoteIds.has(record.id) &&
          (record.ownerId === user.id || (!record.ownerId && record.ownerUsername === user.username) ||
            ['admin', 'supervisor'].includes(user.role))) {
          store.delete(record.id);
        }
      }
      for (const record of remote) {
        const existing = localById.get(record.id);
        if (existing && existing.syncStatus !== 'synced') continue;
        if (!existing || JSON.stringify(existing) !== JSON.stringify(record)) store.put(record);
      }
      if (snapshot) tx.objectStore('offline-snapshots').put({
        id: snapshot.id, cursor: snapshot.cursor, knownIds: [...remoteIds], savedAt: new Date().toISOString()
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudieron actualizar los registros locales.'));
    tx.onabort = () => {
      const error = needsFullSync ? new Error('La copia local necesita una actualización completa.')
        : tx.error || new Error('La actualización local de registros fue cancelada.');
      if (needsFullSync) error.needsFullSync = true;
      reject(error);
    };
  });
}
function validSyncCursor(value) {
  if (typeof value !== 'string' || value.length > 1000000) return false;
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\|(\d{1,19}):(\d{1,19}):(\d{1,19}(?:,\d{1,19})*)?$/.exec(value);
  if (!match) return false;
  const xmin = BigInt(match[2]), xmax = BigInt(match[3]), limit = BigInt('9223372036854775807');
  if (xmin > xmax || xmax > limit) return false;
  let previous = xmin - 1n;
  for (const xid of match[4] ? match[4].split(',') : []) {
    const current = BigInt(xid);
    if (current <= previous || current >= xmax) return false;
    previous = current;
  }
  return true;
}
async function fetchCloudRecordDelta(cursor) {
  const result = await cloudRequest('rpc/get_field_record_sync', {
    method: 'POST', body: { p_after: cursor }
  });
  if (!result || !validSyncCursor(result.cursor) || typeof result.full !== 'boolean' ||
      !Array.isArray(result.ids) || !Array.isArray(result.records) ||
      result.ids.some(id => typeof id !== 'string') || new Set(result.ids).size !== result.ids.length ||
      (cursor === null && !result.full) ||
      (!result.full && (!validSyncCursor(cursor) ||
        result.cursor.split('|')[0] !== cursor.split('|')[0] ||
        BigInt(result.cursor.split('|')[1].split(':')[1]) < BigInt(cursor.split('|')[1].split(':')[1])))) {
    throw new Error('La respuesta de sincronización no es válida.');
  }
  const ids = new Set(result.ids);
  const changed = new Set();
  for (const row of result.records) {
    if (!row || typeof row.id !== 'string' || typeof row.owner_id !== 'string' ||
        typeof row.tipo !== 'string' || typeof row.created_at !== 'string' ||
        !row.datos || typeof row.datos !== 'object' || Array.isArray(row.datos) ||
        !ids.has(row.id) || changed.has(row.id)) {
      throw new Error('La respuesta de sincronización contiene registros inconsistentes.');
    }
    changed.add(row.id);
  }
  if (result.full && changed.size !== ids.size) {
    throw new Error('La respuesta de sincronización completa está incompleta.');
  }
  return result;
}
function acknowledgeUploadedRecord(original) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    const request = store.get(original.id);
    let needsSync = false;
    request.onsuccess = () => {
      const current = request.result;
      if (!current) {
        store.put({ ...original, syncStatus: 'delete-pending' });
        needsSync = true;
      } else if (current.ownerId && original.ownerId
        ? current.ownerId !== original.ownerId
        : current.ownerUsername !== original.ownerUsername) {
        return;
      } else if (JSON.stringify(current) === JSON.stringify(original)) {
        const synced = { ...current, syncStatus: 'synced' };
        delete synced.syncOrigin;
        if (original.syncOrigin === 'activity-update') {
          synced.reviewStatus = 'pending';
          synced.reviewedBy = null;
          synced.reviewedAt = null;
          synced.reviewNote = null;
        }
        store.put(synced);
      } else {
        if (current.syncStatus === 'pending' && original.syncOrigin !== 'activity-update') {
          store.put({ ...current, syncOrigin: 'activity-update' });
        }
        needsSync = current.syncStatus === 'pending' || current.syncStatus === 'delete-pending';
      }
    };
    tx.oncomplete = () => resolve(needsSync);
    tx.onerror = () => reject(tx.error || new Error('No se pudo confirmar la captura en este dispositivo.'));
    tx.onabort = () => reject(tx.error || new Error('Se canceló la confirmación de la captura.'));
  });
}
function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJson(value[key])]));
}
const deleteRecord = id => storeRequest('records', 'readwrite', store => store.delete(id));
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
  let response;
  try {
    response = await fetch(config.url + path, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    console.error('Falló la conexión con Supabase.', error);
    const connectionError = new Error(navigator.onLine
      ? 'No se pudo conectar con el servicio. Verifica internet, la disponibilidad del servidor y CORS; vuelve a intentarlo.'
      : 'Sin conexión a internet. Conéctate y vuelve a intentarlo.');
    connectionError.connectionFailure = true;
    throw connectionError;
  }
  const text = await response.text();
  let result = null;
  if (text) {
    try { result = JSON.parse(text); }
    catch { throw new Error('Supabase devolvió una respuesta no válida.'); }
  }
  if (!response.ok) {
    let message = result && (result.msg || result.message || result.error_description || result.hint) ||
      'La solicitud al espacio compartido falló (' + response.status + ').';
    if (response.status === 401 && !path.startsWith('/auth/')) message = 'La sesión no es válida o expiró. Vuelve a iniciar sesión.';
    if (response.status === 403) message = 'La cuenta no tiene permisos para esta operación.';
    if (response.status === 404 && path.startsWith('/functions/v1/')) message = 'El servicio de usuarios no está desplegado. Contacta al administrador del sistema.';
    const error = new Error(message);
    error.httpStatus = response.status;
    throw error;
  }
  return result;
}
function saveAuthSession(session) {
  state.authSession = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function normalizeProfile(profile) {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    displayName: profile.display_name,
    role: profile.role,
    status: profile.status,
    allowedZones: normalizeZoneList(profile.allowed_zones)
  };
}
function normalizeZoneValue(value) {
  return String(value == null ? '' : value).trim();
}
function normalizeZoneList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => normalizeZoneValue(value)).filter(Boolean))];
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
async function syncWeeklyVisitOutbox(user) {
  const groups = (await getWeeklyVisitOutbox()).filter(group => group.userId === user.id && group.status === 'pending');
  let uploaded = 0;
  let conflicts = 0;
  for (const group of groups) {
    if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la sincronización.');
    if (group.scope !== offlineSnapshotKey('scope', user)) {
      group.status = 'conflict';
      group.error = 'Cambió el perfil o las zonas autorizadas. Revisa esta visita antes de reintentar.';
      await writeWeeklyVisitOutbox(group, 'put');
      conflicts++;
      continue;
    }
    try {
      const saved = await cloudRequest('rpc/save_lot_visit_captures', {
        method: 'POST', body: { p_captures: group.captures }
      });
      if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la sincronización.');
      if (!Array.isArray(saved) || saved.length !== group.captures.length ||
          saved.some((id, index) => id !== group.captures[index].record_id)) {
        throw new Error('La respuesta del servidor no confirma todas las visitas del grupo.');
      }
      await writeWeeklyVisitOutbox(group, 'delete');
      uploaded += group.captures.length;
    } catch (error) {
      if (!sameOfflineScope(user) || error.connectionFailure || error.httpStatus >= 500 || !error.httpStatus) throw error;
      group.status = 'conflict';
      group.error = error.message || 'El servidor rechazó el grupo de visitas.';
      await writeWeeklyVisitOutbox(group, 'put');
      conflicts++;
    }
  }
  return { uploaded, conflicts };
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
  if (state.flightActivityLaborBusy) {
    if (importLegacy) throw new Error('Espera a que termine la actualización de la labor de la actividad antes de importar.');
    state.syncRequested = true;
    return { uploaded: 0, downloaded: 0 };
  }
  if (state.syncBusy) {
    if (importLegacy) throw new Error('La sincronización ya está en curso. Intenta de nuevo en unos segundos.');
    state.syncRequested = true;
    return { uploaded: 0, downloaded: 0 };
  }
  state.syncBusy = true;
  state.syncRequested = false;
  const syncUser = { ...state.user, allowedZones: [...(state.user.allowedZones || [])] };
  try {
    const profile = await fetchProfile(syncUser.id);
    if (!sameOfflineScope(syncUser)) throw new Error('Cambió la cuenta o sus permisos durante la sincronización.');
    if (profile.status !== syncUser.status || profile.username !== syncUser.username ||
        offlineSnapshotKey('scope', profile) !== offlineSnapshotKey('scope', syncUser)) {
      await startSession(profile, state.authSession);
      throw new Error('Cambió el perfil o sus permisos. Se actualizó el acceso de esta cuenta.');
    }
    const weeklyResult = await syncWeeklyVisitOutbox(syncUser);
    let records = await getRecords();
    let deleted = 0;
    const queuedDeletions = records.filter(record =>
      record.syncStatus === 'delete-pending' &&
      (record.ownerId === syncUser.id || (!record.ownerId && record.ownerUsername === syncUser.username) || isActiveAdmin())
    );
    for (const record of queuedDeletions) {
      if (!sameOfflineScope(syncUser)) throw new Error('Cambió la cuenta o sus permisos durante la sincronización.');
      await cloudRequest('rpc/delete_field_record', {
        method: 'POST',
        body: { p_record_id: record.id }
      });
      await deleteRecord(record.id);
      deleted += 1;
    }
    records = records.filter(record => record.syncStatus !== 'delete-pending');
    const outgoing = records.filter(record =>
      record.syncStatus === 'pending' &&
      (record.ownerId === syncUser.id || (!record.ownerId && record.ownerUsername === syncUser.username)) &&
      (record.syncOrigin === 'new' || (importLegacy && !record.syncOrigin))
    );
    for (const record of outgoing) {
      if (!sameOfflineScope(syncUser)) throw new Error('Cambió la cuenta o sus permisos durante la sincronización.');
      const inserted = await cloudRequest('field_records?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: {
          id: record.id,
          owner_id: syncUser.id,
          tipo: record.tipo,
          schema_version: record.schemaVersion || 1,
          datos: record.datos
        }
      });
      if (!Array.isArray(inserted)) throw new Error('No se pudo confirmar la captura enviada.');
      if (!inserted.length) {
        if (!sameOfflineScope(syncUser)) throw new Error('Cambió la cuenta o sus permisos durante la sincronización.');
        const existing = await cloudRequest('field_records?select=id,owner_id,tipo,datos&id=eq.' + encodeURIComponent(record.id) + '&limit=1');
        if (!Array.isArray(existing) || existing.length !== 1 || existing[0].owner_id !== syncUser.id ||
          existing[0].tipo !== record.tipo ||
          JSON.stringify(canonicalJson(existing[0].datos)) !== JSON.stringify(canonicalJson(record.datos))) {
          throw new Error('La captura pendiente coincide con un registro diferente en el servidor. Revísala antes de sincronizar.');
        }
      }
      if (await acknowledgeUploadedRecord(record)) state.syncRequested = true;
    }

    const activityLaborUpdates = records.filter(record =>
      record.syncStatus === 'pending' &&
      record.syncOrigin === 'activity-update' &&
      (record.ownerId === syncUser.id || (!record.ownerId && record.ownerUsername === syncUser.username) || isActiveAdmin())
    );
    for (const record of activityLaborUpdates) {
      if (!sameOfflineScope(syncUser)) throw new Error('Cambió la cuenta o sus permisos durante la sincronización.');
      await cloudRequest('rpc/update_field_record', {
        method: 'POST',
        body: { p_record_id: record.id, p_schema_version: record.schemaVersion || 1, p_datos: record.datos }
      });
      if (await acknowledgeUploadedRecord(record)) state.syncRequested = true;
    }

    const snapshotId = offlineSnapshotKey('record-sync', syncUser);
    const previous = await getOfflineSnapshot(snapshotId);
    let cursor = previous && validSyncCursor(previous.cursor) && Array.isArray(previous.knownIds) &&
      previous.knownIds.every(id => typeof id === 'string') &&
      new Set(previous.knownIds).size === previous.knownIds.length ? previous.cursor : null;
    let delta = await fetchCloudRecordDelta(cursor);
    try {
      await reconcileCloudRecords(delta.records.map(mapCloudRecord), syncUser, delta.ids, {
        id: snapshotId, cursor: delta.cursor, previousIds: previous && previous.knownIds || [], full: delta.full
      });
    } catch (error) {
      if (!error.needsFullSync || cursor === null) throw error;
      cursor = null;
      delta = await fetchCloudRecordDelta(null);
      await reconcileCloudRecords(delta.records.map(mapCloudRecord), syncUser, delta.ids, {
        id: snapshotId, cursor: delta.cursor, previousIds: [], full: true
      });
    }
    state.syncConnected = true;
    updateConnection();
    await refreshLists();
    if (!$('#page-clima-grafica').hidden) void loadClimateChart();
    if (!$('#page-variacion-vuelo').hidden) void loadFlightVariation();
    if ((weeklyResult.uploaded || weeklyResult.conflicts) &&
      (!$('#page-seguimiento-lotes').hidden || !$('#page-programacion-semanal').hidden)) {
      loadLotFollowup().catch(handleLotFollowupError);
    }
    if (weeklyResult.conflicts) toast('Hay visitas con conflictos. Revísalas en Pendientes.');
    return { uploaded: outgoing.length, updated: activityLaborUpdates.length, downloaded: delta.records.length, deleted,
      weeklyUploaded: weeklyResult.uploaded, weeklyConflicts: weeklyResult.conflicts };
  } finally {
    state.syncBusy = false;
    const waiters = state.syncIdleWaiters.splice(0);
    for (const resolve of waiters) resolve();
    if (state.syncRequested && !state.flightActivityLaborBusy && navigator.onLine) {
      Promise.resolve().then(() => syncCloudRecords(false)).catch(handleCloudError);
    }
  }
}
function waitForSyncIdle() {
  if (!state.syncBusy) return Promise.resolve();
  return new Promise(resolve => state.syncIdleWaiters.push(resolve));
}
async function applyFlightActivityLabor(contextId, labor, ownerId, ownerUsername) {
  if (!String(contextId || '').trim() || !String(labor || '').trim()) {
    return { ok: true, updated: 0, pending: false };
  }
  while (state.syncBusy) await waitForSyncIdle();
  state.flightActivityLaborBusy = true;
  let updates = [];
  let updateError = null;
  try {
    updates = flightActivityLaborUpdates(await getRecords(), contextId, labor, ownerId, ownerUsername);
    if (updates.length) await putRecords(updates);
  } catch (error) {
    updateError = error;
  } finally {
    state.flightActivityLaborBusy = false;
  }

  if (state.syncRequested && state.configured && navigator.onLine) {
    try {
      await syncCloudRecords(false);
    } catch (error) {
      handleCloudError(error);
    }
  } else if (!updateError && updates.length && state.configured && navigator.onLine) {
    try {
      await syncCloudRecords(false);
    } catch (error) {
      handleCloudError(error);
    }
  }
  if (updateError) {
    console.error('No se pudo actualizar la labor de los vuelos relacionados.', updateError);
    toast('No se pudo actualizar la labor de todos los vuelos de la actividad. Inténtalo de nuevo.');
    return { ok: false, updated: updates.length, pending: true, error: updateError };
  }

  await refreshLists();
  const updatedIds = new Set(updates.map(record => record.id));
  const localRecords = await getRecords();
  const pending = localRecords.some(record => updatedIds.has(record.id) && record.syncStatus === 'pending');
  return { ok: true, updated: updates.length, pending };
}
function queueFlightActivityLaborUpdate(contextId, labor, ownerId, ownerUsername) {
  const previous = state.flightActivityLaborQueue || Promise.resolve();
  const update = previous.catch(error => {
    console.error('Falló una actualización anterior de la labor de Vuelos.', error);
  }).then(() => applyFlightActivityLabor(contextId, labor, ownerId, ownerUsername));
  const handled = update.catch(error => {
    console.error('No se pudo completar la actualización de la labor de Vuelos.', error);
    toast('No se pudo actualizar la labor de los vuelos relacionados. Inténtalo de nuevo.');
    return { ok: false, updated: 0, pending: true, error };
  });
  state.flightActivityLaborQueue = handled;
  state.flightActivityLaborUpdatePromise = handled;
  return handled;
}
function flightActivityLaborMessage(result) {
  if (!result || !result.updated) return 'Labor guardada para los siguientes vuelos de esta actividad.';
  if (result.pending) {
    return 'Labor actualizada localmente en ' + result.updated + ' vuelo(s); se sincronizará al recuperar conexión.';
  }
  return 'Labor actualizada en ' + result.updated + ' vuelo(s) de esta actividad.';
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
function canAccessLotFollowup() {
  return !!state.user && state.user.status === 'active' && ['admin', 'supervisor'].includes(state.user.role);
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
  const multiple = field.multiple && field.type === 'file' ? ' multiple' : '';
  const readonly = field.readonly ? ' readonly' : '';
  let control = '';
  if (field.lotLookup) {
    const lots = Object.entries(state.lotLookup)
      .filter(([lot]) => /^\d{7}$/.test(lot))
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([lot]) => '<option value="' + esc(lot) + '"></option>')
      .join('');
    const listId = id + '-options';
    const placeholder = field.placeholder || 'Ingresa los 7 dígitos del lote';
    control = '<input id="' + esc(id) + '"' + fieldAttributes + ' class="text-input" type="text"' + required +
      ' minlength="7" maxlength="7" pattern="[0-9]{7}" inputmode="numeric" autocomplete="off" list="' + esc(listId) +
      '" placeholder="' + esc(placeholder) + '" title="Ingresa exactamente los 7 dígitos del lote">' +
      '<datalist id="' + esc(listId) + '">' + lots + '</datalist>';
  } else if (field.type === 'select') {
    control = '<select id="' + esc(id) + '"' + fieldAttributes + ' class="select-input"' + required + '><option value="">Selecciona</option>' + (field.options || []).map(option => '<option value="' + esc(option.value == null ? option : option.value) + '">' + esc(option.label == null ? option : option.label) + '</option>').join('') + '</select>';
  } else if (field.type === 'textarea') {
    control = '<textarea id="' + esc(id) + '"' + fieldAttributes + ' class="text-area"' + required + '></textarea>';
  } else {
    const type = field.type || 'text';
    const inputMode = type === 'number' ? ' inputmode="decimal"' : '';
    const value = field.value != null ? ' value="' + esc(field.value) + '"' : '';
    const placeholder = field.calculated ? ' placeholder="Resultado de la hoja; fórmula pendiente de confirmar"' : field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '';
    control = '<input id="' + esc(id) + '" type="' + esc(type) + '"' + fieldAttributes + ' class="text-input"' + required + step + min + max + accept + multiple + inputMode + value + placeholder + readonly + '>';
  }
  const hint = field.calculated ? '<div class="field-hint">Campo calculado en AppSheet; queda capturable hasta validar su fórmula.</div>' : field.hint ? '<div class="field-hint">' + esc(field.hint) + '</div>' : field.lotLookup ? '<div class="field-hint">Ingresa los 7 dígitos o selecciónalos de la lista; finca y zona se completan automáticamente.</div>' : '';
  return '<div class="field' + (field.full ? ' full' : '') + '"><label class="field-label" for="' + esc(id) + '">' + esc(field.label) + (field.required ? ' *' : '') + '</label>' + control + hint + '</div>';
}
function workContextControls(moduleKey) {
  if (state.editingRecord) return '';
  const title = moduleKey === 'vuelos' ? 'Contexto de jornada' : 'Contexto de trabajo';
  return '<section class="form-section work-context-section"><div class="work-context-copy"><h2>' + title +
    '</h2><p class="field-hint" data-work-context-status="' + moduleKey + '" role="status" aria-live="polite">Los cambios se guardan automáticamente en este dispositivo y se recuperan al volver.</p></div>' +
    '<div class="work-context-actions"><button class="secondary-button" data-save-work-context="' + moduleKey +
    '" type="button">Guardar contexto</button><button class="secondary-button" data-new-work-context="' + moduleKey +
    '" type="button">Nuevo contexto</button></div></section>';
}
function commonFields(withLotLookup, options) {
  const lotLookup = !!withLotLookup;
  const includeRecordTime = !options || options.includeRecordTime !== false;
  const extraFields = options && options.extraFields ? options.extraFields : '';
  const farmOptions = [...new Set(Object.values(state.lotLookup).map(location => location.finca).filter(Boolean))].sort();
  const recordTimeField = includeRecordTime
    ? '<div class="field"><label class="field-label" for="f-recorded-at">Hora de registro (automática)</label><input id="f-recorded-at" name="hora_registro" class="text-input" type="time" value="' + localTime() + '" readonly><div class="field-hint">Solo se registra la hora; la fecha se captura por separado.</div></div>'
    : '<div class="field"><div class="calc-readout">Hora de captura <strong>Se asigna al guardar cada vuelo</strong></div></div>';
  return '<section class="form-section"><h2>Datos de la actividad</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Fecha', name: 'fecha', type: 'date', value: localDate(), required: true }, 'f-date', true) +
    fieldMarkup({ label: 'Responsable', name: 'responsable', value: state.user.displayName, required: true }, 'f-user', true) +
    (!lotLookup ? fieldMarkup({ label: 'Lote', name: 'lote', lotLookup: true, required: true }, 'f-lot', true) : '') +
    fieldMarkup({ label: 'Zona', name: 'zona', placeholder: 'Se completa al ingresar un lote', locationTarget: 'zona', farmZoneTarget: true }, 'f-zone', true) +
    fieldMarkup({ label: 'Finca', name: 'finca', type: lotLookup ? 'text' : 'select', required: true, placeholder: lotLookup ? 'Se completa al ingresar un lote' : undefined, locationTarget: 'finca', farmSelector: true, options: lotLookup ? undefined : farmOptions }, 'f-farm', true) +
    '<div class="field full"><div class="field-hint" data-lot-location-status role="status">Ingresa un lote para completar finca y zona.</div></div>' +
    '<div class="field full"><div class="field-hint" data-farm-zone-status role="status"></div></div>' +
    recordTimeField + extraFields +
    '</div></section>';
}

function clearAutoLocation(targets) {
  for (const target of Object.values(targets)) {
    if (!target) continue;
    if (target.dataset.autofilledValue !== undefined && target.value === target.dataset.autofilledValue) target.value = '';
    delete target.dataset.autofilledValue;
  }
}

async function updateLotLocations(form, refreshMissing) {
  if (!form) return false;
  const targets = {
    finca: form.querySelector('[data-location-target="finca"]'),
    zona: form.querySelector('[data-location-target="zona"]')
  };
  const status = form.querySelector('[data-lot-location-status]');
  if (!targets.finca || !targets.zona || !status) return false;
  const readLots = () => [...form.querySelectorAll('[data-lot-lookup]')]
    .map(input => String(input.value || '').trim())
    .filter(Boolean);
  const lots = readLots();
  if (!lots.length) {
    clearAutoLocation(targets);
    status.textContent = 'Ingresa un lote para completar finca y zona.';
    return true;
  }
  const invalidLot = lots.find(lot => !/^\d{7}$/.test(lot));
  if (invalidLot) {
    clearAutoLocation(targets);
    status.textContent = 'Ingresa exactamente los 7 dígitos del lote.';
    return false;
  }
  let matches = lots.map(lot => ({ lot, location: state.lotLookup[lot] || null }));
  let missingLots = [...new Set(matches.filter(match => !match.location).map(match => match.lot))];
  if (missingLots.length && refreshMissing && navigator.onLine) {
    status.textContent = 'Verificando el lote en la lista autorizada...';
    try {
      await Promise.all(missingLots.map(refreshLotLookupEntry));
    } catch (error) {
      console.warn('No se pudo verificar el lote en la lista autorizada.', error);
      if (readLots().join('\u0000') === lots.join('\u0000')) {
        clearAutoLocation(targets);
        status.textContent = 'No se pudo comprobar el lote. Verifica tu conexión e inténtalo de nuevo.';
      }
      return null;
    }
    if (readLots().join('\u0000') !== lots.join('\u0000')) return false;
    matches = lots.map(lot => ({ lot, location: state.lotLookup[lot] || null }));
    missingLots = [...new Set(matches.filter(match => !match.location).map(match => match.lot))];
  }
  if (missingLots.length) {
    clearAutoLocation(targets);
    status.textContent = !navigator.onLine
      ? 'Sin conexión: no se pudo comprobar el lote ' + missingLots[0] + ' en la lista guardada.'
      : 'El lote ' + missingLots[0] + ' no está disponible para esta cuenta; verifica el código y la zona asignada.';
    return false;
  }
  const locations = new Map(matches.map(match => [match.location.zona + '|' + match.location.finca, match.location]));
  if (locations.size !== 1) {
    clearAutoLocation(targets);
    status.textContent = 'Los lotes ingresados corresponden a varias fincas o zonas; no se completó una ubicación única.';
    return true;
  }
  const location = locations.values().next().value;
  targets.finca.value = location.finca;
  targets.zona.value = location.zona;
  targets.finca.dataset.autofilledValue = location.finca;
  targets.zona.dataset.autofilledValue = location.zona;
  status.textContent = 'Ubicación encontrada: finca ' + location.finca + ' · zona ' + location.zona + '.';
  return true;
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
  return workContextControls('clima') + commonFields(true) + '<section class="form-section"><h2>Datos del lote</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Lote', name: 'lote', lotLookup: true, required: true }, 'climate-lot', true) +
    '</div></section><section class="form-section"><h2>Ubicación</h2><div class="field-grid"><div class="field full"><label class="field-label" for="f-location">Coordenadas GPS (automáticas)</label><input id="f-location" name="ubicacion" class="text-input" placeholder="Solicitando ubicación…" readonly><input id="f-location-lat" name="latitud" type="hidden"><input id="f-location-lon" name="longitud" type="hidden"><input id="f-location-accuracy" name="precision_gps_m" type="hidden"><div class="location-controls"><span id="location-status" class="field-hint" role="status">Solicitando ubicación del dispositivo…</span><button id="retry-location" class="add-row" type="button">Actualizar ubicación</button></div></div></div></section>' +
    '<section class="form-section"><h2>Lecturas de clima</h2><p class="field-hint">Añade una fila por medición. Unidades: °C, %, km/h y °C para Delta T.</p><div id="weather-rows"></div><div class="inline-actions"><button id="add-weather" class="add-row" type="button">＋ Agregar lectura</button></div></section>';
}
function weedsFields(prefix) {
  prefix = prefix || '';
  const farmOptions = [...new Set(Object.values(state.lotLookup).map(location => location.finca).filter(Boolean))].sort();
  return '<section class="form-section"><h2>Visita de malezas</h2><p class="field-hint">Campos de la tabla Visita Malezas. El ID se genera al guardar la captura.</p><div class="field-grid">' +
    fieldMarkup({ label: 'FECHA', name: 'FECHA', type: 'date', value: localDate(), required: true }, prefix + 'weeds-date', true) +
    fieldMarkup({ label: 'UBICACIÓN', name: 'UBICACIÓN', placeholder: 'Latitud, longitud', hint: 'Se solicitará el GPS al abrir el formulario; puedes editar las coordenadas.' }, prefix + 'weeds-location', true) +
    '<div class="field full"><div class="location-controls"><span id="' + prefix + 'weeds-location-status" data-weeds-location-status class="field-hint" role="status">Esperando permiso de ubicación…</span><button id="' + prefix + 'weeds-retry-location" data-weeds-retry-location class="add-row" type="button">Actualizar ubicación</button></div></div>' +
    fieldMarkup({ label: 'RESPONSABLE', name: 'RESPONSABLE', value: state.user.displayName }, prefix + 'weeds-owner', true) +
    fieldMarkup({ label: 'ZONA', name: 'ZONA', placeholder: 'Se completa al seleccionar la finca', locationTarget: 'zona', farmZoneTarget: true }, prefix + 'weeds-zone', true) +
    fieldMarkup({ label: 'FINCA', name: 'FINCA', type: 'select', locationTarget: 'finca', farmSelector: true, options: farmOptions }, prefix + 'weeds-farm', true) +
    '<div class="field full"><div class="field-hint" data-farm-zone-status role="status">Selecciona una finca para completar la zona.</div></div><div class="field full"><div class="field-hint" data-lot-location-status role="status">Ingresa un lote para completar finca y zona.</div></div></div></section><section class="form-section"><h2>Datos Malezas por lote</h2><p class="field-hint">Puedes agregar un detalle por cada lote visitado. Los registros quedan vinculados a esta visita en la captura local.</p>' +
    repeatSection('malezas_detalle', 'Detalle de malezas', 'Agregar lote', 'Incluye lote, labor (Plantilla o Soca), porcentajes de control y cobertura, imágenes, catorcena automática y observaciones.') + '</section>';
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
const flightLitersPerHaByLabor = Object.freeze({
  Madurante: 14,
  Premadurante: 20,
  Descecante: 20,
  Bioestimulante: 14,
  'Agro K': 10,
  Kelatex: 10,
  Ensayo_20: 20,
  Ensayo_14: 14,
  Madurante_20: 20,
  Madurante_25: 25,
  Madurante_30: 30
});
function flightNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function calculateFlightMetrics(labor, appliedLiters, appliedArea) {
  const applicationVolumeLitersPerHa = Object.prototype.hasOwnProperty.call(flightLitersPerHaByLabor, labor)
    ? flightLitersPerHaByLabor[labor]
    : null;
  const liters = flightNumber(appliedLiters);
  const area = flightNumber(appliedArea);
  const validApplication = liters !== null && liters >= 0 && area !== null && area > 0;
  const appliedLitersPerHa = validApplication ? liters / area : null;
  const validAppliedVolume = Number.isFinite(appliedLitersPerHa);
  const variationPercent = validAppliedVolume && applicationVolumeLitersPerHa !== null
    ? (appliedLitersPerHa / applicationVolumeLitersPerHa - 1) * 100
    : null;
  return {
    applicationVolumeLitersPerHa,
    appliedLitersPerHa: validAppliedVolume ? appliedLitersPerHa : null,
    variationPercent: Number.isFinite(variationPercent) ? variationPercent : null
  };
}
function formatFlightVariationPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return (value > 0 ? '+' : '') + value.toFixed(1) + '%';
}
function updateFlightMetricsReadouts() {
  const fields = $('#form-fields');
  const laborInput = $('[name="labor"]', fields);
  const litersInput = $('[name="litros"]', fields);
  const areaInput = $('[name="area_ha"]', fields);
  const applicationVolumeOutput = $('#application-volume-output', fields);
  const realVolumeOutput = $('#real-volume-output', fields);
  const variationOutput = $('#variation-output', fields);
  if (!laborInput || !litersInput || !areaInput ||
      !applicationVolumeOutput || !realVolumeOutput || !variationOutput) return;

  const metrics = calculateFlightMetrics(laborInput.value, litersInput.value, areaInput.value);
  applicationVolumeOutput.textContent = metrics.applicationVolumeLitersPerHa == null
    ? (laborInput.value ? 'Sin volumen configurado' : '— L/ha')
    : metrics.applicationVolumeLitersPerHa + ' L/ha';
  realVolumeOutput.textContent = metrics.appliedLitersPerHa == null
    ? '— L/ha'
    : metrics.appliedLitersPerHa.toFixed(2) + ' L/ha';
  variationOutput.textContent = formatFlightVariationPercent(metrics.variationPercent);
}
const FLIGHT_REPORT_DRONES = [
  'T40-1',
  'T50-1', 'T50-2', 'T50-3', 'T50-4',
  'T100-1', 'T100-2', 'T100-3', 'T100-4'
];
const FLIGHT_REPORT_MISSING_FILTER = '__sin_dato__';
const flightReportFieldAliases = Object.freeze({
  fecha: ['fecha', 'FECHA'],
  finca: ['finca', 'FINCA'],
  zona: ['zona', 'ZONA', 'zone', 'ZONE'],
  labor: ['labor', 'LABOR'],
  dron: ['dron', 'DRON'],
  area_ha: ['area_ha', 'AREA_HA'],
  litros: ['litros', 'LITROS']
});
function flightReportValue(record, field) {
  const data = record && record.datos && typeof record.datos === 'object' && !Array.isArray(record.datos)
    ? record.datos
    : {};
  for (const key of flightReportFieldAliases[field] || []) {
    const value = data[key];
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}
function flightReportDate(value) {
  const date = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const time = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : '';
}
function flightReportNormalize(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}
function flightRecordOwnerKey(record) {
  return record.ownerId ? 'id:' + record.ownerId : record.ownerUsername ? 'username:' + record.ownerUsername : '';
}
function flightRecordBelongsToUser(record, user) {
  if (!record || !user) return false;
  return record.ownerId ? record.ownerId === user.id : !!record.ownerUsername && record.ownerUsername === user.username;
}
function flightVariationScopedRecords(records, user) {
  if (!user || user.status !== 'active') return [];
  return records.filter(record => record && record.tipo === 'vuelos' && record.syncStatus !== 'delete-pending' &&
    (user.role === 'admin' || flightRecordBelongsToUser(record, user)));
}
function flightReportFilterOptions(records, field) {
  const values = new Map();
  let hasMissing = false;
  for (const record of records) {
    if (!record || record.tipo !== 'vuelos') continue;
    const value = flightReportValue(record, field);
    if (!value) {
      hasMissing = true;
      continue;
    }
    const normalized = flightReportNormalize(value);
    if (!values.has(normalized)) values.set(normalized, value);
  }
  const options = [...values.values()]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map(value => ({ value, label: value }));
  if (hasMissing) {
    const label = field === 'finca' ? 'Sin finca' : field === 'zona' ? 'Sin zona' : 'Sin labor';
    options.push({ value: FLIGHT_REPORT_MISSING_FILTER, label });
  }
  return options;
}
function flightReportData(records, filters) {
  const selected = filters || {};
  const fromValue = String(selected.from || '').trim();
  const toValue = String(selected.to || '').trim();
  const from = fromValue ? flightReportDate(fromValue) : '';
  const to = toValue ? flightReportDate(toValue) : '';
  const invalidDateRange = (fromValue && !from) || (toValue && !to) || (from && to && from > to);
  const sourceRecords = (Array.isArray(records) ? records : []).filter(record => record && record.tipo === 'vuelos');
  const groups = new Map(FLIGHT_REPORT_DRONES.map(drone => [drone, {
    drone, flights: 0, hectares: 0, liters: 0, incompleteFlights: 0, records: []
  }]));
  const totals = {
    flights: 0,
    hectares: 0,
    liters: 0,
    incompleteFlights: 0,
    invalidAreaRecords: 0,
    invalidLitersRecords: 0,
    missingDateIncluded: 0,
    missingDateExcluded: 0
  };
  if (!invalidDateRange) {
    for (const record of sourceRecords) {
      if (selected.owner && flightRecordOwnerKey(record) !== selected.owner) continue;
      const finca = flightReportValue(record, 'finca');
      const zona = flightReportValue(record, 'zona');
      const labor = flightReportValue(record, 'labor');
      const matchesFilter = (value, filter) => !filter ||
        (filter === FLIGHT_REPORT_MISSING_FILTER
          ? !value
          : flightReportNormalize(value) === flightReportNormalize(filter));
      if (!matchesFilter(finca, selected.finca) ||
          !matchesFilter(zona, selected.zona) ||
          !matchesFilter(labor, selected.labor)) continue;

      const date = flightReportDate(flightReportValue(record, 'fecha'));
      if (from || to) {
        if (!date) {
          totals.missingDateExcluded += 1;
          continue;
        }
        if ((from && date < from) || (to && date > to)) continue;
      } else if (!date) {
        totals.missingDateIncluded += 1;
      }

      const drone = flightReportValue(record, 'dron') || 'Sin identificar';
      if (!groups.has(drone)) {
        groups.set(drone, { drone, flights: 0, hectares: 0, liters: 0, incompleteFlights: 0, records: [] });
      }
      const group = groups.get(drone);
      group.records.push(record);
      const area = flightNumber(flightReportValue(record, 'area_ha'));
      const liters = flightNumber(flightReportValue(record, 'litros'));
      let validArea = area !== null && area >= 0;
      let validLiters = liters !== null && liters >= 0;

      group.flights += 1;
      totals.flights += 1;
      if (validArea) {
        const groupTotal = group.hectares + area;
        const reportTotal = totals.hectares + area;
        if (Number.isFinite(groupTotal) && Number.isFinite(reportTotal)) {
          group.hectares = groupTotal;
          totals.hectares = reportTotal;
        } else {
          validArea = false;
        }
      }
      if (!validArea) totals.invalidAreaRecords += 1;
      if (validLiters) {
        const groupTotal = group.liters + liters;
        const reportTotal = totals.liters + liters;
        if (Number.isFinite(groupTotal) && Number.isFinite(reportTotal)) {
          group.liters = groupTotal;
          totals.liters = reportTotal;
        } else {
          validLiters = false;
        }
      }
      if (!validLiters) totals.invalidLitersRecords += 1;
      if (!validArea || !validLiters) {
        group.incompleteFlights += 1;
        totals.incompleteFlights += 1;
      }
    }
  }
  const otherDrones = [...groups.keys()]
    .filter(drone => !FLIGHT_REPORT_DRONES.includes(drone) && drone !== 'Sin identificar')
    .sort((a, b) => a.localeCompare(b, 'es'));
  const orderedDrones = [...FLIGHT_REPORT_DRONES, ...otherDrones];
  if (groups.has('Sin identificar')) orderedDrones.push('Sin identificar');
  return {
    invalidDateRange: !!invalidDateRange,
    sourceRecordCount: sourceRecords.length,
    rows: orderedDrones.map(drone => groups.get(drone)),
    totals
  };
}
function formatFlightReportNumber(value) {
  return Number.isFinite(value)
    ? value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
}
function flightFields() {
  const laborOptions = Object.keys(flightLitersPerHaByLabor);
  laborOptions.push({ value: 'Control de malezas', label: 'Control de malezas (sin volumen configurado)' });
  const legacyLabor = state.editingRecord && state.editingRecord.tipo === 'vuelos' &&
    state.editingRecord.datos && state.editingRecord.datos.labor;
  const hasLegacyLaborOption = laborOptions.some(option =>
    (typeof option === 'string' ? option : option.value) === legacyLabor);
  if (legacyLabor && !hasLegacyLaborOption) {
    laborOptions.unshift({ value: legacyLabor, label: legacyLabor + ' (sin volumen configurado)' });
  }
  const droneOptions = FLIGHT_REPORT_DRONES.slice();
  const legacyDrone = state.editingRecord && state.editingRecord.tipo === 'vuelos' &&
    state.editingRecord.datos && String(state.editingRecord.datos.dron || '').trim();
  if (legacyDrone && !droneOptions.includes(legacyDrone)) {
    droneOptions.unshift({ value: legacyDrone, label: legacyDrone + ' (guardado en esta captura)' });
  }
  const activityLaborField = fieldMarkup({
    label: 'Labor de la actividad',
    name: 'labor',
    type: 'select',
    required: true,
    options: laborOptions,
    hint: 'La labor se asigna a todos los vuelos de esta actividad. Si la cambias, se actualizan los vuelos guardados.'
  }, 'f-labor', true);
  return '<section class="form-section flight-report-launch"><div><h2>Consulta de vuelos cargados</h2><p class="field-hint">Filtra las capturas por fechas, finca, zona y labor; consulta los totales o imprime un PDF acumulado.</p></div><button id="open-flight-report" class="secondary-button" data-open-flight-report type="button">Resumen y PDF acumulado</button></section>' +
    workContextControls('vuelos') + commonFields(false, { includeRecordTime: false, extraFields: activityLaborField }) +
    '<input type="hidden" name="contexto_vuelos_id" id="flight-context-id">' +
    '<section class="form-section"><h2>Datos del vuelo</h2><p class="field-hint">Cada guardado crea un registro independiente con la labor definida en la actividad. La fecha, finca, lote, zona, responsable y labor se conservan para agregar vuelos a esta jornada.</p><div class="field-grid">' +
    fieldMarkup({ label: 'Dron', name: 'dron', type: 'select', options: droneOptions }, 'f-drone', true) +
    fieldMarkup({ label: 'Área aplicada (ha)', name: 'area_ha', type: 'number', min: '0.01', step: '0.01', required: true }, 'f-area', true) +
    fieldMarkup({ label: 'Litros aplicados (L)', name: 'litros', type: 'number', min: '0', step: '0.1', required: true }, 'f-liters', true) +
    '<div class="field"><div class="calc-readout">Volumen de aplicación <strong id="application-volume-output">— L/ha</strong></div></div>' +
    '<div class="field"><div class="calc-readout">Volumen real <strong id="real-volume-output">— L/ha</strong></div></div>' +
    '<div class="field full"><div class="calc-readout">Variación <strong id="variation-output">—</strong></div></div>' +
    fieldMarkup({ label: 'Observaciones', name: 'observaciones', type: 'textarea' }, 'f-notes', true) + '</div></section>';
}
function qualityFields() {
  return '<section class="form-section"><h2>Ubicación del lote</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Fecha de la visita', name: 'FECHA', type: 'date', value: localDate(), required: true }, 'quality-date', true) +
    fieldMarkup({ label: 'Lote', name: 'lote', lotLookup: true }, 'quality-lot', true) +
    fieldMarkup({ label: 'Finca', name: 'finca', placeholder: 'Se completa al ingresar un lote', locationTarget: 'finca' }, 'quality-farm', true) +
    fieldMarkup({ label: 'Zona', name: 'zona', placeholder: 'Se completa al ingresar un lote', locationTarget: 'zona' }, 'quality-zone', true) +
    '<div class="field full"><div class="field-hint" data-lot-location-status role="status">Ingresa un lote para completar finca y zona.</div></div></div></section>' +
    '<section class="form-section"><h2>Supervisión de calidad</h2><div class="field-grid">' +
    fieldMarkup({ label: 'Formulario', name: 'calidad_tipo', type: 'select', required: true, options: Object.entries(qualityForms).map(([value, form]) => ({ value, label: form.label })) }, 'quality-type', true) +
    '</div><div id="quality-details"><p class="field-hint">Selecciona F.C. Aguilón, F.C. Arranque o F.C. PC y PM para abrir sus campos originales.</p></div></section>';
}
function repeatSection(key, title, addLabel, note) {
  return '<section class="nested-section"><div class="nested-heading"><div><h3>' + esc(title) + '</h3><p class="field-hint">' + esc(note || 'Añade una fila por medición relacionada.') + '</p></div></div><div class="child-list" data-repeat-list="' + esc(key) + '"></div><button class="add-row" type="button" data-add-child="' + esc(key) + '">＋ ' + esc(addLabel || 'Agregar detalle') + '</button></section>';
}
function weedsCatorcenaForDate(value) {
  const dateValue = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const dateTime = Date.parse(dateValue + 'T00:00:00Z');
  if (!Number.isFinite(dateTime) || new Date(dateTime).toISOString().slice(0, 10) !== dateValue) return null;

  const dayMilliseconds = 24 * 60 * 60 * 1000;
  const periods = [
    { period: '30', start: '2025-10-20', end: '2026-10-18' },
    { period: '31', start: '2026-10-19', end: '2027-10-17' }
  ];
  for (const period of periods) {
    const start = Date.parse(period.start + 'T00:00:00Z');
    const end = Date.parse(period.end + 'T00:00:00Z');
    if (dateTime >= start && dateTime <= end) {
      return { period: period.period, number: Math.floor((dateTime - start) / dayMilliseconds / 14) + 1 };
    }
  }
  return null;
}
function updateWeedsCatorcena(row) {
  if (!row) return;
  const dateInput = row.querySelector('[data-child-field="FECHA"]');
  const catorcenaInput = row.querySelector('[data-child-field="CATORCENA"]');
  if (!dateInput || !catorcenaInput) return;
  const catorcena = weedsCatorcenaForDate(dateInput.value);
  catorcenaInput.value = catorcena ? String(catorcena.number) : '';
  const hint = catorcenaInput.closest('.field').querySelector('.field-hint');
  if (hint) {
    hint.textContent = catorcena
      ? 'Periodo ' + catorcena.period + ' · catorcena ' + catorcena.number + ' calculada por fecha.'
      : 'Sin catorcena: fecha fuera del calendario disponible (20/10/2025 al 17/10/2027).';
  }
}
function updateWeedsCoverage(row) {
  if (!row) return;
  const controlInput = row.querySelector('[data-child-field="% CONTROL"]');
  const coverageInput = row.querySelector('[data-child-field="% COBERTURA"]');
  if (!coverageInput) return;
  const coverage = malezasCoveragePercent(controlInput && controlInput.value);
  coverageInput.value = coverage == null ? '' : String(coverage);
}
function syncWeedsDetailDates(rows, dateValue) {
  for (const row of rows) {
    const dateInput = row.querySelector('[data-child-field="FECHA"]');
    if (!dateInput || dateInput.dataset.visitDateManual === 'true') continue;
    const linkedDate = dateInput.dataset.visitDateValue;
    if (linkedDate !== undefined && dateInput.value !== linkedDate) {
      delete dateInput.dataset.visitDateValue;
      dateInput.dataset.visitDateManual = 'true';
      continue;
    }
    if (linkedDate === undefined && dateInput.value) continue;
    dateInput.value = dateValue;
    dateInput.dataset.visitDateValue = dateValue;
    updateWeedsCatorcena(row);
  }
}
function updateWeedsDatesForInput(input, root) {
  if (input.matches('[name="FECHA"]')) {
    const list = $('[data-repeat-list="malezas_detalle"]', root || $('#form-fields'));
    if (list) syncWeedsDetailDates($$('.child-row', list), input.value);
    return;
  }
  if (!input.matches('[data-child-field="FECHA"]')) return;
  if (input.dataset.visitDateValue !== undefined && input.value !== input.dataset.visitDateValue) {
    delete input.dataset.visitDateValue;
    input.dataset.visitDateManual = 'true';
  }
  updateWeedsCatorcena(input.closest('.child-row'));
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
function childRowMarkup(key, index, prefix) {
  const fields = childSchemas[key] || [];
  const controls = fields.map(field => fieldMarkup(field, (prefix || '') + 'child-' + slug(key) + '-' + index, false)).join('');
  return '<div class="child-row"><div class="field-grid">' + controls + '</div><button type="button" class="remove-row" data-remove-child aria-label="Quitar detalle">Quitar detalle</button></div>';
}
function addChildRow(key) {
  const list = $('[data-repeat-list="' + key + '"]', $('#form-fields'));
  if (!list) return;
  list.insertAdjacentHTML('beforeend', childRowMarkup(key, list.children.length));
  if (key === 'malezas_detalle') {
    const row = list.lastElementChild;
    const visitDate = $('#form-fields [name="FECHA"]');
    const detailDate = row.querySelector('[data-child-field="FECHA"]');
    const controlInput = row.querySelector('[data-child-field="% CONTROL"]');
    if (controlInput) controlInput.addEventListener('input', () => updateWeedsCoverage(row));
    if (visitDate && detailDate) {
      detailDate.value = visitDate.value;
      detailDate.dataset.visitDateValue = visitDate.value;
    }
    updateWeedsCatorcena(row);
    updateWeedsCoverage(row);
  }
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
  const canEditExisting = state.editingRecord && state.editingRecord.tipo === key && canManageRecord(state.editingRecord);
  if (!module || (!userCanOpenModule(key) && !canEditExisting)) { toast('Este apartado no está disponible para tu perfil.'); return; }
  if (key === 'vuelos') state.flightActivityLaborUpdatePromise = null;
  state.currentModule = key;
  $('#form-title').textContent = module.title;
  $('#form-subtitle').textContent = module.subtitle;
  $('#module-picker').hidden = true;
  $('#capture-form').hidden = false;
  $('#form-fields').innerHTML = renderers[key]();
  const savedWorkContext = !state.editingRecord && WORK_CONTEXT_MODULES.includes(key)
    ? readWorkContextDraft(key)
    : null;
  if (state.recordTimeTimer) clearInterval(state.recordTimeTimer);
  state.recordTimeTimer = state.editingRecord || key === 'vuelos' ? null : setInterval(() => {
    const input = $('#f-recorded-at');
    if (input) input.value = localTime();
  }, 15000);
  if (key === 'clima') {
    const add = saveDraft => {
      const target = $('#weather-rows');
      target.insertAdjacentHTML('beforeend', rowMarkup('weather', $$('.repeat-row', target).length));
      if (saveDraft) saveWorkContextDraft('clima', false);
    };
    add(false);
    $('#add-weather').addEventListener('click', () => add(true));
    $('#weather-rows').addEventListener('click', event => {
      const removeButton = event.target.closest('.remove-row');
      if (!removeButton) return;
      removeButton.closest('.repeat-row').remove();
      saveWorkContextDraft('clima', false);
    });
    $('#retry-location').addEventListener('click', captureLocation);
  }
  if (key === 'malezas') {
    $('#weeds-retry-location').addEventListener('click', captureWeedsLocation);
    if (!state.editingRecord) captureWeedsLocation();
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
    if (!state.editingRecord) $('#capture-submit').textContent = 'Guardar vuelo';
    updateFlightMetricsReadouts();
  }
  if (savedWorkContext) {
    if (key === 'vuelos' && savedWorkContext.data.labor) {
      const laborInput = $('[name="labor"]', $('#form-fields'));
      const savedLabor = String(savedWorkContext.data.labor);
      if (laborInput && !Array.from(laborInput.options).some(option => option.value === savedLabor)) {
        const option = document.createElement('option');
        option.value = savedLabor;
        option.textContent = savedLabor + ' (guardada en esta actividad)';
        laborInput.appendChild(option);
      }
    }
    restoreWorkContextDraft(key, savedWorkContext);
    setWorkContextStatus(key, 'Contexto recuperado del dispositivo; los cambios continúan guardándose automáticamente.', false);
    if (key === 'clima') {
      const locationInput = $('[name="ubicacion"]', $('#form-fields'));
      $('#location-status').textContent = locationInput && locationInput.value
        ? 'Ubicación recuperada del contexto guardado.'
        : 'No hay ubicación guardada; pulsa “Actualizar ubicación” para capturarla.';
    }
    void updateLotLocations($('#form-fields'), false).then(() => {
      if (state.currentModule === key) saveWorkContextDraft(key, false);
    });
    if (key === 'vuelos') updateFlightMetricsReadouts();
  } else if (key === 'clima' && !state.editingRecord) {
    captureLocation();
  }
  if (key === 'vuelos' && !state.editingRecord) {
    const contextInput = $('[name="contexto_vuelos_id"]', $('#form-fields'));
    const laborInput = $('[name="labor"]', $('#form-fields'));
    if (contextInput && !contextInput.value) contextInput.value = crypto.randomUUID();
    if (laborInput) laborInput.dataset.activityLabor = laborInput.value;
    if (savedWorkContext && contextInput && laborInput && contextInput.value && laborInput.value) {
      state.flightActivityLaborUpdatePromise = queueFlightActivityLaborUpdate(
        contextInput.value,
        laborInput.value,
        state.user.id,
        state.user.username
      ).then(result => {
        if (state.currentModule === 'vuelos' && result.ok) {
          setWorkContextStatus('vuelos', flightActivityLaborMessage(result), false);
        }
        return result;
      });
    }
  }
  if (key === 'calibraciones_pcpm') $('#pcpm-labor').addEventListener('change', event => renderPcpmDetails(event.target.value));
  if (key === 'calibracion_aguilon') $('#ag-tipo-aguilon').addEventListener('change', event => renderAguilonDetails(event.target.value));
  $$('.picker-groups [data-module]').forEach(button => button.classList.toggle('selected', button.dataset.module === key));
  $('#capture-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function serializeForm(form, recordId, previousData, moduleKey) {
  moduleKey = moduleKey || state.currentModule;
  const attachment = file => new Promise((resolve, reject) => {
    if (!file || !file.name) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, mimeType: file.type, size: file.size, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
  const attachments = files => {
    const selected = Array.from(files || []);
    return selected.length ? Promise.all(selected.map(attachment)) : Promise.resolve(null);
  };
  const data = previousData && typeof previousData === 'object' && !Array.isArray(previousData)
    ? { ...previousData }
    : {};
  const multipleFiles = new Map($$('input[type="file"][multiple][name]', form).map(input => [input.name, input]));
  for (const [key, value] of new FormData(form).entries()) {
    if (multipleFiles.has(key)) continue;
    if (typeof File !== 'undefined' && value instanceof File) {
      data[key] = await attachment(value) || (previousData && previousData[key]) || null;
    } else {
      data[key] = value;
    }
  }
  for (const [key, input] of multipleFiles) {
    data[key] = await attachments(input.files) || (previousData && previousData[key]) || null;
  }
  if (moduleKey === 'clima') {
    data.lecturas = $$('.repeat-row', $('#weather-rows')).map(row =>
      Object.fromEntries($$('[name]', row).map(input => [input.name, input.value]))
    );
  }
  if (moduleKey === 'epp') {
    const attendance = $$('.attendance-count', $('#form-fields'));
    data.asistencia_por_funcion = Object.fromEntries(attendance.map(input => [input.dataset.function, Number(input.value) || 0]));
    data.asistencia_general = Object.values(data.asistencia_por_funcion).reduce((sum, count) => sum + count, 0);
    data.personas_completamente_equipadas_por_funcion = Object.fromEntries($$('.fully-equipped-count', $('#form-fields')).map(input => [input.dataset.function, Number(input.value) || 0]));
    data.personas_completamente_equipadas = Object.values(data.personas_completamente_equipadas_por_funcion).reduce((sum, count) => sum + count, 0);
    data.cumplimiento_epp_general_pct = data.asistencia_general > 0 ? (data.personas_completamente_equipadas / data.asistencia_general) * 100 : null;
    data.cumplimiento_epp_por_funcion = Object.fromEntries(eppFunctions.map(role => [role.key, Object.fromEntries($$('.epp-item-count', $('#form-fields')).filter(input => input.dataset.function === role.key).map(input => [input.dataset.item, Number(input.value) || 0]))]));
    data.personas_llegaron = Number(data.personas_llegaron) || 0;
  }
  if (moduleKey === 'vuelos') {
    const metrics = calculateFlightMetrics(data.labor, data.litros, data.area_ha);
    data.litros_por_hectarea_objetivo = metrics.applicationVolumeLitersPerHa;
    data.litros_por_hectarea = metrics.appliedLitersPerHa;
    data.variacion_porcentaje = metrics.variationPercent;
  }
  const oldSubrecords = previousData && previousData.subregistros &&
    typeof previousData.subregistros === 'object' && !Array.isArray(previousData.subregistros)
    ? previousData.subregistros
    : {};
  const subregistros = { ...oldSubrecords };
  for (const list of $$('[data-repeat-list]', form)) {
    const key = list.dataset.repeatList;
    if (key === 'malezas_detalle') $$('.child-row', list).forEach(updateWeedsCatorcena);
    const oldRows = Array.isArray(oldSubrecords[key]) ? oldSubrecords[key] : [];
    subregistros[key] = await Promise.all($$('.child-row', list).map(async (row, rowIndex) => {
      const originalIndex = Number(row.dataset.originalIndex);
      const oldRow = Number.isInteger(originalIndex) && originalIndex >= 0 ? oldRows[originalIndex] : null;
      const serialized = Object.fromEntries(await Promise.all($$('[data-child-field]', row).map(async input => {
        const value = input.type === 'file'
          ? await (input.multiple ? attachments(input.files) : attachment(input.files && input.files[0]))
          : input.value;
        const previousValue = oldRow && oldRow[input.dataset.childField];
        return [
          input.dataset.childField,
          input.type === 'file' ? value || previousValue || null : value
        ];
      })));
      if (key === 'malezas_detalle') {
        serialized.ID = oldRow && oldRow.ID || row.dataset.generatedId || (row.dataset.generatedId = crypto.randomUUID());
        serialized.ID_NEW = recordId;
        const coverage = malezasCoveragePercent(serialized['% CONTROL']);
        serialized['% COBERTURA'] = coverage == null ? '' : String(coverage);
      }
      return serialized;
    }));
  }
  if (moduleKey === 'malezas') {
    data.ID = recordId;
  }
  if (moduleKey === 'calidad') data.ID = recordId;
  if (Object.keys(subregistros).length) data.subregistros = subregistros;
  return data;
}
function setFormValue(input, value) {
  if (!input || input.type === 'file') return;
  const text = value == null ? '' : String(value);
  if (input.tagName === 'SELECT' && text && ![...input.options].some(option => option.value === text)) {
    const option = document.createElement('option');
    option.value = text;
    option.textContent = text;
    input.add(option);
  }
  if (input.type === 'checkbox') input.checked = value === true || value === 'true';
  else input.value = text;
}
function setAttachmentHint(input, value) {
  if (!input || input.type !== 'file' || !value) return;
  const attachments = (Array.isArray(value) ? value : [value]).filter(item => item && typeof item === 'object');
  if (!attachments.length) return;
  const field = input.closest('.field');
  if (!field) return;
  let hint = $('.field-hint', field);
  if (!hint) {
    hint = document.createElement('small');
    hint.className = 'field-hint';
    field.append(hint);
  }
  const names = attachments.map(item => item.name || 'Archivo adjunto');
  hint.textContent = 'Adjunto actual: ' + names.join(', ') + '. Se conserva si no seleccionas otro.';
}
function setNamedFields(root, values) {
  if (!values || typeof values !== 'object') return;
  for (const input of $$('[name]', root)) {
    if (!Object.prototype.hasOwnProperty.call(values, input.name)) continue;
    setFormValue(input, values[input.name]);
    setAttachmentHint(input, values[input.name]);
  }
}
function setChildFields(row, values) {
  if (!values || typeof values !== 'object') return;
  for (const input of $$('[data-child-field]', row)) {
    const key = input.dataset.childField;
    if (!Object.prototype.hasOwnProperty.call(values, key)) continue;
    setFormValue(input, values[key]);
    setAttachmentHint(input, values[key]);
  }
}
function populateCaptureForm(record) {
  const form = $('#capture-form');
  const data = record.datos || {};
  const details = data.subregistros && typeof data.subregistros === 'object' && !Array.isArray(data.subregistros)
    ? data.subregistros
    : {};
  if (record.tipo === 'calidad') {
    setFormValue($('[name="calidad_tipo"]', form), data.calidad_tipo);
    renderQualityDetails(data.calidad_tipo);
  } else if (record.tipo === 'calibracion_aguilon') {
    setFormValue($('[name="tipo_aguilon"]', form), data.tipo_aguilon);
    renderAguilonDetails(data.tipo_aguilon);
  } else if (record.tipo === 'calibraciones_pcpm') {
    setFormValue($('[name="labor_pcpm"]', form), data.labor_pcpm);
    renderPcpmDetails(data.labor_pcpm);
  }
  setNamedFields(form, data);
  if (record.tipo === 'clima') {
    const target = $('#weather-rows');
    const readings = Array.isArray(data.lecturas) ? data.lecturas : [];
    target.innerHTML = '';
    readings.forEach((reading, index) => {
      target.insertAdjacentHTML('beforeend', rowMarkup('weather', index));
      const row = target.lastElementChild;
      row.dataset.originalIndex = String(index);
      setNamedFields(row, reading);
    });
  }
  if (record.tipo === 'epp') {
    const attendance = data.asistencia_por_funcion || {};
    for (const input of $$('.attendance-count', $('#form-fields'))) {
      setFormValue(input, attendance[input.dataset.function] == null ? 0 : attendance[input.dataset.function]);
    }
    const compliance = data.cumplimiento_epp_por_funcion || {};
    for (const input of $$('.epp-item-count', $('#form-fields'))) {
      const roleItems = compliance[input.dataset.function] || {};
      setFormValue(input, roleItems[input.dataset.item] == null ? 0 : roleItems[input.dataset.item]);
    }
    const firstItem = $('.epp-item-count', $('#form-fields'));
    if (firstItem) firstItem.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (record.tipo === 'vuelos') {
    updateFlightMetricsReadouts();
  }
  for (const list of $$('[data-repeat-list]', $('#form-fields'))) {
    const rows = Array.isArray(details[list.dataset.repeatList]) ? details[list.dataset.repeatList] : [];
    list.innerHTML = '';
    rows.forEach((rowData, index) => {
      addChildRow(list.dataset.repeatList);
      const row = list.lastElementChild;
      row.dataset.originalIndex = String(index);
      setChildFields(row, rowData);
      if (list.dataset.repeatList === 'malezas_detalle') {
        updateWeedsCoverage(row);
        const detailDate = row.querySelector('[data-child-field="FECHA"]');
        const visitDate = data.FECHA || data.fecha || '';
        if (detailDate) {
          if (detailDate.value === visitDate) detailDate.dataset.visitDateValue = detailDate.value;
          else {
            delete detailDate.dataset.visitDateValue;
            detailDate.dataset.visitDateManual = 'true';
          }
        }
        updateWeedsCatorcena(row);
      }
    });
  }
}
async function editCapture(recordId) {
  const record = await getRecord(recordId);
  if (!record || !canManageRecord(record)) {
    toast('No tienes permiso para editar esta captura.');
    return;
  }
  if (record.syncStatus === 'synced' && !navigator.onLine) {
    toast('Conéctate a internet para editar una captura sincronizada.');
    return;
  }
  if (!modules[record.tipo] || !record.datos || typeof record.datos !== 'object') {
    toast('No se puede editar el formato de esta captura.');
    return;
  }
  navigate('capturar');
  state.editingRecord = record;
  chooseModule(record.tipo);
  populateCaptureForm(record);
  if (record.tipo === 'vuelos') {
    const laborInput = $('[name="labor"]', $('#form-fields'));
    if (laborInput) laborInput.dataset.activityLabor = laborInput.value;
  }
  $('#capture-eyebrow').textContent = 'EDITAR CAPTURA';
  $('#form-title').textContent = 'Editar ' + modules[record.tipo].title;
  $('#form-subtitle').textContent = record.syncStatus === 'synced'
    ? 'Los cambios se guardarán en el espacio compartido y volverán a revisión pendiente.'
    : 'Esta captura sigue en cola y puedes editarla sin conexión.';
  $('#capture-submit').textContent = 'Guardar cambios';
}
async function deleteCapture(recordId) {
  const record = await getRecord(recordId);
  if (!record || !canManageRecord(record)) {
    toast('No tienes permiso para eliminar esta captura.');
    return;
  }
  const isSynced = record.syncStatus === 'synced';
  if (isSynced && !navigator.onLine) {
    toast('Conéctate a internet para eliminar una captura sincronizada.');
    return;
  }
  if (!window.confirm('¿Eliminar permanentemente "' + titleFor(record) + '"? Esta acción no se puede deshacer.')) return;
  if (navigator.onLine) {
    try {
      await cloudRequest('rpc/delete_field_record', {
        method: 'POST',
        body: { p_record_id: record.id }
      });
    } catch (error) {
      handleCloudError(error);
      return;
    }
    await deleteRecord(record.id);
  } else {
    record.syncStatus = 'delete-pending';
    await putRecord(record);
  }
  await refreshLists();
  toast(navigator.onLine
    ? 'Captura eliminada.'
    : 'Captura retirada del dispositivo; la eliminación se completará al recuperar conexión.');
}
function titleFor(record) {
  if (record.tipo === 'clima') return (record.datos.lecturas || []).length + ' lecturas de clima';
  if (record.tipo === 'malezas') return 'Visita de malezas';
  if (record.tipo === 'epp') return 'Conteo EPP · ' + (record.datos.labor || 'Labor');
  if (record.tipo === 'vuelos') {
    const metrics = calculateFlightMetrics(record.datos.labor, record.datos.litros, record.datos.area_ha);
    const actualVolume = metrics.appliedLitersPerHa == null ? '—' : metrics.appliedLitersPerHa.toFixed(2) + ' L/ha';
    const applicationVolume = metrics.applicationVolumeLitersPerHa == null ? '' : ' · volumen de aplicación ' + metrics.applicationVolumeLitersPerHa + ' L/ha';
    const variation = metrics.variationPercent == null ? '' : ' · variación ' + formatFlightVariationPercent(metrics.variationPercent);
    return 'Aplicación · volumen real ' + actualVolume + applicationVolume + variation;
  }
  if (record.tipo === 'calidad') return (qualityForms[record.datos.calidad_tipo] || {}).label || 'Supervisión de calidad';
  if (record.tipo === 'calibraciones_pcpm') return 'Calibración · ' + (record.datos.labor_pcpm || 'PC / PM');
  if (record.tipo === 'calibracion_aguilon') return 'Calibraciones Aguilón · ' + (record.datos.tipo_aguilon || '');
  if (record.tipo === 'variacion_aguilon') return 'Variación Aguilón';
  return record.tipo;
}
function formatDate(date) {
  return date ? new Date(date + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';
}
function recordStatus(record) {
  return record.syncStatus !== 'synced' ? 'En cola' : record.reviewStatus === 'approved' ? 'Aprobado' : record.reviewStatus === 'rejected' ? 'Rechazado' : 'Pendiente de revisión';
}
function eppReportCount(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  const count = Number(value);
  return Number.isFinite(count) ? esc(count) : esc(value);
}
function eppReportComplianceSummary(data) {
  const attendanceValue = data.asistencia_general;
  const equippedValue = data.personas_completamente_equipadas;
  const attendance = Number(attendanceValue);
  const equipped = Number(equippedValue);
  const hasCounts = attendanceValue !== undefined && attendanceValue !== null && String(attendanceValue).trim() !== '' &&
    equippedValue !== undefined && equippedValue !== null && String(equippedValue).trim() !== '' &&
    Number.isFinite(attendance) && Number.isFinite(equipped);
  const savedPercent = Number(data.cumplimiento_epp_general_pct);
  const hasSavedPercent = data.cumplimiento_epp_general_pct !== undefined &&
    data.cumplimiento_epp_general_pct !== null && String(data.cumplimiento_epp_general_pct).trim() !== '' &&
    Number.isFinite(savedPercent);
  if (!hasCounts && !hasSavedPercent) return 'Sin datos';
  const percent = hasCounts ? (attendance > 0 ? (equipped / attendance) * 100 : 0) : savedPercent;
  const counts = hasCounts ? ' (' + eppReportCount(equipped) + ' de ' + eppReportCount(attendance) + ' personas)' : '';
  return percent.toFixed(1) + '%' + counts;
}
function eppReportRoleRows(role, attendance, compliance) {
  const items = role.items || [];
  if (!items.length) return '';
  const personCount = Object.prototype.hasOwnProperty.call(attendance, role.key)
    ? eppReportCount(attendance[role.key])
    : '—';
  const itemCounts = compliance[role.key] && typeof compliance[role.key] === 'object'
    ? compliance[role.key]
    : {};
  return '<tbody class="epp-report-group">' + items.map((item, index) => {
    const roleCell = index === 0
      ? '<td class="epp-report-role" rowspan="' + items.length + '">' + esc(eppReportRoles[role.key] || role.label) + '</td>'
      : '';
    const personCell = index === 0
      ? '<td class="epp-report-number" rowspan="' + items.length + '">' + personCount + '</td>'
      : '';
    const itemCount = Object.prototype.hasOwnProperty.call(itemCounts, item) ? eppReportCount(itemCounts[item]) : '—';
    return '<tr>' + roleCell + '<td class="epp-report-index">' + (index + 1) + '</td><td class="epp-report-item">' + esc(item) + '</td>' + personCell + '<td class="epp-report-number">' + itemCount + '</td></tr>';
  }).join('') + '</tbody>';
}
function eppReportDocument(record) {
  const data = record.datos || {};
  const attendance = data.asistencia_por_funcion && typeof data.asistencia_por_funcion === 'object' && !Array.isArray(data.asistencia_por_funcion)
    ? data.asistencia_por_funcion
    : {};
  const compliance = data.cumplimiento_epp_por_funcion && typeof data.cumplimiento_epp_por_funcion === 'object' && !Array.isArray(data.cumplimiento_epp_por_funcion)
    ? data.cumplimiento_epp_por_funcion
    : {};
  const groups = eppFunctions.map(role => eppReportRoleRows(role, attendance, compliance)).join('');
  const complianceSummary = eppReportComplianceSummary(data);
  const date = data.fecha || data.FECHA;
  const metadata = [
    ['FECHA', date ? formatDate(date) : 'Sin fecha'],
    ['Finca', data.finca || 'Sin finca'],
    ['Lote', data.lote || data.id_lote || 'Sin lote'],
    ['Zona', data.zona || data.ZONA || 'Sin zona'],
    ['Labor', data.labor || 'Sin labor'],
    ['Responsable', record.ownerName || data.responsable || 'Sin responsable'],
    ['Hora', recordDetailTime(data.hora_registro) || 'Sin hora'],
    ['Estado', recordStatus(record)]
  ].map(([label, value]) => '<div class="epp-report-meta"><strong>' + esc(label) + ':</strong><span>' + esc(value) + '</span></div>').join('');
  const filename = 'EPP-' + slug(data.finca || data.lote || 'captura') + '-' + String(date || localDate()).replace(/[^0-9-]/g, '');
  const styles = `
    * { box-sizing: border-box; }
    body { margin: 0; color: #182720; font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 1.4; }
    .epp-report { width: 100%; margin: 0 auto; }
    .epp-report-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin: 0 0 8px; padding: 1px 0 9px; border-bottom: 2px solid #174b38; }
    .epp-report-title { margin: 0; color: #182720; font-size: 18px; font-weight: 700; letter-spacing: -.02em; }
    .epp-report-period { margin: 3px 0 0; color: #718078; font-size: 8px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
    .epp-report-brand { padding-top: 2px; color: #174b38; font-size: 8px; font-weight: 800; letter-spacing: .14em; line-height: 1.2; text-align: right; }
    .epp-report-meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; margin: 0 0 10px; }
    .epp-report-meta { display: flex; gap: 6px; min-width: 0; border-bottom: 1px solid #e4eae5; padding: 4px 2px; }
    .epp-report-meta strong { color: #718078; font-size: 7px; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
    .epp-report-meta span { overflow-wrap: anywhere; }
    .epp-report-compliance { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 0 0 12px; border-left: 3px solid #174b38; padding: 7px 10px; background: #f2f6f3; }
    .epp-report-compliance strong { color: #718078; font-size: 8px; letter-spacing: .06em; text-transform: uppercase; }
    .epp-report-compliance span { color: #174b38; font-size: 14px; font-weight: 700; }
    .epp-report-section-title { margin: 0 0 6px; padding: 0 0 5px; border-bottom: 1px solid #cfd8d1; color: #26342c; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .epp-report-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
    .epp-report-table col:nth-child(1) { width: 21%; }
    .epp-report-table col:nth-child(2) { width: 4%; }
    .epp-report-table col:nth-child(3) { width: 32%; }
    .epp-report-table col:nth-child(4) { width: 21.5%; }
    .epp-report-table col:nth-child(5) { width: 21.5%; }
    .epp-report-table th, .epp-report-table td { border-bottom: 1px solid #dce5de; padding: 4px 5px; vertical-align: middle; overflow-wrap: anywhere; }
    .epp-report-table th { border-bottom: 1.5px solid #174b38; background: #f2f6f3; color: #405448; text-align: left; font-size: 7px; line-height: 1.25; letter-spacing: .02em; text-transform: uppercase; }
    .epp-report-table thead th:nth-child(2), .epp-report-table thead th:nth-child(4), .epp-report-table thead th:nth-child(5) { text-align: center; }
    .epp-report-table thead th:nth-child(2) { white-space: nowrap; }
    .epp-report-role { color: #26342c; font-weight: 700; line-height: 1.3; }
    .epp-report-index, .epp-report-number { text-align: center; font-variant-numeric: tabular-nums; }
    .epp-report-index { color: #718078; }
    .epp-report-item { font-weight: 500; }
    .epp-report-group:nth-of-type(even) { background: #f8faf8; }
    .epp-report-group { border-top: 1px solid #e4eae5; break-inside: avoid; page-break-inside: avoid; }
    .epp-report-note { margin: 8px 0 0; border-top: 1px solid #e4eae5; padding-top: 6px; color: #718078; font-size: 7px; line-height: 1.4; }
    @page { size: letter portrait; margin: 10mm; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .epp-report-header, .epp-report-compliance, .epp-report-section-title { break-after: avoid-page; }
      .epp-report-table thead { display: table-header-group; }
      .epp-report-table tr { break-inside: avoid; page-break-inside: avoid; }
    }
  `;
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(filename) + '</title><style>' + styles + '</style></head><body><main class="epp-report">' +
    '<header class="epp-report-header"><div><h1 class="epp-report-title">APLICACIONES AÉREAS</h1><p class="epp-report-period">TEMPORADA 2026-2027</p></div><div class="epp-report-brand">MADRE<br>TIERRA</div></header>' +
    '<section class="epp-report-meta-grid">' + metadata + '</section>' +
    '<div class="epp-report-compliance"><strong>Porcentaje de cumplimiento general</strong><span>' + esc(complianceSummary) + '</span></div>' +
    '<h2 class="epp-report-section-title">Uso de equipo de protección personal aplicaciones con dron</h2>' +
    '<table class="epp-report-table"><colgroup><col><col><col><col><col></colgroup><thead><tr><th>Puesto</th><th>No.</th><th>Equipo de Protección</th><th>Número de personas que forman parte de la aplicación</th><th>Número de equipos de protección personal</th></tr></thead>' +
    groups + '</table><p class="epp-report-note">El porcentaje general estima cuántas personas cumplen con todo el EPP, usando el menor conteo por función; puede no representar a las mismas personas. Las cantidades de la tabla reflejan los valores capturados por función y por elemento de EPP. Los registros en cola aún no se han sincronizado; el estado de revisión se indica arriba.</p></main></body></html>';
}
async function generateEppPdf(recordId) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Permite las ventanas emergentes para generar el PDF.');
    return;
  }
  try {
    const record = await getRecord(recordId);
    if (!record || record.tipo !== 'epp' || !visibleLocalRecords([record]).length) {
      printWindow.close();
      toast('Este registro EPP no está disponible para tu perfil.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(eppReportDocument(record));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      if (!printWindow.closed) printWindow.print();
    }, 350);
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
function malezasReportDocument(record, boundaries) {
  const data = record.datos || {};
  const rows = malezasReportRows(record);
  const map = malezasReportMapSvg(boundaries, rows);
  const missingLots = [...new Set(rows
    .map(row => row.lotCode)
    .filter(code => code && !map.lotCodes.has(code)))];
  const missingMapNote = missingLots.length
    ? '<p class="malezas-report-map-note">Sin geometría disponible para: ' + esc(missingLots.join(', ')) + '.</p>'
    : '';
  const metadata = [
    ['Fecha', data.FECHA || data.fecha ? formatDate(data.FECHA || data.fecha) : 'Sin fecha'],
    ['Finca', data.FINCA || data.finca || 'Sin finca'],
    ['Zona', data.ZONA || data.zona || 'Sin zona'],
    ['Responsable', record.ownerName || data.RESPONSABLE || data.responsable || 'Sin responsable'],
    ['Ubicación GPS', data['UBICACIÓN'] || data.ubicacion || 'Sin ubicación'],
    ['Hora', recordDetailTime(data.hora_registro) || 'Sin hora'],
    ['Estado', recordStatus(record)],
    ['Lotes en la captura', String(new Set(rows.map(row => row.lotCode).filter(Boolean)).size)]
  ].map(([label, value]) => '<div class="malezas-report-meta"><strong>' + esc(label) +
    ':</strong><span>' + esc(value) + '</span></div>').join('');
  const detailMarkup = rows.map((row, index) => {
    const control = row.controlPercent == null ? 'Sin dato' : formatVisitMapControlPercent(row.controlPercent);
    const controlClass = malezasReportControlClass(row.controlPercent);
    const coverage = row.coveragePercent == null ? 'Sin dato' : formatVisitMapControlPercent(row.coveragePercent);
    const images = row.images.length
      ? '<div class="malezas-report-photos">' + row.images.map(image =>
        '<figure><img src="' + esc(image.dataUrl) + '" alt="' +
        esc(image.name || 'Imagen del lote ' + (row.lotCode || 'sin identificar')) +
        '"><figcaption>' + esc(image.name || 'Imagen del lote') + '</figcaption></figure>'
      ).join('') + '</div>'
      : '<p class="malezas-report-no-photos">Sin imágenes adjuntas para este lote.</p>';
    return '<section class="malezas-report-lot"><header><div><h3>Lote ' +
      esc(row.lotCode || 'Sin identificar') + '</h3><p>' + esc(row.labor || 'Sin labor') +
      ' · ' + esc(row.date ? formatDate(row.date.slice(0, 10)) : 'Sin fecha') +
      (row.catorcena ? ' · Catorcena ' + esc(row.catorcena) : '') +
      '</p></div><span>Detalle ' + (index + 1) + '</span></header>' +
      '<div class="malezas-report-metrics"><div><small>% Control</small><strong class="malezas-report-control-value ' +
      controlClass + '">' +
      esc(control) + '</strong></div><div><small>% Cobertura (100 - control)</small><strong>' +
      esc(coverage) + '</strong></div></div>' +
      (row.observations ? '<p class="malezas-report-observations"><strong>Observaciones:</strong> ' +
        esc(row.observations) + '</p>' : '') + images + '</section>';
  }).join('');
  const imageCount = rows.reduce((total, row) => total + row.images.length, 0);
  const filename = 'Malezas-' + slug(data.FINCA || data.finca || 'captura') + '-' +
    String(data.FECHA || data.fecha || localDate()).replace(/[^0-9-]/g, '');
  const styles = `
    * { box-sizing: border-box; }
    body { margin: 0; color: #182720; font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 1.45; }
    .malezas-report { width: 100%; margin: 0 auto; }
    .malezas-report-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin: 0 0 9px; padding: 1px 0 9px; border-bottom: 2px solid #174b38; }
    .malezas-report-title { margin: 0; color: #182720; font-size: 18px; font-weight: 700; }
    .malezas-report-period { margin: 3px 0 0; color: #718078; font-size: 8px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    .malezas-report-brand { padding-top: 2px; color: #174b38; font-size: 8px; font-weight: 800; letter-spacing: .14em; line-height: 1.2; text-align: right; }
    .malezas-report-meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; margin: 0 0 12px; }
    .malezas-report-meta { display: flex; gap: 6px; min-width: 0; border-bottom: 1px solid #e4eae5; padding: 4px 2px; }
    .malezas-report-meta strong { color: #718078; font-size: 7px; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
    .malezas-report-meta span { overflow-wrap: anywhere; }
    .malezas-report-section-title { margin: 13px 0 6px; padding: 0 0 5px; border-bottom: 1px solid #cfd8d1; color: #26342c; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }
    .malezas-report-map { margin: 0; border: 1px solid #dce5de; padding: 5px; break-inside: avoid; page-break-inside: avoid; }
    .malezas-report-map-svg { display: block; width: 100%; max-height: 112mm; }
    .malezas-map-lot { fill: #f4f6f3; stroke: #9aa99e; stroke-width: 1.2; vector-effect: non-scaling-stroke; }
    .malezas-map-lot.is-visited { fill-opacity: .9; }
    .malezas-map-lot.control-missing { fill: #b9c9d2; stroke: #657b85; }
    .malezas-map-lot.control-low { fill: #de9b91; stroke: #9f493f; }
    .malezas-map-lot.control-medium-low { fill: #e8b37d; stroke: #9b672e; }
    .malezas-map-lot.control-medium-high { fill: #e4d27f; stroke: #82702b; }
    .malezas-map-lot.control-high { fill: #93bf96; stroke: #3e7048; }
    .malezas-map-label { fill: #182720; stroke: #fff; stroke-width: 3px; paint-order: stroke; font-size: 14px; font-weight: 700; text-anchor: middle; dominant-baseline: central; }
    .malezas-report-map-empty, .malezas-report-map-note, .malezas-report-no-photos { color: #718078; font-size: 8px; }
    .malezas-report-map-note { margin: 5px 0 0; }
    .malezas-report-legend { display: flex; flex-wrap: wrap; gap: 5px 12px; margin: 6px 0 0; padding: 0; list-style: none; color: #405448; font-size: 7px; }
    .malezas-report-legend li { display: inline-flex; align-items: center; gap: 4px; }
    .malezas-report-swatch { display: inline-block; width: 9px; height: 9px; border: 1px solid #9aa99e; }
    .malezas-report-swatch.control-missing { background: #b9c9d2; border-color: #657b85; }
    .malezas-report-swatch.control-low { background: #de9b91; border-color: #9f493f; }
    .malezas-report-swatch.control-medium-low { background: #e8b37d; border-color: #9b672e; }
    .malezas-report-swatch.control-medium-high { background: #e4d27f; border-color: #82702b; }
    .malezas-report-swatch.control-high { background: #93bf96; border-color: #3e7048; }
    .malezas-report-metrics strong.control-missing { color: #657b85; }
    .malezas-report-metrics strong.control-low { color: #9f493f; }
    .malezas-report-metrics strong.control-medium-low { color: #9b672e; }
    .malezas-report-metrics strong.control-medium-high { color: #82702b; }
    .malezas-report-metrics strong.control-high { color: #3e7048; }
    .malezas-report-lot { margin: 9px 0 0; border: 1px solid #dce5de; padding: 8px; }
    .malezas-report-lot > header { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin: 0 0 6px; }
    .malezas-report-lot > header { break-after: avoid-page; }
    .malezas-report-lot h3 { margin: 0; color: #174b38; font-size: 12px; }
    .malezas-report-lot header p { margin: 2px 0 0; color: #718078; font-size: 8px; }
    .malezas-report-lot header > span { color: #718078; font-size: 7px; white-space: nowrap; }
    .malezas-report-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .malezas-report-metrics > div { display: flex; justify-content: space-between; gap: 8px; border-left: 3px solid #174b38; padding: 5px 7px; background: #f2f6f3; }
    .malezas-report-metrics small { color: #718078; font-size: 7px; font-weight: 700; text-transform: uppercase; }
    .malezas-report-metrics strong { color: #174b38; font-size: 11px; }
    .malezas-report-observations { margin: 6px 0; overflow-wrap: anywhere; }
    .malezas-report-photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 7px; }
    .malezas-report-photos figure { margin: 0; border: 1px solid #e4eae5; padding: 4px; break-inside: avoid; page-break-inside: avoid; }
    .malezas-report-photos img { display: block; width: 100%; height: 62mm; object-fit: contain; background: #f8faf8; }
    .malezas-report-photos figcaption { margin-top: 3px; color: #718078; font-size: 7px; overflow-wrap: anywhere; }
    .malezas-report-no-photos { margin: 6px 0 0; }
    @page { size: letter portrait; margin: 10mm; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .malezas-report-header, .malezas-report-section-title { break-after: avoid-page; }
    }
  `;
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    esc(filename) + '</title><style>' + styles + '</style></head><body><main class="malezas-report">' +
    '<header class="malezas-report-header"><div><h1 class="malezas-report-title">MUESTREO DE MALEZAS</h1><p class="malezas-report-period">Reporte por captura</p></div><div class="malezas-report-brand">MADRE<br>TIERRA</div></header>' +
    '<section class="malezas-report-meta-grid">' + metadata + '</section>' +
    '<div class="malezas-report-summary"><strong>' + rows.length + (rows.length === 1 ? ' detalle' : ' detalles') +
    ' por lote · ' + imageCount + (imageCount === 1 ? ' imagen' : ' imágenes') + '</strong></div>' +
    '<h2 class="malezas-report-section-title">Mapa de lotes muestreados</h2>' +
    '<figure class="malezas-report-map">' + map.markup + '</figure>' + missingMapNote +
    '<ul class="malezas-report-legend"><li><i class="malezas-report-swatch control-missing"></i> Sin %</li>' +
    '<li><i class="malezas-report-swatch control-low"></i> Menos de 70%</li>' +
    '<li><i class="malezas-report-swatch control-medium-low"></i> 70% a menos de 75%</li>' +
    '<li><i class="malezas-report-swatch control-medium-high"></i> 75% a 85%</li>' +
    '<li><i class="malezas-report-swatch control-high"></i> Más de 85%</li></ul>' +
    '<h2 class="malezas-report-section-title">Control, cobertura e imágenes por lote</h2>' +
    (detailMarkup || '<p class="malezas-report-map-empty">La captura no contiene detalles de lotes.</p>') +
    '</main></body></html>';
}
async function waitForReportImages(reportWindow) {
  const images = [...reportWindow.document.images];
  await Promise.all(images.map(async image => {
    if (!image.complete) {
      await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', () => reject(new Error('No se pudo cargar una imagen adjunta del reporte.')), { once: true });
      });
    }
    if (!image.naturalWidth) throw new Error('No se pudo cargar una imagen adjunta del reporte.');
    if (image.decode) await image.decode();
  }));
}
async function generateMalezasPdf(recordId) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Permite las ventanas emergentes para generar el PDF.');
    return;
  }
  try {
    const record = await getRecord(recordId);
    if (!record || record.tipo !== 'malezas' || !visibleLocalRecords([record]).length) {
      printWindow.close();
      toast('Esta captura de Malezas no está disponible para tu perfil.');
      return;
    }
    if (!malezasReportRows(record).length) {
      printWindow.close();
      toast('La captura no contiene lotes para incluir en el reporte.');
      return;
    }
    let boundaries;
    if (state.visitMap && Array.isArray(state.visitMap.boundaries)) {
      boundaries = state.visitMap.boundaries;
    } else {
      const snapshot = await loadBoundariesForReport();
      boundaries = snapshot.boundaries;
      if (snapshot.savedAt) toast('Reporte con límites guardados el ' + offlineSnapshotDate(snapshot) + '.');
    }
    boundaries = boundaries.filter(boundary => userCanAccessZone(boundary.zone));
    printWindow.document.open();
    printWindow.document.write(malezasReportDocument(record, boundaries));
    printWindow.document.close();
    await waitForReportImages(printWindow);
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
function currentFlightReportFilters() {
  return {
    from: $('#flight-report-from').value,
    to: $('#flight-report-to').value,
    finca: $('#flight-report-finca').value,
    zona: $('#flight-report-zona').value,
    labor: $('#flight-report-labor').value
  };
}
function flightReportFilterLabel(field, value) {
  if (!value) {
    return field === 'finca' ? 'Todas las fincas' :
      field === 'zona' ? 'Todas las zonas' :
        field === 'labor' ? 'Todas las labores' : 'Sin filtro';
  }
  if (value === FLIGHT_REPORT_MISSING_FILTER) {
    return field === 'finca' ? 'Sin finca' : field === 'zona' ? 'Sin zona' : 'Sin labor';
  }
  return value;
}
function flightReportNotes(report) {
  const notes = [];
  if (report.totals.invalidAreaRecords) {
    notes.push(report.totals.invalidAreaRecords + ' captura(s) tienen hectáreas vacías, no válidas o fuera del rango numérico; esos valores no se sumaron.');
  }
  if (report.totals.invalidLitersRecords) {
    notes.push(report.totals.invalidLitersRecords + ' captura(s) tienen litros vacíos, no válidos o fuera del rango numérico; esos valores no se sumaron.');
  }
  if (report.totals.missingDateIncluded) {
    notes.push(report.totals.missingDateIncluded + ' captura(s) sin fecha válida se incluyen porque no se aplicó un rango de fechas.');
  }
  if (report.totals.missingDateExcluded) {
    notes.push(report.totals.missingDateExcluded + ' captura(s) sin fecha válida se excluyeron porque se aplicó un rango de fechas.');
  }
  return notes;
}
function flightReportDocument(report, filters) {
  if (report.invalidDateRange) throw new Error('La fecha inicial debe ser anterior o igual a la fecha final.');
  const dateRange = (filters.from ? formatDate(filters.from) : 'Sin límite inicial') +
    ' – ' + (filters.to ? formatDate(filters.to) : 'Sin límite final');
  const criteria = [
    ['Rango de fechas', dateRange],
    ['Finca', flightReportFilterLabel('finca', filters.finca)],
    ['Zona', flightReportFilterLabel('zona', filters.zona)],
    ['Labor', flightReportFilterLabel('labor', filters.labor)]
  ].map(([label, value]) => '<div class="flight-report-meta"><strong>' + esc(label) +
    ':</strong><span>' + esc(value) + '</span></div>').join('');
  const rows = report.rows.map(row => '<tr><th scope="row">' + esc(row.drone) +
    '</th><td>' + row.flights + '</td><td>' + formatFlightReportNumber(row.hectares) +
    '</td><td>' + formatFlightReportNumber(row.liters) + '</td></tr>').join('');
  const notes = flightReportNotes(report);
  const noteMarkup = '<p class="flight-report-note">Se incluyen capturas sincronizadas y pendientes disponibles en este dispositivo.' +
    (notes.length ? ' ' + notes.map(esc).join(' ') : '') + '</p>';
  const filename = 'Vuelos-acumulado-' + localDate() +
    (filters.labor && filters.labor !== FLIGHT_REPORT_MISSING_FILTER ? '-' + slug(filters.labor) : '');
  const styles = `
    * { box-sizing: border-box; }
    body { margin: 0; color: #182720; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.45; }
    .flight-report { width: 100%; margin: 0 auto; }
    .flight-report-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin: 0 0 12px; padding: 1px 0 9px; border-bottom: 2px solid #174b38; }
    .flight-report-title { margin: 0; color: #182720; font-size: 19px; font-weight: 700; }
    .flight-report-period { margin: 3px 0 0; color: #718078; font-size: 8px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    .flight-report-brand { padding-top: 2px; color: #174b38; font-size: 8px; font-weight: 800; letter-spacing: .14em; line-height: 1.2; text-align: right; }
    .flight-report-meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; margin: 0 0 14px; }
    .flight-report-meta { display: flex; gap: 7px; min-width: 0; border-bottom: 1px solid #e4eae5; padding: 6px 2px; }
    .flight-report-meta strong { color: #718078; font-size: 8px; letter-spacing: .03em; text-transform: uppercase; white-space: nowrap; }
    .flight-report-meta span { overflow-wrap: anywhere; }
    .flight-report-summary { display: flex; gap: 14px; margin: 0 0 12px; border-left: 3px solid #174b38; padding: 9px 12px; background: #f2f6f3; color: #174b38; font-size: 12px; font-weight: 700; }
    .flight-report-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
    .flight-report-table th, .flight-report-table td { border-bottom: 1px solid #dce5de; padding: 7px 8px; text-align: right; font-variant-numeric: tabular-nums; }
    .flight-report-table thead th { border-bottom: 1.5px solid #174b38; background: #f2f6f3; color: #405448; text-align: right; font-size: 8px; letter-spacing: .04em; text-transform: uppercase; }
    .flight-report-table th:first-child, .flight-report-table td:first-child { text-align: left; }
    .flight-report-table tbody tr:nth-child(even) { background: #f8faf8; }
    .flight-report-table tfoot th, .flight-report-table tfoot td { border-top: 1.5px solid #174b38; border-bottom: 0; color: #174b38; font-weight: 700; }
    .flight-report-note { margin: 10px 0 0; border-top: 1px solid #e4eae5; padding-top: 7px; color: #718078; font-size: 8px; line-height: 1.5; }
    @page { size: letter portrait; margin: 12mm; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .flight-report-header, .flight-report-summary { break-after: avoid-page; }
      .flight-report-table thead { display: table-header-group; }
      .flight-report-table tr { break-inside: avoid; page-break-inside: avoid; }
    }
  `;
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    esc(filename) + '</title><style>' + styles + '</style></head><body><main class="flight-report">' +
    '<header class="flight-report-header"><div><h1 class="flight-report-title">RESUMEN ACUMULADO DE VUELOS</h1><p class="flight-report-period">MyM Campo · Aplicaciones aéreas · Generado ' +
    esc(formatDate(localDate())) + '</p></div><div class="flight-report-brand">MADRE<br>TIERRA</div></header>' +
    '<section class="flight-report-meta-grid">' + criteria + '</section>' +
    '<div class="flight-report-summary"><span>' + report.totals.flights + (report.totals.flights === 1 ? ' vuelo' : ' vuelos') +
    '</span><span>' + formatFlightReportNumber(report.totals.hectares) + ' ha</span><span>' +
    formatFlightReportNumber(report.totals.liters) + ' L</span></div>' +
    '<table class="flight-report-table"><thead><tr><th scope="col">Dron</th><th scope="col">Vuelos</th><th scope="col">Hectáreas</th><th scope="col">Litros usados</th></tr></thead><tbody>' +
    rows + '</tbody><tfoot><tr><th scope="row">Total</th><td>' + report.totals.flights +
    '</td><td>' + formatFlightReportNumber(report.totals.hectares) + '</td><td>' +
    formatFlightReportNumber(report.totals.liters) + '</td></tr></tfoot></table>' + noteMarkup +
    '</main></body></html>';
}
function updateFlightReportFilterOptions() {
  const controls = [
    ['flight-report-finca', 'finca', 'Todas las fincas'],
    ['flight-report-zona', 'zona', 'Todas las zonas'],
    ['flight-report-labor', 'labor', 'Todas las labores']
  ];
  for (const [id, field, allLabel] of controls) {
    const select = $('#' + id);
    const previous = select.value;
    const options = flightReportFilterOptions(state.flightReportRecords, field);
    select.innerHTML = '<option value="">' + esc(allLabel) + '</option>' +
      options.map(option => '<option value="' + esc(option.value) + '">' + esc(option.label) + '</option>').join('');
    select.value = options.some(option => option.value === previous) ? previous : '';
  }
}
function resetFlightReportView() {
  state.flightReportRecords = [];
  $('#flight-report-from').value = '';
  $('#flight-report-to').value = '';
  updateFlightReportFilterOptions();
  renderFlightReport();
}
function renderFlightReport() {
  const filters = currentFlightReportFilters();
  const report = flightReportData(state.flightReportRecords, filters);
  $('#flight-report-pdf').disabled = report.invalidDateRange;
  $('#flight-report-rows').innerHTML = report.rows.map(row => '<tr><th scope="row">' + esc(row.drone) +
    '</th><td>' + row.flights + '</td><td>' + formatFlightReportNumber(row.hectares) +
    '</td><td>' + formatFlightReportNumber(row.liters) + '</td></tr>').join('');
  $('#flight-report-totals').innerHTML = '<tr><th scope="row">Total</th><td>' + report.totals.flights +
    '</td><td>' + formatFlightReportNumber(report.totals.hectares) + '</td><td>' +
    formatFlightReportNumber(report.totals.liters) + '</td></tr>';
  $('#flight-report-summary').textContent = report.totals.flights +
    (report.totals.flights === 1 ? ' vuelo' : ' vuelos') + ' · ' +
    formatFlightReportNumber(report.totals.hectares) + ' ha · ' +
    formatFlightReportNumber(report.totals.liters) + ' L';
  $('#flight-report-status').textContent = report.invalidDateRange
    ? 'Revisa el rango de fechas: la fecha inicial debe ser anterior o igual a la fecha final.'
    : report.totals.flights
      ? 'Los totales corresponden a las capturas que cumplen con todos los filtros.'
      : 'No hay capturas de Vuelos que coincidan con los filtros seleccionados.';
  const notes = ['Se consultaron ' + report.sourceRecordCount + ' captura(s) de Vuelos disponibles en este dispositivo.'];
  notes.push(...flightReportNotes(report));
  $('#flight-report-data-note').textContent = notes.join(' ');
}
async function loadFlightReportRecords() {
  const userId = state.user && state.user.id;
  const refreshButton = $('#flight-report-refresh');
  refreshButton.disabled = true;
  $('#flight-report-status').textContent = 'Cargando capturas de Vuelos guardadas en este dispositivo…';
  try {
    const records = await getRecords();
    if (!state.user || state.user.id !== userId || !userCanOpenModule('vuelos')) {
      throw new Error('Tu perfil ya no tiene acceso al resumen de Vuelos.');
    }
    state.flightReportRecords = visibleLocalRecords(records).filter(record => record.tipo === 'vuelos');
    updateFlightReportFilterOptions();
    renderFlightReport();
  } finally {
    refreshButton.disabled = false;
  }
}
async function openFlightReport() {
  if (!state.user || !userCanOpenModule('vuelos')) {
    toast('El resumen de Vuelos no está disponible para tu perfil.');
    return;
  }
  const dialog = $('#flight-report-dialog');
  if (typeof dialog.showModal !== 'function') {
    toast('Este navegador no permite abrir el resumen de Vuelos.');
    return;
  }
  if (!dialog.open) dialog.showModal();
  try {
    await loadFlightReportRecords();
  } catch (error) {
    $('#flight-report-status').textContent = error.message || 'No se pudieron cargar las capturas de Vuelos.';
    throw error;
  }
}
function generateFlightReportPdf() {
  if (!state.user || !userCanOpenModule('vuelos')) {
    toast('El resumen de Vuelos no está disponible para tu perfil.');
    return;
  }
  const filters = currentFlightReportFilters();
  const report = flightReportData(state.flightReportRecords, filters);
  if (report.invalidDateRange) {
    renderFlightReport();
    return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Permite las ventanas emergentes para generar el PDF.');
    return;
  }
  try {
    printWindow.document.open();
    printWindow.document.write(flightReportDocument(report, filters));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      if (!printWindow.closed) printWindow.print();
    }, 350);
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
function handleFlightReportError(error) {
  console.error('No se pudo cargar el resumen de Vuelos.', error);
  $('#flight-report-status').textContent = error.message || 'No se pudieron cargar las capturas de Vuelos.';
  toast('No se pudo actualizar el resumen de Vuelos.');
}
const CLIMATE_VARIABLES = Object.freeze({
  temperatura: { label: 'Temperatura', unit: '°C' },
  humedad: { label: 'Humedad', unit: '%' },
  viento: { label: 'Velocidad del viento', unit: 'km/h' },
  delta_t: { label: 'Delta T', unit: '°C' }
});
function climateScopedRecords(records, user) {
  if (!user || user.status !== 'active') return [];
  return records.filter(record => record && record.tipo === 'clima' && record.syncStatus !== 'delete-pending' &&
    (user.role === 'admin' || flightRecordBelongsToUser(record, user)));
}
function climateNumeric(value) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function climateTimestamp(date, time) {
  const validDate = flightReportDate(date);
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(time || '').trim());
  if (!validDate || !match) return null;
  return Date.parse(validDate + 'T' + match[1] + ':' + match[2] + ':' + (match[3] || '00') + 'Z');
}
function climateReadings(records, filters) {
  const selected = filters || {};
  const from = selected.from ? flightReportDate(selected.from) : '';
  const to = selected.to ? flightReportDate(selected.to) : '';
  const invalidDateRange = !!((selected.from && !from) || (selected.to && !to) || (from && to && from > to));
  const result = { rows: [], invalidDateRange, missingDateExcluded: 0, missingReadings: 0 };
  if (invalidDateRange) return result;
  for (const record of records) {
    const data = record.datos || {};
    const date = flightReportDate(flightReportValue(record, 'fecha'));
    if (selected.owner && flightRecordOwnerKey(record) !== selected.owner) continue;
    if (selected.finca && flightReportNormalize(flightReportValue(record, 'finca')) !== flightReportNormalize(selected.finca)) continue;
    if (selected.zona && flightReportNormalize(flightReportValue(record, 'zona')) !== flightReportNormalize(selected.zona)) continue;
    if ((from || to) && !date) { result.missingDateExcluded++; continue; }
    if ((from && date < from) || (to && date > to)) continue;
    if (!Array.isArray(data.lecturas) || !data.lecturas.length) { result.missingReadings++; continue; }
    data.lecturas.forEach((reading, index) => {
      const values = reading && typeof reading === 'object' && !Array.isArray(reading) ? reading : {};
      result.rows.push({ key: String(record.id) + ':' + index, record, values, date,
        time: typeof values.hora === 'string' ? values.hora.trim() : '',
        timestamp: climateTimestamp(date, values.hora) });
    });
  }
  result.rows.sort((a, b) => (a.timestamp === null ? Infinity : a.timestamp) -
    (b.timestamp === null ? Infinity : b.timestamp));
  return result;
}
function climateVariables(records) {
  const variables = new Map(Object.entries(CLIMATE_VARIABLES));
  for (const record of records) {
    const readings = record.datos && record.datos.lecturas;
    if (!Array.isArray(readings)) continue;
    for (const reading of readings) {
      if (!reading || typeof reading !== 'object' || Array.isArray(reading)) continue;
      for (const [key, value] of Object.entries(reading)) {
        if (!variables.has(key) && !['hora', 'direccion', 'fecha', 'id'].includes(key) && climateNumeric(value) !== null) {
          variables.set(key, { label: recordDetailLabel(key), unit: '' });
        }
      }
    }
  }
  return variables;
}
function resetClimateChart() {
  state.climateLoadSeq += 1;
  state.climateRecords = [];
  state.climateRows = [];
  state.climateSelected = '';
  state.climateSource = '';
  for (const id of ['climate-chart-from', 'climate-chart-to', 'climate-chart-farm', 'climate-chart-zone', 'climate-chart-owner']) $('#' + id).value = '';
  $('#climate-chart-variable').innerHTML = '';
  $('#climate-chart-owner-field').hidden = true;
  $('#climate-chart-refresh').disabled = false;
  $('#climate-chart-count').textContent = '0 mediciones';
  $('#climate-chart-status').textContent = 'Carga las lecturas para consultar la gráfica.';
  $('#climate-chart-plot').innerHTML = '';
  $('#climate-chart-details').innerHTML = '';
  $('#climate-chart-list').innerHTML = '';
}
function updateClimateOptions() {
  const records = climateScopedRecords(state.climateRecords, state.user);
  const variable = $('#climate-chart-variable');
  const previousVariable = variable.value;
  const variables = climateVariables(records);
  variable.innerHTML = [...variables].map(([key, item]) => '<option value="' + esc(key) + '">' +
    esc(item.label + (item.unit ? ' (' + item.unit + ')' : '')) + '</option>').join('');
  variable.value = variables.has(previousVariable) ? previousVariable : 'temperatura';
  for (const field of ['finca', 'zona']) {
    const select = $('#climate-chart-' + (field === 'finca' ? 'farm' : 'zone'));
    const previous = select.value;
    const values = new Map();
    for (const record of records) {
      const value = flightReportValue(record, field);
      if (value && !values.has(flightReportNormalize(value))) values.set(flightReportNormalize(value), value);
    }
    const options = [...values.values()].sort((a, b) => a.localeCompare(b, 'es'));
    select.innerHTML = '<option value="">Todas las ' + (field === 'finca' ? 'fincas' : 'zonas') + '</option>' +
      options.map(value => '<option value="' + esc(value) + '">' + esc(value) + '</option>').join('');
    select.value = options.includes(previous) ? previous : '';
  }
  const owner = $('#climate-chart-owner');
  const previousOwner = owner.value;
  const owners = new Map();
  for (const record of records) {
    const key = flightRecordOwnerKey(record);
    if (key && !owners.has(key)) owners.set(key, record.ownerName && record.ownerUsername
      ? record.ownerName + ' (@' + record.ownerUsername + ')' : record.ownerName || record.ownerUsername || 'Usuario');
  }
  owner.innerHTML = '<option value="">Todos los usuarios</option>' +
    [...owners].sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([key, label]) => '<option value="' + esc(key) + '">' + esc(label) + '</option>').join('');
  owner.value = owners.has(previousOwner) ? previousOwner : '';
  $('#climate-chart-owner-field').hidden = !isActiveAdmin();
}
function climateReadingLabel(row) {
  return (row.date ? formatDate(row.date) : 'Sin fecha válida') + ' · ' +
    (/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.test(row.time) ? row.time : (row.time ? 'Hora no válida: ' + row.time : 'Sin hora válida')) +
    ' · ' + (flightReportValue(row.record, 'finca') || 'Sin finca') +
    ' · ' + (flightReportValue(row.record, 'zona') || 'Sin zona');
}
function renderClimateDetails(row) {
  const detail = $('#climate-chart-details');
  if (!row) { detail.innerHTML = '<p class="field-hint">Selecciona una lectura para ver sus datos.</p>'; return; }
  const data = row.record.datos || {};
  const location = data.ubicacion || data['UBICACIÓN'] || (data.latitud && data.longitud ? data.latitud + ', ' + data.longitud : 'Sin ubicación GPS');
  const entries = [
    ['Fecha', row.date ? formatDate(row.date) : 'Sin fecha válida'],
    ['Hora', row.time || 'Sin hora'],
    ['Finca', flightReportValue(row.record, 'finca') || 'Sin finca'],
    ['Zona', flightReportValue(row.record, 'zona') || 'Sin zona'],
    ['Lote', data.lote || data.LOTE || 'Sin lote'],
    ['Ubicación', location],
    ['Usuario', row.record.ownerName || row.record.ownerUsername || 'Usuario']
  ];
  for (const [key, value] of Object.entries(row.values)) {
    if (key === 'hora') continue;
    const variable = CLIMATE_VARIABLES[key];
    entries.push([variable ? variable.label : recordDetailLabel(key),
      value === null || value === undefined || String(value).trim() === '' ? 'Sin dato' :
        String(value) + (variable && variable.unit ? ' ' + variable.unit : '')]);
  }
  detail.innerHTML = '<h2>Detalle de la medición</h2><dl class="record-detail-grid">' +
    entries.map(([label, value]) => '<div class="record-detail-item"><dt>' + esc(label) + '</dt><dd>' + esc(String(value)) + '</dd></div>').join('') + '</dl>';
}
function renderClimateChart() {
  const records = climateScopedRecords(state.climateRecords, state.user);
  const variableKey = $('#climate-chart-variable').value;
  const variable = climateVariables(records).get(variableKey) || CLIMATE_VARIABLES.temperatura;
  const report = climateReadings(records, {
    from: $('#climate-chart-from').value, to: $('#climate-chart-to').value,
    finca: $('#climate-chart-farm').value, zona: $('#climate-chart-zone').value,
    owner: isActiveAdmin() ? $('#climate-chart-owner').value : ''
  });
  state.climateRows = report.rows;
  const points = report.rows.map((row, index) => ({ row, index, value: climateNumeric(row.values[variableKey]) }))
    .filter(point => point.row.timestamp !== null && point.value !== null);
  const notes = [];
  if (report.invalidDateRange) notes.push('La fecha inicial debe ser válida y anterior o igual a la fecha final.');
  else if (!report.rows.length) notes.push('No hay mediciones que coincidan con los filtros.');
  if (report.rows.length > points.length) notes.push((report.rows.length - points.length) + ' medición(es) sin fecha, hora o valor válido no se grafican; consulta la lista.');
  if (report.missingDateExcluded) notes.push(report.missingDateExcluded + ' captura(s) sin fecha válida se excluyeron del rango.');
  if (report.missingReadings) notes.push(report.missingReadings + ' captura(s) no contienen lecturas.');
  $('#climate-chart-status').textContent = [state.climateSource, ...notes].filter(Boolean).join(' ');
  $('#climate-chart-count').textContent = report.invalidDateRange ? 'Rango no válido' : report.rows.length + (report.rows.length === 1 ? ' medición' : ' mediciones');
  const plot = $('#climate-chart-plot');
  if (!points.length) plot.innerHTML = '<p class="field-hint">No hay puntos válidos para esta variable.</p>';
  else {
    const minTime = points[0].row.timestamp;
    const maxTime = points[points.length - 1].row.timestamp;
    const min = points.reduce((value, point) => Math.min(value, point.value), Infinity);
    const max = points.reduce((value, point) => Math.max(value, point.value), -Infinity);
    const coords = points.map(point => ({ ...point,
      x: maxTime === minTime ? 214 : 46 + (point.row.timestamp - minTime) / (maxTime - minTime) * 336,
      y: max === min ? 110 : 200 - (point.value / 2 - min / 2) / (max / 2 - min / 2) * 180 }));
    const axisLabel = variable.label + (variable.unit ? ' (' + variable.unit + ')' : '');
    const lines = coords.map(point => point.x.toFixed(2) + ',' + point.y.toFixed(2)).join(' ');
    const markers = coords.map(point => '<g class="climate-point" data-climate-reading="' + point.index +
      '" role="button" tabindex="0" aria-label="' + esc(climateReadingLabel(point.row) + ' · ' + axisLabel + ': ' + point.value) +
      '"><circle cx="' + point.x + '" cy="' + point.y + '" r="12" class="climate-point-hit"></circle><circle cx="' +
      point.x + '" cy="' + point.y + '" r="4" class="climate-point-dot"></circle></g>').join('');
    plot.innerHTML = '<div class="climate-axis-title">' + esc(axisLabel) + '</div><svg viewBox="0 0 400 245" role="group" aria-label="Gráfica de ' + esc(axisLabel) +
      ' por fecha y hora"><line x1="46" y1="20" x2="46" y2="200" class="climate-axis"></line><line x1="46" y1="200" x2="382" y2="200" class="climate-axis"></line>' +
      '<text x="42" y="24" text-anchor="end">' + esc(String(max)) + '</text><text x="42" y="200" text-anchor="end">' + esc(String(min)) +
      '</text><polyline points="' + lines + '" class="climate-line"></polyline>' + markers +
      '<text x="46" y="219" text-anchor="start">' + esc(points[0].row.date + ' ' + points[0].row.time) + '</text>' +
      (maxTime === minTime ? '' : '<text x="382" y="235" text-anchor="end">' + esc(points[points.length - 1].row.date + ' ' + points[points.length - 1].row.time) + '</text>') +
      '</svg><p class="field-hint">Fecha y hora de cada medición. Si hay puntos superpuestos, selecciona cada lectura en la lista.</p>';
  }
  $('#climate-chart-list').innerHTML = report.rows.map((row, index) => {
    const value = climateNumeric(row.values[variableKey]);
    return '<button type="button" class="climate-reading" data-climate-reading="' + index + '" aria-pressed="' +
      String(row.key === state.climateSelected) + '">' + esc(climateReadingLabel(row)) + ' · ' +
      esc(value === null ? 'Sin valor para ' + variable.label : String(value) + (variable.unit ? ' ' + variable.unit : '')) + '</button>';
  }).join('') || '<p class="field-hint">No hay lecturas para mostrar.</p>';
  renderClimateDetails(report.rows.find(row => row.key === state.climateSelected));
  return report.rows;
}
async function loadClimateChart() {
  if (!state.user || state.user.status !== 'active') return;
  const user = { ...state.user };
  const sequence = ++state.climateLoadSeq;
  let local = [];
  const button = $('#climate-chart-refresh');
  button.disabled = true;
  $('#climate-chart-status').textContent = 'Cargando mediciones…';
  try {
    local = (await getRecords()).filter(recordHasLotAccess);
    const offline = !navigator.onLine || !state.configured;
    const remote = [];
    if (!offline) {
      const ownerFilter = user.role === 'admin' ? '' : '&owner_id=eq.' + encodeURIComponent(user.id);
      for (let offset = 0, page; ; offset += 1000) {
        page = await cloudRequest('field_records?tipo=eq.clima' + ownerFilter +
          '&select=id,owner_id,tipo,created_at,schema_version,datos,review_status,reviewed_by,reviewed_at,review_note,profiles!field_records_owner_id_fkey(username,display_name)&order=created_at.desc,id.asc&limit=1000&offset=' + offset);
        remote.push(...page.map(mapCloudRecord));
        if (page.length < 1000) break;
      }
    }
    if (sequence !== state.climateLoadSeq || !state.user || state.user.id !== user.id || state.user.role !== user.role) return;
    state.climateRecords = mergeScopedReportRecords(remote, local, user, offline, 'clima');
    state.climateSource = offline ? 'Sin conexión: se muestran solo las capturas disponibles en este dispositivo.' :
      'Se muestran las capturas sincronizadas y las pendientes de este dispositivo.';
    updateClimateOptions();
    renderClimateChart();
  } catch (error) {
    if (sequence !== state.climateLoadSeq) return;
    if (!state.user || state.user.id !== user.id || state.user.role !== user.role) return;
    const cached = error.connectionFailure ? mergeScopedReportRecords([], local, user, true, 'clima') : [];
    if (cached.length) {
      state.climateRecords = cached;
      state.climateSource = 'No se pudo actualizar: se muestran datos guardados en este dispositivo, que pueden estar desactualizados.';
      updateClimateOptions();
      renderClimateChart();
      console.error('No se pudieron actualizar las mediciones de clima.', error);
      return;
    }
    state.climateRecords = [];
    state.climateSource = '';
    updateClimateOptions();
    renderClimateChart();
    $('#climate-chart-count').textContent = 'Datos no disponibles';
    $('#climate-chart-plot').innerHTML = '';
    $('#climate-chart-details').innerHTML = '';
    $('#climate-chart-list').innerHTML = '';
    $('#climate-chart-status').textContent = 'No se pudieron cargar las mediciones. Comprueba la conexión y pulsa Actualizar datos.';
    console.error('No se pudieron cargar las mediciones de clima.', error);
  } finally {
    if (sequence === state.climateLoadSeq) button.disabled = false;
  }
}
function mergeScopedReportRecords(remote, local, user, offline, type = 'vuelos') {
  const scoped = records => !user || user.status !== 'active' ? [] : records.filter(record =>
    record && record.tipo === type && record.syncStatus !== 'delete-pending' &&
    (user.role === 'admin' || flightRecordBelongsToUser(record, user)));
  const cached = scoped(local);
  if (offline) return cached;
  const rows = new Map(scoped(remote).map(record => [record.id, record]));
  const ownerIds = new Map(remote.filter(record => record.ownerUsername && record.ownerId)
    .map(record => [record.ownerUsername, record.ownerId]));
  if (user.username && user.id) ownerIds.set(user.username, user.id);
  for (const record of local) {
    if (!record || record.tipo !== type ||
        (user.role !== 'admin' && !flightRecordBelongsToUser(record, user))) continue;
    if (record.syncStatus === 'delete-pending') rows.delete(record.id);
    else if (record.syncStatus === 'pending') {
      const ownerId = record.ownerId || ownerIds.get(record.ownerUsername);
      rows.set(record.id, ownerId ? { ...record, ownerId } : record);
    }
  }
  return [...rows.values()];
}
function resetFlightVariation() {
  state.flightVariationLoadSeq += 1;
  state.flightVariationRecords = [];
  state.flightVariationDrone = '';
  state.flightVariationSource = '';
  for (const id of ['flight-variation-from', 'flight-variation-to', 'flight-variation-labor', 'flight-variation-owner']) {
    $('#' + id).value = '';
  }
  $('#flight-variation-owner-field').hidden = true;
  $('#flight-variation-refresh').disabled = false;
  $('#flight-variation-chart').innerHTML = '';
  $('#flight-variation-details').innerHTML = '';
  $('#flight-variation-total').textContent = '0.00 ha';
  $('#flight-variation-count').textContent = '0 vuelos';
  $('#flight-variation-status').textContent = 'Carga los vuelos para consultar la gráfica.';
}
function updateFlightVariationOptions() {
  const records = flightVariationScopedRecords(state.flightVariationRecords, state.user);
  const labor = $('#flight-variation-labor');
  const selectedLabor = labor.value;
  const laborOptions = flightReportFilterOptions(records, 'labor');
  labor.innerHTML = '<option value="">Todas las labores</option>' +
    laborOptions.map(option => '<option value="' + esc(option.value) + '">' + esc(option.label) + '</option>').join('');
  labor.value = laborOptions.some(option => option.value === selectedLabor) ? selectedLabor : '';
  const owner = $('#flight-variation-owner');
  const selectedOwner = owner.value;
  const owners = new Map();
  for (const record of records) {
    const key = flightRecordOwnerKey(record);
    const name = record.ownerName || record.ownerUsername || 'Usuario';
    const label = record.ownerName && record.ownerUsername ? name + ' (@' + record.ownerUsername + ')' : name;
    if (key && !owners.has(key)) owners.set(key, label);
  }
  owner.innerHTML = '<option value="">Todos los usuarios</option>' +
    [...owners.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([key, name]) => '<option value="' + esc(key) + '">' + esc(name) + '</option>').join('');
  owner.value = owners.has(selectedOwner) ? selectedOwner : '';
  $('#flight-variation-owner-field').hidden = !isActiveAdmin();
}
function renderFlightVariation() {
  const records = flightVariationScopedRecords(state.flightVariationRecords, state.user);
  const filters = {
    from: $('#flight-variation-from').value,
    to: $('#flight-variation-to').value,
    labor: $('#flight-variation-labor').value,
    owner: isActiveAdmin() ? $('#flight-variation-owner').value : ''
  };
  const report = flightReportData(records, filters);
  $('#flight-variation-total').textContent = formatFlightReportNumber(report.totals.hectares) + ' ha';
  $('#flight-variation-count').textContent = report.totals.flights + (report.totals.flights === 1 ? ' vuelo' : ' vuelos');
  const notes = [];
  if (report.invalidDateRange) notes.push('La fecha inicial debe ser válida y anterior o igual a la fecha final.');
  else if (!report.totals.flights) notes.push('No hay vuelos que coincidan con los filtros.');
  if (report.totals.invalidAreaRecords) notes.push(report.totals.invalidAreaRecords + ' vuelo(s) sin hectáreas válidas no se sumaron.');
  if (report.totals.missingDateIncluded) notes.push(report.totals.missingDateIncluded + ' vuelo(s) sin fecha válida se incluyen sin filtro de fechas.');
  if (report.totals.missingDateExcluded) notes.push(report.totals.missingDateExcluded + ' vuelo(s) sin fecha válida se excluyeron del rango.');
  $('#flight-variation-status').textContent = [state.flightVariationSource || '', ...notes].filter(Boolean).join(' ');
  if (report.invalidDateRange) {
    $('#flight-variation-total').textContent = '—';
    $('#flight-variation-count').textContent = 'Rango no válido';
    $('#flight-variation-chart').innerHTML = '';
    $('#flight-variation-details').innerHTML = '';
    return;
  }
  const maxArea = report.rows.reduce((max, row) => Math.max(max, row.hectares), 0);
  $('#flight-variation-chart').innerHTML = report.rows.map(row => {
    const height = maxArea ? Math.max(0, row.hectares / maxArea * 100) : 0;
    const label = row.drone + ': ' + formatFlightReportNumber(row.hectares) + ' hectáreas, ' + row.flights + ' vuelos';
    return '<button type="button" class="flight-variation-bar" data-flight-variation-drone="' + esc(row.drone) +
      '" aria-label="' + esc(label) + '" aria-pressed="' + String(state.flightVariationDrone === row.drone) + '">' +
      '<span class="flight-variation-value">' + formatFlightReportNumber(row.hectares) + ' ha</span>' +
      '<span class="flight-variation-plot" aria-hidden="true"><span class="flight-variation-fill" style="height:' + height + '%"></span></span>' +
      '<span class="flight-variation-label">' + esc(row.drone) + '</span></button>';
  }).join('');
  const selected = report.rows.find(row => row.drone === state.flightVariationDrone);
  const detail = $('#flight-variation-details');
  if (!selected) {
    detail.innerHTML = '<p class="field-hint">Selecciona un dron para ver sus vuelos.</p>';
    return;
  }
  const flights = selected.records.map(record => {
    const date = flightReportDate(flightReportValue(record, 'fecha'));
    const area = flightNumber(flightReportValue(record, 'area_ha'));
    const summary = [
      date ? formatDate(date) : 'Sin fecha',
      record.ownerName || record.ownerUsername || 'Usuario',
      flightReportValue(record, 'labor') || 'Sin labor',
      flightReportValue(record, 'finca') || 'Sin finca',
      area !== null && area >= 0 ? formatFlightReportNumber(area) + ' ha' : 'Hectáreas sin dato'
    ].join(' · ');
    return '<details class="flight-variation-flight"><summary>' + esc(summary) + '</summary>' + recordDetailsMarkup(record) + '</details>';
  }).join('');
  detail.innerHTML = '<h2>' + esc(selected.drone) + ' · ' + formatFlightReportNumber(selected.hectares) +
    ' ha</h2><p class="field-hint">' + selected.flights + (selected.flights === 1 ? ' vuelo' : ' vuelos') +
    '. Abre cada vuelo para consultar sus datos.</p>' + (flights || emptyState('Este dron no tiene vuelos con los filtros seleccionados.'));
}
async function loadFlightVariation() {
  if (!state.user || state.user.status !== 'active') return;
  const user = { ...state.user };
  const sequence = ++state.flightVariationLoadSeq;
  let local = [];
  const button = $('#flight-variation-refresh');
  button.disabled = true;
  $('#flight-variation-status').textContent = 'Cargando vuelos…';
  try {
    local = (await getRecords()).filter(recordHasLotAccess);
    const offline = !navigator.onLine || !state.configured;
    const remote = [];
    if (!offline) {
      const ownerFilter = user.role === 'admin' ? '' : '&owner_id=eq.' + encodeURIComponent(user.id);
      for (let offset = 0, page; ; offset += 1000) {
        page = await cloudRequest('field_records?tipo=eq.vuelos' + ownerFilter +
          '&select=id,owner_id,tipo,created_at,schema_version,datos,review_status,reviewed_by,reviewed_at,review_note,profiles!field_records_owner_id_fkey(username,display_name)&order=created_at.desc,id.asc&limit=1000&offset=' + offset);
        remote.push(...page.map(mapCloudRecord));
        if (page.length < 1000) break;
      }
    }
    if (sequence !== state.flightVariationLoadSeq || !state.user || state.user.id !== user.id || state.user.role !== user.role) return;
    state.flightVariationRecords = mergeScopedReportRecords(remote, local, user, offline);
    state.flightVariationSource = offline
      ? 'Sin conexión al espacio compartido: se muestran solo los vuelos disponibles en este dispositivo.'
      : 'Se muestran los vuelos sincronizados y las capturas pendientes de este dispositivo.';
    updateFlightVariationOptions();
    renderFlightVariation();
  } catch (error) {
    if (sequence !== state.flightVariationLoadSeq) return;
    if (!state.user || state.user.id !== user.id || state.user.role !== user.role) return;
    const cached = error.connectionFailure ? mergeScopedReportRecords([], local, user, true) : [];
    if (cached.length) {
      state.flightVariationRecords = cached;
      state.flightVariationSource = 'No se pudo actualizar: se muestran datos guardados en este dispositivo, que pueden estar desactualizados.';
      updateFlightVariationOptions();
      renderFlightVariation();
      console.error('No se pudieron actualizar los vuelos para la gráfica.', error);
      return;
    }
    state.flightVariationRecords = [];
    state.flightVariationSource = '';
    updateFlightVariationOptions();
    renderFlightVariation();
    $('#flight-variation-total').textContent = '—';
    $('#flight-variation-count').textContent = 'Datos no disponibles';
    $('#flight-variation-chart').innerHTML = '';
    $('#flight-variation-details').innerHTML = '';
    $('#flight-variation-status').textContent = 'No se pudieron cargar los vuelos. Comprueba la conexión y pulsa Actualizar datos.';
    console.error('No se pudieron cargar los vuelos para la gráfica.', error);
  } finally {
    if (sequence === state.flightVariationLoadSeq) button.disabled = false;
  }
}
function recordDetailLabel(key) {
  const label = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  return label ? label.charAt(0).toLocaleUpperCase('es') + label.slice(1) : 'Dato';
}
function recordDetailFieldMarkup(key, value, depth) {
  return '<div class="record-detail-item"><dt>' + esc(recordDetailLabel(key)) + '</dt><dd>' + recordDetailValueMarkup(value, depth) + '</dd></div>';
}
function formatFileSize(size) {
  if (size < 1024) return size + ' B';
  if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
  return (size / 1048576).toFixed(1) + ' MB';
}
function recordDetailValueMarkup(value, depth) {
  if (value === null || value === undefined || value === '') return '<span class="record-detail-empty">Sin dato</span>';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return esc(value);
  if (depth > 6) return '<span class="record-detail-empty">Contenido anidado</span>';
  if (Array.isArray(value)) {
    if (!value.length) return '<span class="record-detail-empty">Sin datos</span>';
    return '<ol class="record-detail-list">' + value.map((item, index) => '<li><span class="record-detail-index">Elemento ' + (index + 1) + '</span>' + recordDetailValueMarkup(item, depth + 1) + '</li>').join('') + '</ol>';
  }
  if (typeof value === 'object') {
    if (typeof value.dataUrl === 'string' && value.dataUrl.startsWith('data:')) {
      const attachmentDetails = [
        typeof value.name === 'string' ? value.name : 'Archivo adjunto',
        typeof value.mimeType === 'string' ? value.mimeType : '',
        typeof value.size === 'number' && Number.isFinite(value.size) && value.size >= 0 ? formatFileSize(value.size) : ''
      ].filter(Boolean);
      return '<div class="record-detail-attachment"><strong>' + esc(attachmentDetails[0]) + '</strong><small>' + esc(attachmentDetails.slice(1).join(' · ') || 'Adjunto guardado con la captura.') + '</small></div>';
    }
    const fields = Object.entries(value);
    if (!fields.length) return '<span class="record-detail-empty">Sin datos</span>';
    return '<dl class="record-detail-nested">' + fields.map(([key, child]) => recordDetailFieldMarkup(key, child, depth + 1)).join('') + '</dl>';
  }
  return esc(String(value));
}
function recordDetailsMarkup(record) {
  const data = record.datos;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyState('Este registro no contiene campos para mostrar.');
  const fields = Object.entries(data);
  return fields.length
    ? '<dl class="record-detail-grid">' + fields.map(([key, value]) => recordDetailFieldMarkup(key, value, 0)).join('') + '</dl>'
    : emptyState('Este registro no contiene campos para mostrar.');
}
function normalizeVisitMapLotCode(value) {
  const code = String(value == null ? '' : value).trim();
  return /^\d{1,7}$/.test(code) ? code.padStart(7, '0') : code;
}
function decodeXlsxXmlText(value) {
  return String(value || '')
    .replace(/&(#x[\da-f]+|#\d+|lt|gt|quot|apos|amp);/g, entity => {
      const code = entity.slice(1, -1);
      if (code === 'lt') return '<';
      if (code === 'gt') return '>';
      if (code === 'quot') return '"';
      if (code === 'apos') return "'";
      if (code === 'amp') return '&';
      return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    });
}
function xlsxXmlAttribute(tag, name) {
  const attributes = String(tag || '').match(/[^\s=]+\s*=\s*("[^"]*"|'[^']*')/g) || [];
  for (const attribute of attributes) {
    const equals = attribute.indexOf('=');
    if (attribute.slice(0, equals).trim() !== name) continue;
    return decodeXlsxXmlText(attribute.slice(equals + 1).trim().replace(/^["']|["']$/g, ''));
  }
  return '';
}
function xlsxXmlTextElements(xml, elementName) {
  const matcher = new RegExp('<' + elementName + '\\b[^>]*>([\\s\\S]*?)<\\/' + elementName + '>', 'gi');
  return [...String(xml || '').matchAll(matcher)].map(match => decodeXlsxXmlText(match[1])).join('');
}
function xlsxZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const minimumOffset = Math.max(0, bytes.length - 65557);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error('El archivo no es un libro Excel .xlsx válido.');
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error('Este libro Excel usa un formato ZIP64 que no es compatible.');
  }
  if (centralOffset + centralSize > bytes.length) throw new Error('El índice ZIP del libro Excel está incompleto.');
  const centralEnd = centralOffset + centralSize;
  const entries = new Map();
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > centralEnd || view.getUint32(offset, true) !== 0x02014b50) throw new Error('No se pudo leer el índice del libro Excel.');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (offset + 46 + nameLength + extraLength + commentLength > centralEnd) throw new Error('El índice ZIP del libro Excel está incompleto.');
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error('Este libro Excel usa un formato ZIP64 que no es compatible.');
    }
    const nameStart = offset + 46;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error('No se pudo abrir un componente del libro Excel.');
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > bytes.length) throw new Error('Un componente del libro Excel está incompleto.');
    entries.set(name, { method, compressedSize, uncompressedSize, dataOffset });
    offset = nameStart + nameLength + extraLength + commentLength;
  }
  return { bytes, entries };
}
async function readXlsxZipEntry(zip, path) {
  const entry = zip.entries.get(path);
  if (!entry) return null;
  if (entry.uncompressedSize > 30 * 1024 * 1024) throw new Error('Una hoja del libro Excel supera el tamaño permitido.');
  const compressed = zip.bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  if (entry.method === 0) return new TextDecoder().decode(compressed);
  if (entry.method !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador no puede descomprimir el formato de este libro Excel.');
  }
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}
function normalizeXlsxPath(target) {
  const absolute = String(target || '').startsWith('/');
  const parts = absolute ? [] : ['xl'];
  for (const segment of String(target || '').replace(/^\/+/, '').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return parts.join('/');
}
function xlsxColumnIndex(reference) {
  const letters = /^([A-Z]+)\d+$/i.exec(String(reference || ''));
  if (!letters) return -1;
  let index = 0;
  for (const character of letters[1].toUpperCase()) index = index * 26 + character.charCodeAt(0) - 64;
  return index - 1;
}
function parseXlsxWorksheet(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of String(xml || '').matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/gi)) {
      const cell = cellMatch[0];
      const openEnd = cell.indexOf('>') + 1;
      const openTag = cell.slice(0, openEnd);
      const reference = xlsxXmlAttribute(openTag, 'r');
      const column = xlsxColumnIndex(reference);
      if (column < 0) continue;
      const type = xlsxXmlAttribute(openTag, 't');
      const body = cell.endsWith('/>') ? '' : cell.slice(openEnd, cell.lastIndexOf('</c>'));
      let value = '';
      if (type === 'inlineStr') {
        value = xlsxXmlTextElements(body, 't');
      } else {
        const valueMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(body);
        value = valueMatch ? decodeXlsxXmlText(valueMatch[1]) : '';
        if (type === 's' && value !== '') {
          const sharedIndex = Number(value);
          value = Number.isInteger(sharedIndex) ? sharedStrings[sharedIndex] || '' : '';
        } else if (type === 'b') {
          value = value === '1' ? 'TRUE' : 'FALSE';
        }
      }
      row[column] = value;
    }
    rows.push(row);
  }
  return rows;
}
async function parseXlsxWorkbook(file) {
  if (!file || !Number.isFinite(file.size) || file.size === 0) throw new Error('Selecciona un archivo Excel .xlsx.');
  if (file.size > 20 * 1024 * 1024) throw new Error('El archivo Excel supera el límite de 20 MB.');
  const zip = xlsxZipEntries(await file.arrayBuffer());
  const workbookXml = await readXlsxZipEntry(zip, 'xl/workbook.xml');
  const relationshipsXml = await readXlsxZipEntry(zip, 'xl/_rels/workbook.xml.rels');
  if (!workbookXml || !relationshipsXml) throw new Error('El archivo no contiene la estructura esperada de Excel.');
  const sheetTag = (workbookXml.match(/<sheet\b[^>]*>/i) || [])[0];
  if (!sheetTag) throw new Error('El libro Excel no tiene hojas para importar.');
  const relationshipId = xlsxXmlAttribute(sheetTag, 'r:id');
  const relationshipTag = (relationshipsXml.match(/<Relationship\b[^>]*>/gi) || [])
    .find(tag => xlsxXmlAttribute(tag, 'Id') === relationshipId);
  const sheetTarget = relationshipTag && xlsxXmlAttribute(relationshipTag, 'Target');
  if (!sheetTarget) throw new Error('No se pudo encontrar la primera hoja del libro Excel.');
  const worksheetXml = await readXlsxZipEntry(zip, normalizeXlsxPath(sheetTarget));
  if (!worksheetXml) throw new Error('No se pudo leer la primera hoja del libro Excel.');
  const sharedXml = await readXlsxZipEntry(zip, 'xl/sharedStrings.xml');
  const sharedStrings = sharedXml
    ? [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map(match => xlsxXmlTextElements(match[1], 't'))
    : [];
  return parseXlsxWorksheet(worksheetXml, sharedStrings);
}
function excelDateToIso(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text);
  if (iso) {
    const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return date.toISOString().slice(0, 10) === iso[1] + '-' + iso[2] + '-' + iso[3] ? iso[1] + '-' + iso[2] + '-' + iso[3] : null;
  }
  const localized = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (localized) {
    const day = Number(localized[1]), month = Number(localized[2]), year = Number(localized[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      : null;
  }
  return null;
}
function normalizeLotFollowupHeader(value) {
  return String(value == null ? '' : value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ');
}
function parseLotFollowupRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return { plans: [], errors: ['La primera hoja está vacía.'] };
  const requiredHeaders = ['FECHA SIEMBRA/CORTE', 'FINCA', 'LOTE', 'ESTADO', 'RESPONSABLE'];
  const headerIndex = rows.findIndex(row => {
    const headers = (row || []).map(normalizeLotFollowupHeader);
    return requiredHeaders.every(header => headers.includes(header));
  });
  if (headerIndex < 0) return { plans: [], errors: ['No se encontraron los encabezados requeridos: FECHA SIEMBRA/CORTE, FINCA, LOTE, ESTADO y RESPONSABLE.'] };
  const headers = (rows[headerIndex] || []).map(normalizeLotFollowupHeader);
  const column = name => headers.indexOf(name);
  const visitColumns = headers.map((header, index) => {
    const match = /^VISITA\s*(\d+)$/.exec(header);
    return match ? { number: Number(match[1]), index } : null;
  }).filter(Boolean).sort((a, b) => a.number - b.number);
  if (!visitColumns.length) return { plans: [], errors: ['Agrega por lo menos una columna VISITA 1, VISITA 2, etc.'] };
  if (visitColumns[0].number !== 1 || visitColumns.some((visit, index) => index > 0 && visit.number !== visitColumns[index - 1].number + 1)) {
    return { plans: [], errors: ['Las columnas de visitas deben estar numeradas en orden desde VISITA 1.'] };
  }
  const errors = [];
  const plans = [];
  const seenLots = new Set();
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];
    if (!row.some(value => String(value == null ? '' : value).trim())) continue;
    const rowNumber = rowIndex + 1;
    const lotCode = normalizeVisitMapLotCode(row[column('LOTE')]);
    const cycleDate = excelDateToIso(row[column('FECHA SIEMBRA/CORTE')]);
    if (!lotCode) errors.push('Fila ' + rowNumber + ': falta LOTE.');
    if (!cycleDate) errors.push('Fila ' + rowNumber + ': FECHA SIEMBRA/CORTE está vacía o no es válida.');
    if (lotCode && seenLots.has(lotCode)) errors.push('Fila ' + rowNumber + ': el lote ' + lotCode + ' aparece más de una vez en el archivo.');
    if (lotCode) seenLots.add(lotCode);
    const visitDates = [];
    let emptyVisitSeen = false;
    for (const visitColumn of visitColumns) {
      const value = excelDateToIso(row[visitColumn.index]);
      if (value === null) errors.push('Fila ' + rowNumber + ': VISITA ' + visitColumn.number + ' no contiene una fecha válida.');
      else if (!value) emptyVisitSeen = true;
      else {
        if (emptyVisitSeen) errors.push('Fila ' + rowNumber + ': completa las visitas en orden; falta una fecha anterior a VISITA ' + visitColumn.number + '.');
        visitDates.push({ number: visitColumn.number, date: value });
      }
    }
    if (visitDates.length > 5) errors.push('Fila ' + rowNumber + ': el ciclo admite como máximo cinco visitas programadas.');
    for (let index = 0; index < visitDates.length; index++) {
      if (cycleDate && visitDates[index].date < cycleDate) {
        errors.push('Fila ' + rowNumber + ': VISITA ' + visitDates[index].number + ' es anterior a la fecha de siembra/corte.');
      }
      if (index && visitDates[index].date < visitDates[index - 1].date) {
        errors.push('Fila ' + rowNumber + ': las fechas VISITA deben estar en orden cronológico.');
        break;
      }
      if (index && visitDates[index].date === visitDates[index - 1].date) {
        errors.push('Fila ' + rowNumber + ': dos visitas no pueden tener la misma fecha.');
        break;
      }
    }
    if (!lotCode || !cycleDate) continue;
    plans.push({
      lot_code: lotCode,
      cycle_date: cycleDate,
      finca: String(row[column('FINCA')] == null ? '' : row[column('FINCA')]).trim(),
      crop_state: String(row[column('ESTADO')] == null ? '' : row[column('ESTADO')]).trim(),
      responsible: String(row[column('RESPONSABLE')] == null ? '' : row[column('RESPONSABLE')]).trim(),
      visit_dates: visitDates.map(visit => visit.date)
    });
  }
  if (!plans.length && !errors.length) errors.push('No se encontraron filas de lotes para importar.');
  return { plans, errors };
}
function evaluateLotFollowup(plan, visits, today) {
  const lotCode = normalizeVisitMapLotCode(plan && plan.lot_code);
  const cycleDate = String(plan && plan.cycle_date || '').slice(0, 10);
  const scheduledDates = (Array.isArray(plan && plan.visit_dates) ? plan.visit_dates : [])
    .map(value => String(value || '').slice(0, 10)).filter(value => excelDateToIso(value) === value).sort();
  const uniqueVisits = new Map();
  (Array.isArray(visits) ? visits : []).forEach((visit, index) => {
    if (normalizeVisitMapLotCode(visit && visit.lot_code) !== lotCode) return;
    const date = String(visit && visit.visit_date || '').slice(0, 10);
    if (excelDateToIso(date) !== date || (cycleDate && date < cycleDate)) return;
    if (visit && visit.visit_number != null && visit.cycle_date && visit.cycle_date !== cycleDate) return;
    const recordId = String(visit && (visit.record_id || visit.id) || '');
    const key = recordId || lotCode + ':' + date + ':' + index;
    if (!uniqueVisits.has(key)) uniqueVisits.set(key, {
      record_id: recordId,
      visit_date: date,
      visit_number: visit && visit.visit_number,
      pending_sync: !!(visit && visit.pending_sync),
      conflict: !!(visit && visit.conflict)
    });
  });
  const actualVisits = [...uniqueVisits.values()].sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const requiredCount = scheduledDates.length;
  const assignedVisits = Array(requiredCount).fill(null);
  const historicalVisits = [];
  for (const visit of actualVisits) {
    if (visit.visit_number == null) {
      historicalVisits.push(visit);
      continue;
    }
    const number = Number(visit.visit_number);
    if (Number.isInteger(number) && number >= 1 && number <= requiredCount && !assignedVisits[number - 1]) {
      assignedVisits[number - 1] = visit;
    }
  }
  for (const visit of historicalVisits) {
    const index = assignedVisits.indexOf(null);
    if (index < 0) break;
    assignedVisits[index] = visit;
  }
  const slots = scheduledDates.map((dueDate, index) => {
    const actual = assignedVisits[index];
    return {
      number: index + 1,
      due_date: dueDate,
      visit_date: actual && actual.visit_date,
      pending_sync: !!(actual && actual.pending_sync),
      status: actual && actual.pending_sync ? (actual.conflict ? 'Conflicto por revisar' : 'Pendiente de sincronizar')
        : actual ? (actual.visit_date > dueDate ? 'Realizada tarde' : 'Realizada') : (dueDate < today ? 'Atrasada' : 'Pendiente')
    };
  });
  const pendingCount = slots.filter(slot => !slot.visit_date || slot.pending_sync).length;
  const overdueCount = slots.filter(slot => slot.status === 'Atrasada').length;
  const fulfilled = requiredCount > 0 && pendingCount === 0;
  const statusKey = !requiredCount ? 'unscheduled' : fulfilled ? 'complete' : overdueCount ? 'overdue' : 'pending';
  return {
    actualCount: actualVisits.length,
    requiredCount,
    pendingCount,
    overdueCount,
    fulfilled,
    statusKey,
    statusLabel: statusKey === 'complete' ? 'Cumplido' : statusKey === 'overdue' ? 'Atrasado' : statusKey === 'pending' ? 'Pendiente' : 'Sin visitas programadas',
    nextDueDate: slots.find(slot => !slot.visit_date)?.due_date || '',
    lastVisitDate: actualVisits.length ? actualVisits[actualVisits.length - 1].visit_date : '',
    actualVisits,
    extraVisits: actualVisits.filter(visit => !assignedVisits.includes(visit)),
    slots
  };
}
const LOT_WEEKLY_VISIT_WINDOW_DAYS = 5;
function normalizeLotFarmLabel(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLowerCase();
}
function normalizeLotWeeklyFarm(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}
function lotWeeklyProgramDate(value) {
  const date = String(value || '').slice(0, 10);
  return excelDateToIso(date) === date ? date : '';
}
function lotWeeklyProgramShiftDate(value, days) {
  const dateValue = lotWeeklyProgramDate(value);
  if (!dateValue || !Number.isInteger(days)) return '';
  const date = new Date(dateValue + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function lotWeeklyProgramWeekStart(value) {
  const dateValue = lotWeeklyProgramDate(value);
  if (!dateValue) return '';
  const date = new Date(dateValue + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
function lotWeeklyProgramDay(value) {
  const dateValue = lotWeeklyProgramDate(value);
  return dateValue ? new Date(dateValue + 'T00:00:00Z').getUTCDay() : null;
}
function lotWeeklyProgramDayName(value) {
  const dateValue = lotWeeklyProgramDate(value);
  return dateValue
    ? new Date(dateValue + 'T12:00:00Z').toLocaleDateString('es-GT', { weekday: 'long' })
    : '';
}
function lotWeeklyVisitAssignedDate(originalDate) {
  const date = lotWeeklyProgramDate(originalDate);
  return date && lotWeeklyProgramDay(date) === 0
    ? lotWeeklyProgramShiftDate(date, 1)
    : date;
}
function filterLotWeeklyPrograms(programs, farmFilter, weekFilter, dayFilter) {
  const farmKey = normalizeLotWeeklyFarm(farmFilter);
  const weekStart = lotWeeklyProgramWeekStart(weekFilter);
  const day = String(dayFilter || '');
  return (Array.isArray(programs) ? programs : [])
    .filter(program =>
      (!farmKey || normalizeLotWeeklyFarm(program.farm) === farmKey) &&
      (!weekStart || String(program.week_start || '').slice(0, 10) === weekStart) &&
      (!day || String(lotWeeklyProgramDay(program.scheduled_date)) === day)
    )
    .sort((a, b) =>
      String(b.week_start || '').localeCompare(String(a.week_start || '')) ||
      String(a.farm || '').localeCompare(String(b.farm || ''), 'es')
    );
}
function buildLotWeeklyVisitItems(plans, visits, lotLookup, today) {
  const items = [];
  const seen = new Set();
  for (const plan of Array.isArray(plans) ? plans : []) {
    const lotCode = normalizeVisitMapLotCode(plan && plan.lot_code);
    if (!lotCode) continue;
    const summary = evaluateLotFollowup(plan, visits, today);
    const lot = lotLookup && lotLookup[lotCode] || {};
    for (const slot of summary.slots.slice(0, 5)) {
      if (slot.visit_date) continue;
      const key = lotCode + ':' + slot.number + ':' + slot.due_date;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        farm: lot.finca || plan.finca || 'Sin finca',
        responsible: String(plan.responsible || '').trim(),
        lotCode,
        visitNumber: slot.number,
        cycleDate: String(plan.cycle_date || '').slice(0, 10),
        scheduledDate: slot.due_date,
        day: lotWeeklyProgramDay(slot.due_date),
        status: slot.due_date < today ? 'Vencida' : 'Pendiente',
        statusKey: slot.due_date < today ? 'overdue' : 'pending'
      });
    }
  }
  return items.sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate) ||
    a.farm.localeCompare(b.farm, 'es') ||
    a.lotCode.localeCompare(b.lotCode) ||
    a.visitNumber - b.visitNumber
  );
}
function filterLotWeeklyVisits(visits, farmFilter, dayFilter, responsibleFilter) {
  const farmKey = normalizeLotWeeklyFarm(farmFilter);
  const day = String(dayFilter || '');
  const responsibleKey = String(responsibleFilter || '').trim().toLocaleLowerCase();
  return (Array.isArray(visits) ? visits : []).filter(visit =>
    (!farmKey || normalizeLotWeeklyFarm(visit.farm) === farmKey) &&
    (!day || String(visit.day) === day) &&
    (!responsibleKey || String(visit.responsible || '').trim().toLocaleLowerCase() === responsibleKey)
  );
}
function groupLotWeeklyVisits(visits) {
  const visitsByFarm = new Map();
  (Array.isArray(visits) ? visits : []).forEach(visit => {
    const key = normalizeLotWeeklyFarm(visit.farm);
    if (!visitsByFarm.has(key)) visitsByFarm.set(key, []);
    visitsByFarm.get(key).push(visit);
  });
  const groups = [];
  for (const farmVisits of visitsByFarm.values()) {
    farmVisits.sort((a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      a.lotCode.localeCompare(b.lotCode) ||
      a.visitNumber - b.visitNumber
    );
    let group = null;
    for (const visit of farmVisits) {
      if (!group || visit.scheduledDate > lotWeeklyProgramShiftDate(group.anchorDate, 5)) {
        group = {
          farm: visit.farm,
          anchorDate: visit.scheduledDate,
          assignedDate: lotWeeklyVisitAssignedDate(visit.scheduledDate),
          weekStart: lotWeeklyProgramWeekStart(lotWeeklyVisitAssignedDate(visit.scheduledDate)),
          visits: []
        };
        groups.push(group);
      }
      group.visits.push(visit);
    }
  }
  return groups.sort((a, b) =>
    a.assignedDate.localeCompare(b.assignedDate) ||
    a.farm.localeCompare(b.farm, 'es')
  );
}
function filterLotWeeklyVisitGroups(groups, farmFilter, dayFilter, responsibleFilter) {
  const farmKey = normalizeLotWeeklyFarm(farmFilter);
  const day = String(dayFilter || '');
  const responsibleKey = String(responsibleFilter || '').trim().toLocaleLowerCase();
  return (Array.isArray(groups) ? groups : []).reduce((filtered, group) => {
    if ((farmKey && normalizeLotWeeklyFarm(group.farm) !== farmKey) ||
        (day && String(lotWeeklyProgramDay(group.assignedDate)) !== day)) return filtered;
    const visits = group.visits.filter(visit =>
      !responsibleKey || String(visit.responsible || '').trim().toLocaleLowerCase() === responsibleKey
    );
    if (visits.length) filtered.push({ ...group, visits });
    return filtered;
  }, []);
}
function filterWeeklyScheduleGroups(groups, farmFilter, weekFilter) {
  const farmKey = normalizeLotWeeklyFarm(farmFilter);
  const weekStart = lotWeeklyProgramWeekStart(weekFilter);
  return (Array.isArray(groups) ? groups : []).filter(group =>
    (!farmKey || normalizeLotWeeklyFarm(group.farm) === farmKey) &&
    (!weekStart || group.weekStart === weekStart)
  );
}
function lotWeeklyVisitGroupCard(group) {
  const rows = group.visits.map(visit =>
    '<tr><td><strong>Lote ' + esc(visit.lotCode) + '</strong></td>' +
      '<td>Visita ' + visit.visitNumber + '</td>' +
      '<td>' + esc(formatDate(visit.scheduledDate)) + '</td>' +
      '<td>' + esc(visit.responsible || '—') + '</td>' +
      '<td>' + esc(formatDate(group.assignedDate)) + '</td>' +
      '<td><span class="lot-followup-status-pill is-' + visit.statusKey + '">' + visit.status + '</span></td></tr>'
  ).join('');
  const dayName = lotWeeklyProgramDayName(group.assignedDate);
  const captureVisits = group.visits.map(visit => ({
    farm: group.farm,
    lotCode: visit.lotCode,
    visitNumber: visit.visitNumber,
    cycleDate: visit.cycleDate,
    scheduledDate: visit.scheduledDate,
    responsible: visit.responsible
  }));
  return '<article class="lot-weekly-program-card">' +
    '<div class="lot-weekly-program-heading"><div><h3>' + esc(group.farm) + '</h3>' +
      '<p><strong>' + esc(dayName.charAt(0).toLocaleUpperCase('es-GT') + dayName.slice(1)) +
        '</strong> · Fecha asignada: ' + esc(formatDate(group.assignedDate)) +
        ' · Visitas agrupadas: ' + group.visits.length + '</p></div>' +
      '<button type="button" class="primary-button" data-weekly-capture-date="' + esc(group.assignedDate) +
      '" data-weekly-capture-group="' +
      esc(JSON.stringify(captureVisits)) + '">Capturar visitas del día (' + group.visits.length + ')</button></div>' +
    '<div class="lot-weekly-program-table-wrap"><table class="lot-weekly-program-table">' +
      '<thead><tr><th>Lote</th><th>Visita</th><th>Fecha programada original</th><th>Responsable</th><th>Fecha asignada</th><th>Estado</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></article>';
}
function lotWeeklyProgramWindow(referenceDate) {
  const date = lotWeeklyProgramDate(referenceDate);
  if (!date) return null;
  return {
    start: lotWeeklyProgramShiftDate(date, -LOT_WEEKLY_VISIT_WINDOW_DAYS),
    end: lotWeeklyProgramShiftDate(date, LOT_WEEKLY_VISIT_WINDOW_DAYS)
  };
}
function lotWeeklyProgramCandidates(plans, lotLookup, farm, scheduledDate, existingProgram) {
  const date = lotWeeklyProgramDate(scheduledDate);
  const normalizedFarm = normalizeLotWeeklyFarm(farm);
  if (!date || !normalizedFarm) return [];
  const savedReferences = new Map(
    (Array.isArray(existingProgram && existingProgram.members) ? existingProgram.members : [])
      .map(member => [normalizeVisitMapLotCode(member && member.lot_code), member && member.reference_date])
  );
  const seen = new Set();
  return (Array.isArray(plans) ? plans : []).reduce((candidates, plan) => {
    const lotCode = normalizeVisitMapLotCode(plan && plan.lot_code);
    const lot = lotLookup && lotLookup[lotCode] || {};
    const referenceDate = lotWeeklyProgramDate(savedReferences.get(lotCode) || plan && plan.cycle_date);
    const window = lotWeeklyProgramWindow(referenceDate);
    const planFarm = lot.finca || plan && plan.finca || '';
    if (!lotCode || seen.has(lotCode) || !window ||
        normalizeLotWeeklyFarm(planFarm) !== normalizedFarm ||
        date < window.start || date > window.end) return candidates;
    seen.add(lotCode);
    candidates.push({
      lotCode,
      farm: planFarm,
      referenceDate,
      allowedStart: window.start,
      allowedEnd: window.end
    });
    return candidates;
  }, []).sort((a, b) => a.lotCode.localeCompare(b.lotCode));
}
function lotWeeklyProgramDateBounds(program) {
  const weekStart = lotWeeklyProgramDate(program && program.week_start);
  const members = Array.isArray(program && program.members) ? program.members : [];
  if (!weekStart) return null;
  const windows = members.map(member => lotWeeklyProgramWindow(member && member.reference_date));
  if (windows.some(window => !window)) return null;
  const weekEnd = lotWeeklyProgramShiftDate(weekStart, 6);
  const protectedStart = lotWeeklyProgramDate(program && program.protected_date_start);
  const protectedEnd = lotWeeklyProgramDate(program && program.protected_date_end);
  const allowedStart = windows.reduce((latest, window) => window.start > latest ? window.start : latest,
    protectedStart && protectedStart > weekStart ? protectedStart : weekStart);
  const allowedEnd = windows.reduce((earliest, window) => window.end < earliest ? window.end : earliest,
    protectedEnd && protectedEnd < weekEnd ? protectedEnd : weekEnd);
  return { start: allowedStart, end: allowedEnd, valid: allowedStart <= allowedEnd };
}
function visitMapControlPercent(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const normalized = typeof value === 'string' ? value.trim().replace(/%$/, '').trim().replace(',', '.') : value;
  if (normalized === '') return null;
  const percent = Number(normalized);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : null;
}
function malezasCoveragePercent(controlValue) {
  const control = visitMapControlPercent(controlValue);
  return control == null ? null : Number((100 - control).toFixed(2));
}
function malezasReportImages(value) {
  const images = Array.isArray(value) ? value : value ? [value] : [];
  return images.filter(image =>
    image && typeof image.dataUrl === 'string' &&
    /^data:image\/[a-z0-9.+-]+;base64,/i.test(image.dataUrl)
  );
}
function malezasReportRows(record) {
  const data = record.datos || {};
  const details = data.subregistros && Array.isArray(data.subregistros.malezas_detalle)
    ? data.subregistros.malezas_detalle
    : [];
  const source = details.length
    ? details
    : normalizeVisitMapLotCode(data.LOTE == null ? data.lote : data.LOTE) ? [data] : [];
  return source.filter(detail => detail && typeof detail === 'object').map(detail => {
    const controlValue = detail['% CONTROL'];
    return {
      lotCode: normalizeVisitMapLotCode(detail.LOTE == null ? detail.lote : detail.LOTE),
      date: String(detail.FECHA || data.FECHA || data.fecha || ''),
      labor: String(detail.LABOR || ''),
      controlPercent: visitMapControlPercent(controlValue),
      coveragePercent: malezasCoveragePercent(controlValue),
      observations: String(detail.OBSERVACIONES || ''),
      catorcena: String(detail.CATORCENA || ''),
      images: malezasReportImages(detail.IMAGEN)
    };
  });
}
function formatVisitMapControlPercent(percent) {
  return Number(percent.toFixed(2)).toString() + '%';
}
function visitMapControlClass(stats) {
  if (!stats) return '';
  const percent = stats.latestControlPercent;
  if (!Number.isFinite(percent)) return ' is-visited control-missing';
  if (percent < 25) return ' is-visited control-low';
  if (percent < 50) return ' is-visited control-medium-low';
  if (percent < 75) return ' is-visited control-medium-high';
  return ' is-visited control-high';
}
function malezasReportControlClass(percent) {
  if (!Number.isFinite(percent)) return 'control-missing';
  if (percent > 85) return 'control-high';
  if (percent >= 75) return 'control-medium-high';
  if (percent >= 70) return 'control-medium-low';
  return 'control-low';
}
function visitStatsByLot(records) {
  const stats = new Map();
  for (const record of records) {
    if (record.tipo !== 'malezas') continue;
    const data = record.datos || {};
    const details = data.subregistros && Array.isArray(data.subregistros.malezas_detalle)
      ? data.subregistros.malezas_detalle
      : [];
    const recordLots = new Map();
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue;
      const code = normalizeVisitMapLotCode(detail.LOTE == null ? detail.lote : detail.LOTE);
      if (!code) continue;
      const date = String(detail.FECHA || data.FECHA || data.fecha || record.createdAt || '');
      const sample = { date, controlPercent: visitMapControlPercent(detail['% CONTROL']) };
      const previous = recordLots.get(code);
      if (!previous || date >= previous.date) recordLots.set(code, sample);
    }
    if (!recordLots.size) {
      const code = normalizeVisitMapLotCode(data.LOTE == null ? data.lote : data.LOTE);
      if (code) {
        recordLots.set(code, {
          date: String(data.FECHA || data.fecha || record.createdAt || ''),
          controlPercent: visitMapControlPercent(data['% CONTROL'])
        });
      }
    }
    for (const [code, sample] of recordLots) {
      const lotStats = stats.get(code) || {
        visits: 0,
        pendingVisits: 0,
        conflictVisits: 0,
        latestDate: '',
        latestSampleDate: '',
        latestControlPercent: null,
        owners: new Set()
      };
      lotStats.visits += 1;
      if (record.syncStatus === 'pending') lotStats.pendingVisits += 1;
      if (record.pendingConflict) lotStats.conflictVisits += 1;
      if (sample.date && sample.date > lotStats.latestDate) lotStats.latestDate = sample.date;
      if (!lotStats.latestSampleDate || sample.date >= lotStats.latestSampleDate) {
        lotStats.latestSampleDate = sample.date;
        lotStats.latestControlPercent = sample.controlPercent;
      }
      const owner = String(record.ownerName || data.RESPONSABLE || data.responsable || '').trim();
      if (owner) lotStats.owners.add(owner);
      stats.set(code, lotStats);
    }
  }
  return stats;
}
function visitMapRings(boundary) {
  const geometry = boundary && boundary.geometry;
  if (!geometry || geometry.crs !== 'EPSG:32615' || !Array.isArray(geometry.rings) || !geometry.rings.length) return null;
  const rings = [];
  for (const ring of geometry.rings) {
    if (!Array.isArray(ring) || ring.length < 4) return null;
    const points = [];
    for (const point of ring) {
      if (!Array.isArray(point) || point.length < 2) return null;
      const x = Number(point[0]), y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      points.push([x, y]);
    }
    if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) {
      points.push(points[0]);
    }
    if (points.length < 4) return null;
    rings.push(points);
  }
  return rings;
}
function malezasReportMapSvg(boundaries, rows) {
  const latestByLot = new Map();
  for (const row of rows) {
    if (!row.lotCode) continue;
    const previous = latestByLot.get(row.lotCode);
    if (!previous || row.date >= previous.date) latestByLot.set(row.lotCode, row);
  }
  const lots = [];
  for (const boundary of boundaries) {
    const lotCode = normalizeVisitMapLotCode(boundary && boundary.lot_code);
    const sample = latestByLot.get(lotCode);
    if (!lotCode || !sample) continue;
    const rings = boundary && Array.isArray(boundary.rings) ? boundary.rings : visitMapRings(boundary);
    if (!rings) continue;
    lots.push({
      lot_code: lotCode,
      rings,
      finca: String(boundary.finca || ''),
      sample
    });
  }
  const lotCodes = new Set(lots.map(lot => lot.lot_code));
  if (!lots.length) {
    return {
      markup: '<div class="malezas-report-map-empty">No se encontraron geometrías para los lotes de esta captura.</div>',
      lotCodes
    };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const lot of lots) {
    for (const ring of lot.rings) {
      for (const point of ring) {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
      }
    }
  }
  const width = 1000, height = 620, padding = 28;
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const innerWidth = width - padding * 2, innerHeight = height - padding * 2;
  const scale = Math.min(innerWidth / spanX, innerHeight / spanY);
  const offsetX = padding + (innerWidth - spanX * scale) / 2;
  const offsetY = padding + (innerHeight - spanY * scale) / 2;
  const project = point => [
    offsetX + (point[0] - minX) * scale,
    height - offsetY - (point[1] - minY) * scale
  ];
  const shapes = lots.map(lot => {
    const path = lot.rings.map(ring => {
      const first = project(ring[0]);
      return 'M ' + first[0].toFixed(1) + ' ' + first[1].toFixed(1) + ' ' +
        ring.slice(1).map(point => {
          const projected = project(point);
          return 'L ' + projected[0].toFixed(1) + ' ' + projected[1].toFixed(1);
        }).join(' ') + ' Z';
    }).join(' ');
    const className = ' is-visited ' + malezasReportControlClass(lot.sample.controlPercent);
    const control = lot.sample.controlPercent == null
      ? 'Sin dato de control'
      : 'Control ' + formatVisitMapControlPercent(lot.sample.controlPercent);
    const outerRing = lot.rings[0].slice(0, -1);
    const center = outerRing.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
      .map(value => value / Math.max(outerRing.length, 1));
    const labelPoint = project(center);
    return '<path class="malezas-map-lot' + className + '" d="' + path + '" fill-rule="evenodd"><title>' +
      esc('Lote ' + lot.lot_code + (lot.finca ? ' · ' + lot.finca : '') + ' · ' + control) +
      '</title></path><text class="malezas-map-label" x="' + labelPoint[0].toFixed(1) + '" y="' +
      labelPoint[1].toFixed(1) + '">' + esc(lot.lot_code) + '</text>';
  }).join('');
  return {
    markup: '<svg class="malezas-report-map-svg" viewBox="0 0 ' + width + ' ' + height +
      '" role="img" aria-label="Mapa de lotes muestreados, coloreados por porcentaje de control">' + shapes + '</svg>',
    lotCodes
  };
}
function renderVisitMap(boundaries, visits) {
  const lots = [];
  let skipped = 0;
  for (const boundary of boundaries) {
    const lotCode = normalizeVisitMapLotCode(boundary && boundary.lot_code);
    const rings = visitMapRings(boundary);
    if (!lotCode || !userCanAccessZone(boundary.zone) || !rings) {
      skipped += 1;
      continue;
    }
    lots.push({
      lot_code: lotCode,
      zone: String(boundary.zone || ''),
      finca: String(boundary.finca || ''),
      rings
    });
  }
  const stage = $('#visit-map-stage');
  const legend = $('#visit-map-legend');
  const summary = $('#visit-map-summary');
  const detail = $('#visit-map-detail');
  if (!lots.length) {
    state.visitMap = null;
    legend.hidden = true;
    summary.textContent = '';
    detail.textContent = '';
    stage.innerHTML = emptyState(boundaries.length
      ? 'No se encontraron geometrías válidas para las zonas asignadas.'
      : 'No hay geometrías disponibles. Aplica la migración del mapa e importa el ZIP del maestro de lotes.');
    $('#visit-map-status').textContent = 'El mapa no contiene lotes para mostrar.';
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const lot of lots) {
    for (const ring of lot.rings) {
      for (const point of ring) {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
      }
    }
  }
  const width = 1000, height = 640, padding = 18;
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const innerWidth = width - padding * 2, innerHeight = height - padding * 2;
  const scale = Math.min(innerWidth / spanX, innerHeight / spanY);
  const offsetX = padding + (innerWidth - spanX * scale) / 2;
  const offsetY = padding + (innerHeight - spanY * scale) / 2;
  const project = point => [
    offsetX + (point[0] - minX) * scale,
    height - offsetY - (point[1] - minY) * scale
  ];
  const lotMetadata = new Map();
  const paths = lots.map(lot => {
    const stats = visits.get(lot.lot_code);
    const visitLabel = !stats
      ? ' · Sin muestreo'
      : ' · ' + stats.visits + (stats.visits === 1 ? ' visita' : ' visitas') +
        (stats.latestControlPercent == null ? ' · Sin % de control' : ' · Control ' + formatVisitMapControlPercent(stats.latestControlPercent)) +
        (stats.latestDate ? ' · Último muestreo ' + formatDate(String(stats.latestDate).slice(0, 10)) : '');
    const label = lot.lot_code + ' · ' + (lot.finca || 'Finca sin nombre') + ' · Zona ' + lot.zone + visitLabel;
    const path = lot.rings.map(ring => {
      const first = project(ring[0]);
      return 'M ' + first[0].toFixed(1) + ' ' + first[1].toFixed(1) + ' ' +
        ring.slice(1).map(point => {
          const projected = project(point);
          return 'L ' + projected[0].toFixed(1) + ' ' + projected[1].toFixed(1);
        }).join(' ') + ' Z';
    }).join(' ');
    lotMetadata.set(lot.lot_code, { lot_code: lot.lot_code, zone: lot.zone, finca: lot.finca });
    return '<path class="visit-map-lot' + visitMapControlClass(stats) + '" data-visit-lot="' + esc(lot.lot_code) +
      '" d="' + path + '" fill-rule="evenodd" tabindex="0" role="button" aria-label="' + esc(label) +
      '"><title>' + esc(label) + '</title></path>';
  }).join('');
  const visitedLots = lots.filter(lot => visits.has(lot.lot_code)).length;
  const lotsWithControl = lots.filter(lot => {
    const stats = visits.get(lot.lot_code);
    return stats && stats.latestControlPercent != null;
  }).length;
  const totalVisits = lots.reduce((total, lot) => total + (visits.get(lot.lot_code) ? visits.get(lot.lot_code).visits : 0), 0);
  const pendingVisits = lots.reduce((total, lot) => total + (visits.get(lot.lot_code) ? visits.get(lot.lot_code).pendingVisits : 0), 0);
  const unmatchedVisits = [...visits.keys()].filter(code => !lotMetadata.has(code)).length;
  const validLotCodes = new Set(lots.map(lot => lot.lot_code));
  const reportBoundaries = boundaries.filter(boundary =>
    validLotCodes.has(normalizeVisitMapLotCode(boundary && boundary.lot_code))
  );
  state.visitMap = { lots: lotMetadata, visits, boundaries: reportBoundaries };
  summary.textContent = visitedLots + ' de ' + lots.length + ' lotes muestreados · ' +
    totalVisits + (totalVisits === 1 ? ' visita registrada' : ' visitas registradas') +
    ' · ' + lotsWithControl + ' con % de control';
  detail.textContent = 'Selecciona un lote para consultar su último porcentaje de control.';
  stage.innerHTML = '<svg class="visit-map-svg" viewBox="0 0 ' + width + ' ' + height +
    '" role="group" aria-label="Límites de lotes; el color indica el último porcentaje de control registrado">' + paths + '</svg>';
  legend.hidden = false;
  const notices = [];
  if (skipped) notices.push(skipped + ' geometrías inválidas o fuera de zona se omitieron.');
  if (unmatchedVisits) notices.push(unmatchedVisits + ' lotes visitados no tienen geometría importada.');
  if (pendingVisits) notices.push(pendingVisits + ' visita(s) mostradas están pendientes de sincronización o revisión.');
  $('#visit-map-status').textContent = (notices.length ? notices.join(' ') + ' ' : '') +
    'El color representa el % CONTROL del muestreo más reciente.';
}
async function loadVisitMapBoundaries() {
  const boundaries = [];
  for (let offset = 0, page; ; offset += 1000) {
    page = await cloudRequest(
      'field_lot_boundaries?select=lot_code,zone,finca,geometry&order=lot_code.asc&limit=1000&offset=' + offset
    );
    if (!Array.isArray(page)) throw new Error('Supabase devolvió una lista de geometrías no válida.');
    boundaries.push(...page);
    if (page.length < 1000) return boundaries;
  }
}
async function loadBoundariesForReport() {
  const user = { ...state.user, allowedZones: [...(state.user.allowedZones || [])] };
  const key = offlineSnapshotKey('boundaries', user);
  if (state.configured && navigator.onLine) {
    try {
      const boundaries = await loadVisitMapBoundaries();
      if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la consulta.');
      try {
        await putOfflineSnapshot({ id: key, savedAt: new Date().toISOString(), boundaries });
      } catch (error) {
        console.error('No se pudieron guardar los límites para uso sin conexión.', error);
        toast('Mapa cargado, pero no se pudo guardar una copia para uso sin conexión.');
      }
      if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la consulta.');
      return { boundaries, savedAt: null };
    } catch (error) {
      if (!sameOfflineScope(user) || !error.connectionFailure) throw error;
      console.warn('No se pudieron actualizar los límites del mapa.', error);
    }
  }
  const snapshot = await getOfflineSnapshot(key);
  if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la consulta.');
  if (!snapshot || !Array.isArray(snapshot.boundaries) || !snapshot.savedAt) {
    throw new Error('No hay límites guardados para esta cuenta. Conéctate y abre el mapa primero.');
  }
  return { boundaries: snapshot.boundaries, savedAt: snapshot.savedAt };
}
function selectVisitMapLot(lotCode) {
  const map = state.visitMap;
  const lot = map && map.lots.get(lotCode);
  if (!lot) return;
  const stats = map.visits.get(lotCode);
  const details = [lot.lot_code, lot.finca || 'Finca sin nombre', 'Zona ' + lot.zone];
  if (stats) {
    details.push(stats.visits + (stats.visits === 1 ? ' visita' : ' visitas'));
    if (stats.pendingVisits) details.push(stats.pendingVisits + ' pendiente(s) de sincronizar');
    if (stats.conflictVisits) details.push(stats.conflictVisits + ' conflicto(s) por revisar');
    details.push('Último muestreo: ' + (stats.latestDate ? formatDate(String(stats.latestDate).slice(0, 10)) : 'Sin fecha'));
    details.push('Control de maleza: ' + (stats.latestControlPercent == null
      ? 'Sin dato'
      : formatVisitMapControlPercent(stats.latestControlPercent)));
    if (stats.owners.size) details.push('Responsables: ' + [...stats.owners].sort((a, b) => a.localeCompare(b, 'es')).join(', '));
  } else {
    details.push('Sin visitas registradas');
  }
  $('#visit-map-detail').textContent = details.join(' · ');
  $$('.visit-map-lot', $('#visit-map-stage')).forEach(path => {
    path.classList.toggle('is-selected', path.dataset.visitLot === lotCode);
  });
}
async function openVisitMap() {
  if (!state.user || !['admin', 'supervisor'].includes(state.user.role)) {
    toast('El mapa de muestreos está disponible para supervisores y administradores.');
    return;
  }
  const dialog = $('#visit-map-dialog');
  if (typeof dialog.showModal !== 'function') {
    toast('Este navegador no permite abrir el mapa de muestreos.');
    return;
  }
  if (!dialog.open) dialog.showModal();
  const user = { ...state.user, allowedZones: [...(state.user.allowedZones || [])] };
  const button = $('#open-visit-map');
  button.disabled = true;
  $('#visit-map-summary').textContent = '';
  $('#visit-map-status').textContent = 'Cargando los lotes y muestreos autorizados…';
  $('#visit-map-detail').textContent = '';
  $('#visit-map-stage').innerHTML = '';
  $('#visit-map-legend').hidden = true;
  try {
    const [snapshot, records, groups] = await Promise.all([loadBoundariesForReport(), getRecords(), getWeeklyVisitOutbox()]);
    if (!sameOfflineScope(user) || !['admin', 'supervisor'].includes(state.user.role)) {
      throw new Error('Tu perfil ya no tiene acceso al mapa de muestreos.');
    }
    const queued = groups.filter(canAccessWeeklyOutbox).flatMap(group => group.captures.map(capture => ({
      id: capture.record_id, tipo: 'malezas', datos: capture.datos, createdAt: group.createdAt,
      ownerId: user.id, ownerUsername: user.username, ownerName: user.displayName,
      syncStatus: 'pending', pendingConflict: group.status === 'conflict'
    })));
    const queuedIds = new Set(queued.map(record => record.id));
    const visibleRecords = visibleLocalRecords(records.filter(record => !queuedIds.has(record.id)).concat(queued))
      .filter(record => record.tipo === 'malezas');
    renderVisitMap(snapshot.boundaries, visitStatsByLot(visibleRecords));
    if (snapshot.savedAt) $('#visit-map-status').textContent +=
      ' Límites guardados el ' + offlineSnapshotDate(snapshot) + '; pueden estar desactualizados.';
  } catch (error) {
    console.error('No se pudo cargar el mapa de muestreos.', error);
    state.visitMap = null;
    $('#visit-map-summary').textContent = '';
    $('#visit-map-detail').textContent = '';
    $('#visit-map-legend').hidden = true;
    $('#visit-map-stage').innerHTML = emptyState('No se pudo cargar el mapa de muestreos.');
    $('#visit-map-status').textContent = error.message || 'Ocurrió un error al cargar los lotes y visitas.';
  } finally {
    button.disabled = false;
  }
}
function recordDetailTime(value) {
  const text = String(value || '').trim();
  const oldDateTime = text.match(/T(\d{2}:\d{2})/);
  return oldDateTime ? oldDateTime[1] : text;
}
async function showRecordDetails(recordId) {
  const record = await getRecord(recordId);
  if (!record || !visibleLocalRecords([record]).length) {
    toast('Este registro no está disponible para tu perfil.');
    return;
  }
  const data = record.datos || {};
  const site = data.finca || data.lote || data.id_lote;
  const date = data.fecha || data.FECHA;
  const time = recordDetailTime(data.hora_registro);
  const summary = [
    record.ownerName || data.responsable,
    site,
    date ? formatDate(date) : '',
    time ? 'Hora ' + time : '',
    recordStatus(record)
  ].filter(Boolean).join(' · ');
  const dialog = $('#record-detail-dialog');
  $('#record-detail-title').textContent = titleFor(record);
  $('#record-detail-summary').textContent = summary;
  $('#record-detail-content').innerHTML = recordDetailsMarkup(record);
  if (typeof dialog.showModal !== 'function') {
    toast('Este navegador no permite abrir el detalle de registros.');
    return;
  }
  if (!dialog.open) dialog.showModal();
}
function recordRow(record, management) {
  const module = modules[record.tipo] || { icon: '•' };
  const site = record.datos.finca || record.datos.lote || record.datos.id_lote || 'Sin finca/lote';
  const detail = [site, record.ownerName, formatDate(record.datos.fecha || record.datos.FECHA)].filter(Boolean).join(' · ');
  const reviewer = isActiveAdmin();
  const status = recordStatus(record);
  const actions = reviewer && record.ownerId && record.ownerId !== state.user.id && record.reviewStatus === 'pending'
    ? '<span class="record-review-actions"><button type="button" data-review="approved" data-record-id="' + esc(record.id) + '">Aprobar</button><button type="button" data-review="rejected" data-record-id="' + esc(record.id) + '">Rechazar</button></span>'
    : '';
  const manageActions = management && canManageRecord(record)
    ? '<span class="record-manage-actions"><button type="button" class="record-view-button" data-edit-record="' + esc(record.id) + '">Editar</button><button type="button" class="record-delete-button" data-delete-record="' + esc(record.id) + '">Eliminar</button></span>'
    : '';
  const viewAction = '<button type="button" class="record-view-button" data-view-record="' + esc(record.id) + '" aria-label="Ver datos de ' + esc(titleFor(record)) + '">Ver datos</button>';
  const pdfAction = record.tipo === 'epp' ? '<button type="button" class="record-view-button" data-epp-pdf="' + esc(record.id) + '" aria-label="Generar PDF de ' + esc(titleFor(record)) + '">Generar PDF</button>' : '';
  const malezasPdfAction = record.tipo === 'malezas' ? '<button type="button" class="record-view-button" data-malezas-pdf="' + esc(record.id) + '" aria-label="Generar reporte PDF de ' + esc(titleFor(record)) + '">Generar PDF</button>' : '';
  return '<article class="record-row"><span class="record-symbol" aria-hidden="true">' + module.icon + '</span><span class="record-info"><strong>' + esc(titleFor(record)) + '</strong><small>' + esc(detail) + '</small></span><span class="record-status">' + esc(status) + '</span>' + viewAction + pdfAction + malezasPdfAction + actions + manageActions + '</article>';
}
function emptyState(message) { return '<div class="empty-state">' + esc(message) + '</div>'; }
function canAccessWeeklyOutbox(group) {
  return !!state.user && state.user.status === 'active' && group.userId === state.user.id &&
    Array.isArray(group.captures) && group.captures.every(capture =>
      recordHasLotAccess({ datos: capture.datos }));
}
function weeklyOutboxMarkup(group) {
  if (!canAccessWeeklyOutbox(group)) {
    return '<div class="status-strip warning-strip"><span>!</span><div><strong>Visitas pendientes con acceso cambiado</strong>' +
      '<small>Contacta al administrador para revisar los permisos. Los datos permanecen en este dispositivo.</small></div></div>';
  }
  const status = group.status === 'conflict' ? 'Conflicto por revisar' : 'Pendiente de sincronizar';
  return '<article class="record-row"><div class="record-info"><strong>' + esc(group.farm) +
    ' · ' + group.captures.length + ' visita(s)</strong><small>' + esc(status) +
    (group.error ? ': ' + esc(group.error) : '') + '</small><details><summary>Revisar datos</summary>' +
    group.captures.map(capture => recordDetailsMarkup({ datos: capture.datos })).join('') +
    '</details><button type="button" class="record-view-button" data-export-weekly="' + esc(group.id) +
    '">Descargar para revisión</button>' +
    (group.status === 'conflict' ? '<button type="button" class="record-view-button" data-edit-weekly="' +
      esc(group.id) + '">Editar para revisión</button><button type="button" class="record-view-button" data-retry-weekly="' +
      esc(group.id) + '">Reintentar</button>' : '') + '</div></article>';
}
async function retryWeeklyOutbox(id) {
  if (state.syncBusy) throw new Error('Espera a que termine la sincronización antes de reintentar.');
  const group = (await getWeeklyVisitOutbox()).find(item => item.id === id);
  if (!group || !canAccessWeeklyOutbox(group) || !canAccessLotFollowup() || !userCanOpenModule('malezas')) {
    throw new Error('No tienes acceso a este grupo de visitas.');
  }
  group.scope = offlineSnapshotKey('scope', state.user);
  group.status = 'pending';
  group.error = '';
  await writeWeeklyVisitOutbox(group, 'replace-conflict');
  await refreshLists();
  if (navigator.onLine) await syncCloudRecords(false);
  else toast('El grupo se reintentará al recuperar la conexión.');
}
async function refreshLists() {
  if (!state.db || !state.user) return;
  const user = { ...state.user, allowedZones: [...(state.user.allowedZones || [])] };
  const localRecords = await getRecords();
  const weeklyGroups = (await getWeeklyVisitOutbox()).filter(group => group.userId === user.id);
  if (!sameOfflineScope(user)) return;
  const records = visibleLocalRecords(localRecords).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = records.filter(record => record.syncStatus === 'pending');
  const queuedDeletions = localRecords.filter(record =>
    record.syncStatus === 'delete-pending' &&
    (record.ownerUsername === state.user.username || isActiveAdmin())
  );
  $('#pending-badge').textContent = pending.length + queuedDeletions.length + weeklyGroups.length;
  $('#pending-weekly-list').innerHTML = weeklyGroups.map(weeklyOutboxMarkup).join('');
  const deleteNote = $('#pending-delete-note');
  if (deleteNote) {
    deleteNote.hidden = !queuedDeletions.length;
    $('#pending-delete-count').textContent = String(queuedDeletions.length);
  }
  $('#record-total').textContent = records.length + (records.length === 1 ? ' registro' : ' registros');
  $('#recent-list').innerHTML = records.slice(0, 4).map(record => recordRow(record)).join('') || emptyState('Todavía no hay capturas de esta cuenta en el dispositivo.');
  $('#pending-list').innerHTML = pending.map(record => recordRow(record)).join('') ||
    (weeklyGroups.length || queuedDeletions.length ? '' : emptyState('No hay capturas pendientes.'));
  const query = ($('#record-search').value || '').trim().toLocaleLowerCase('es');
  const filtered = records.filter(record => !query || JSON.stringify(record).toLocaleLowerCase('es').includes(query));
  $('#all-records').innerHTML = filtered.map(record => recordRow(record)).join('') || emptyState(records.length ? 'No hay coincidencias.' : 'Todavía no hay capturas de esta cuenta en el dispositivo.');
  const manageable = records.filter(canManageRecord);
  const manageQuery = ($('#manage-record-search').value || '').trim().toLocaleLowerCase('es');
  const managedFiltered = manageable.filter(record => !manageQuery || JSON.stringify(record).toLocaleLowerCase('es').includes(manageQuery));
  $('#manage-record-total').textContent = manageable.length + (manageable.length === 1 ? ' captura' : ' capturas');
  $('#manage-record-list').innerHTML = managedFiltered.map(record => recordRow(record, true)).join('') ||
    emptyState(manageable.length ? 'No hay coincidencias.' : 'No hay capturas disponibles para administrar.');
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
    saveWorkContextDraft('clima', false);
  }, error => {
    if (!input.isConnected) return;
    status.textContent = error.code === 1 ? 'Permite la ubicación para este sitio y vuelve a intentarlo.' : error.code === 3 ? 'El GPS tardó demasiado. Pulsa “Actualizar ubicación” para reintentar.' : 'No se pudo obtener el GPS. Revisa el dispositivo y vuelve a intentarlo.';
    button.disabled = false;
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
}
function captureWeedsLocation(root) {
  root = root && root.querySelector ? root : $('#form-fields');
  const input = $('[name="UBICACIÓN"]', root);
  const status = $('[data-weeds-location-status]', root);
  const button = $('[data-weeds-retry-location]', root);
  if (!input || !status || !button) return;
  if (!navigator.geolocation) {
    status.textContent = 'Este navegador no permite obtener la ubicación automática; ingresa las coordenadas manualmente.';
    return;
  }
  const previousGpsValue = input.dataset.gpsValue || '';
  button.disabled = true;
  status.textContent = 'Buscando GPS; permite el acceso si el navegador lo solicita…';
  navigator.geolocation.getCurrentPosition(position => {
    if (!input.isConnected) return;
    const coords = position.coords;
    const gpsValue = coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6);
    if (!input.value || input.value === previousGpsValue) {
      input.value = gpsValue;
      input.dataset.gpsValue = gpsValue;
      status.textContent = 'Ubicación GPS capturada; precisión aproximada: ' + Math.round(coords.accuracy) + ' m.';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      status.textContent = 'Se obtuvo la ubicación GPS, pero se conservó la ubicación escrita manualmente.';
    }
    button.disabled = false;
  }, error => {
    if (!input.isConnected) return;
    status.textContent = error.code === 1
      ? 'Permite la ubicación para este sitio o ingresa las coordenadas manualmente.'
      : error.code === 3
        ? 'El GPS tardó demasiado. Pulsa “Actualizar ubicación” para reintentar o ingresa las coordenadas.'
        : 'No se pudo obtener el GPS. Revisa el dispositivo o ingresa las coordenadas manualmente.';
    button.disabled = false;
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
}
function renderUsers(users, zones) {
  $('#users-list').innerHTML = users.slice().sort((a, b) => a.display_name.localeCompare(b.display_name, 'es')).map(user =>
    '<article class="user-row"><span class="user-avatar">' + esc(initials(user.display_name)) + '</span><span class="user-info"><strong>' + esc(user.display_name) + '</strong><small>' + esc((user.email || 'Sin correo') + ' · ' + user.username + ' · ' + (user.status === 'active' ? 'Activa' : user.status === 'suspended' ? 'Suspendida' : 'Pendiente')) + '</small></span><span class="member-actions"><select class="select-input" data-member-role="' + esc(user.id) + '" data-original-role="' + esc(user.role) + '" aria-label="Perfil para ' + esc(user.display_name) + '">' + ROLE_OPTIONS.map(role => '<option value="' + role + '"' + (user.role === role ? ' selected' : '') + '>' + esc(roleName(role)) + '</option>').join('') + '</select></span><details class="member-zone-picker"' + (['admin', 'aereo'].includes(user.role) ? ' hidden' : '') + '><summary>' + (['admin', 'aereo'].includes(user.role) ? 'Todas las zonas' : 'Zonas permitidas (' + (user.allowed_zones || []).length + ')') + '</summary><div class="zone-checkboxes">' + zones.map(zone => '<label><input type="checkbox" data-member-zone="' + esc(user.id) + '" value="' + esc(zone) + '"' + ((user.allowed_zones || []).some(userZone => normalizeZoneValue(userZone).toLowerCase() === normalizeZoneValue(zone).toLowerCase()) ? ' checked' : '') + '> ' + esc(zone) + '</label>').join('') + '</div></details><button class="secondary-button" type="button" data-member-save="' + esc(user.id) + '">Guardar</button>' +
    (user.id === state.user.id ? '' : '<button class="secondary-button member-delete" type="button" data-member-delete="' + esc(user.id) + '" data-member-name="' + esc(user.display_name) + '" aria-label="Eliminar usuario ' + esc(user.display_name) + '">Eliminar</button>') + '</article>'
  ).join('') || emptyState('Aún no hay cuentas.');
}
async function fetchUserZones() {
  const zones = new Set();
  for (let offset = 0, lots; ; offset += 1000) {
    lots = await cloudRequest('field_lots?select=zone&order=lot_code.asc&limit=1000&offset=' + offset);
    if (!Array.isArray(lots)) throw new Error('El catálogo de lotes devolvió una respuesta no válida.');
    for (const lot of lots) {
      const zone = normalizeZoneValue(lot.zone);
      if (zone) zones.add(zone);
    }
    if (lots.length < 1000) break;
  }
  return [...zones].sort((a, b) => a.localeCompare(b, 'es'));
}
async function refreshUsers() {
  if (!isActiveAdmin()) return;
  if (state.usersLoadPromise) return state.usersLoadPromise;
  const userId = state.user.id;
  const retry = $('#users-retry');
  state.zonesReady = false;
  retry.disabled = true;
  $('#users-load-status-text').textContent = 'Cargando usuarios y zonas permitidas…';
  $('#users-load-status').hidden = false;
  const loadPromise = (async () => {
    const [usersResult, zonesResult] = await Promise.allSettled([
      cloudRequest('profiles?select=id,email,username,display_name,role,status,allowed_zones&auth_user_id=not.is.null&order=created_at.asc'),
      fetchUserZones()
    ]);
    if (state.usersLoadPromise !== loadPromise || !state.user || state.user.id !== userId || !isActiveAdmin()) return;
    const errors = [];
    if (zonesResult.status === 'fulfilled') {
      state.zoneOptions = zonesResult.value;
      state.zonesReady = true;
      updateInviteZoneVisibility();
      updateCreateUserZoneVisibility();
      if (!state.zoneOptions.length) errors.push('No hay zonas en el catálogo de lotes. Registra lotes antes de asignar zonas.');
    } else {
      state.zonesReady = false;
      console.error('No se pudieron cargar las zonas permitidas.', zonesResult.reason);
      errors.push('No se pudieron cargar las zonas permitidas. ' + (zonesResult.reason.message || 'Revisa la conexión y los permisos.'));
    }
    if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
      if (zonesResult.status === 'fulfilled') renderUsers(usersResult.value, state.zoneOptions);
    } else {
      const error = usersResult.status === 'rejected' ? usersResult.reason : new Error('La respuesta del servidor no es válida.');
      console.error('No se pudo cargar la lista de usuarios.', error);
      errors.push('No se pudo cargar la lista de usuarios. ' + (error.message || 'Revisa la conexión y los permisos.'));
    }
    $('#users-load-status-text').textContent = errors.join(' ');
    $('#users-load-status').hidden = !errors.length;
  })().finally(() => {
    if (state.usersLoadPromise === loadPromise) {
      retry.disabled = false;
      state.usersLoadPromise = null;
    }
  });
  state.usersLoadPromise = loadPromise;
  return loadPromise;
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
  const normalizedSelected = selected.map(value => normalizeZoneValue(value).toLowerCase());
  container.innerHTML = zones.map(zone => '<label><input type="checkbox" ' + attribute + ' value="' + esc(zone) + '"' + (normalizedSelected.includes(normalizeZoneValue(zone).toLowerCase()) ? ' checked' : '') + '> ' + esc(zone) + '</label>').join('');
}
function updateCreateUserZoneVisibility() {
  const role = $('#create-user-role').value;
  const unrestricted = ['admin', 'aereo'].includes(role);
  $('#create-user-zone-picker').hidden = unrestricted;
  $('#create-user-zone-policy').textContent = unrestricted
    ? 'Este perfil tiene acceso a todas las zonas.'
    : 'Selecciona las zonas que podrá consultar y capturar.';
  const selected = $$('input:checked', $('#create-user-zones')).map(input => input.value);
  renderZoneCheckboxes($('#create-user-zones'), state.zoneOptions, selected, 'name="create_allowed_zones"');
}
function updateInviteZoneVisibility() {
  const zonePicker = $('#invite-user-zone-picker');
  const role = $('#invite-user-role').value;
  const unrestricted = ['admin', 'aereo'].includes(role);
  zonePicker.hidden = unrestricted;
  $('#invite-zone-policy').textContent = unrestricted
    ? 'Este perfil tiene acceso a todas las zonas.'
    : 'Selecciona las zonas que podrá consultar y capturar.';
  const selected = $$('input:checked', $('#invite-user-zones')).map(input => input.value);
  renderZoneCheckboxes($('#invite-user-zones'), state.zoneOptions, selected, 'name="allowed_zones"');
}
function userCanAccessLot(lotCode) {
  const lot = state.lotLookup[lotCode];
  if (!lot || !state.user) return false;
  return userCanAccessZone(lot.zona);
}
function userCanAccessZone(zone) {
  if (!state.user) return false;
  const accessZone = normalizeZoneValue(zone).toLowerCase();
  const allowedZones = Array.isArray(state.user.allowedZones)
    ? state.user.allowedZones.map(value => normalizeZoneValue(value).toLowerCase())
    : [];
  return ['admin', 'aereo'].includes(state.user.role) || allowedZones.includes(accessZone);
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
function canManageRecordForUser(record, user, hasLotAccess) {
  if (!record || !user || user.status !== 'active' || !hasLotAccess) return false;
  return user.role === 'admin' || (record.ownerUsername && record.ownerUsername === user.username);
}
function canManageRecord(record) {
  return canManageRecordForUser(record, state.user, recordHasLotAccess(record));
}
function setLotFollowupStatus(message, kind) {
  for (const id of ['lot-followup-status', 'lot-weekly-status']) {
    const status = $('#' + id);
    const text = $('.lot-followup-status-text', status);
    status.hidden = !message;
    status.classList.toggle('warning-strip', kind === 'warning');
    $('.status-check', status).textContent = kind === 'success' ? '✓' : kind === 'info' ? 'i' : '!';
    text.textContent = message || '';
  }
}
function clearLotFollowupData() {
  state.lotFollowupPlans = [];
  state.lotFollowupVisits = [];
  state.lotWeeklyPrograms = [];
  state.lotFollowupLoadPromise = null;
  state.editingLotFollowup = null;
  $('#lot-followup-summary').innerHTML = '';
  $('#lot-followup-rows').innerHTML = '<tr><td colspan="8" class="lot-followup-empty">Carga los planes para consultar el seguimiento.</td></tr>';
  $('#lot-followup-lot-options').innerHTML = '';
  $('#lot-weekly-schedule-filter-farm').innerHTML = '<option value="">Todas las fincas</option>';
  $('#lot-weekly-program-list').innerHTML = '<p class="lot-followup-empty">Carga los planes y las visitas para consultar los pendientes.</p>';
  $('#lot-weekly-schedule-filter-week').value = '';
  $('#lot-weekly-schedule-filter-farm').value = '';
  $('#lot-weekly-schedule-filter-day').value = '';
  $('#lot-weekly-schedule-filter-responsible').value = '';
  setLotFollowupStatus('', '');
}
function addLotFollowupDateInput(value) {
  const container = $('#lot-followup-date-inputs');
  const row = document.createElement('div');
  const index = container.querySelectorAll('[data-lot-followup-date]').length + 1;
  const inputId = 'lot-followup-date-' + (++state.lotFollowupDateId);
  row.className = 'lot-followup-date-row';
  row.innerHTML = '<div class="field"><label class="field-label" for="' + inputId + '">VISITA ' + index + '</label><input id="' + inputId + '" class="small-input" type="date" data-lot-followup-date value="' + esc(value || '') + '"></div><button class="remove-row" type="button" data-remove-lot-followup-date>Quitar</button>';
  container.appendChild(row);
}
function resetLotFollowupForm() {
  $('#lot-followup-form').reset();
  state.editingLotFollowup = null;
  $('#lot-followup-code').readOnly = false;
  $('#lot-followup-form-title').textContent = 'Registrar lote';
  $('#lot-followup-save').textContent = 'Guardar plan';
  $('#lot-followup-cancel-edit').hidden = true;
  $('#lot-followup-cycle-date').value = localDate();
  $('#lot-followup-responsible').value = state.user ? state.user.displayName : '';
  $('#lot-followup-date-inputs').innerHTML = '';
  for (let index = 0; index < 3; index++) addLotFollowupDateInput('');
  updateLotFollowupFarm();
}
function updateLotFollowupFarm() {
  const lotCode = normalizeVisitMapLotCode($('#lot-followup-code').value);
  const lot = state.lotLookup[lotCode];
  $('#lot-followup-farm').value = lot ? lot.finca || '' : '';
}
function renderLotFollowupLotOptions() {
  const options = Object.keys(state.lotLookup).sort().map(lotCode => {
    const lot = state.lotLookup[lotCode] || {};
    return '<option value="' + esc(lotCode) + '">' + esc(lot.finca || '') + '</option>';
  });
  $('#lot-followup-lot-options').innerHTML = options.join('');
  renderLotWeeklyFarmOptions();
}
function renderLotWeeklyFarmOptions() {
  const farms = new Map();
  Object.values(state.lotLookup).forEach(lot => {
    const farm = String(lot && lot.finca || '').trim();
    const key = normalizeLotWeeklyFarm(farm);
    if (key && !farms.has(key)) farms.set(key, farm);
  });
  const options = [...farms.values()].sort((a, b) => a.localeCompare(b, 'es'));
  const filterSelect = $('#lot-weekly-schedule-filter-farm');
  const currentFilter = filterSelect.value;
  filterSelect.innerHTML = '<option value="">Todas las fincas</option>' +
    options.map(farm => '<option value="' + esc(farm) + '">' + esc(farm) + '</option>').join('');
  if (options.includes(currentFilter)) filterSelect.value = currentFilter;
}
function lotWeeklyProgramMemberCodes(program) {
  return (Array.isArray(program && program.members) ? program.members : [])
    .map(member => normalizeVisitMapLotCode(member && member.lot_code))
    .filter(Boolean);
}
function resetLotWeeklyProgramForm() {
  $('#lot-weekly-program-form').reset();
  $('#lot-weekly-program-farm').value = '';
  $('#lot-weekly-program-date').value = localDate();
  state.editingLotWeeklyProgramId = null;
  state.lotWeeklyProgramDraftKey = '';
  state.lotWeeklyProgramDraftLotCodes = [];
  $('#lot-weekly-program-title').textContent = 'Crear programa semanal';
  $('#lot-weekly-program-save').textContent = 'Guardar programa';
  $('#lot-weekly-program-cancel').hidden = true;
  renderLotWeeklyProgramCandidates();
}
function updateLotWeeklyProgramDateBounds() {
  const dateInput = $('#lot-weekly-program-date');
  const weekStart = lotWeeklyProgramWeekStart(dateInput.value);
  if (!state.editingLotWeeklyProgramId || !weekStart) {
    dateInput.removeAttribute('min');
    dateInput.removeAttribute('max');
    return;
  }
  const selectedCodes = new Set($$('[data-lot-weekly-lot]:checked', $('#lot-weekly-program-candidates'))
    .map(input => normalizeVisitMapLotCode(input.value)));
  const program = state.lotWeeklyPrograms.find(item => item.id === state.editingLotWeeklyProgramId);
  const candidates = lotWeeklyProgramCandidates(
    state.lotFollowupPlans,
    state.lotLookup,
    $('#lot-weekly-program-farm').value,
    dateInput.value,
    program
  );
  const members = candidates
    .filter(candidate => selectedCodes.has(candidate.lotCode))
    .map(candidate => ({ reference_date: candidate.referenceDate }));
  const bounds = lotWeeklyProgramDateBounds({
    week_start: weekStart,
    members,
    protected_date_start: program && program.protected_date_start,
    protected_date_end: program && program.protected_date_end
  });
  if (!bounds || !bounds.valid) {
    dateInput.removeAttribute('min');
    dateInput.removeAttribute('max');
    return;
  }
  dateInput.min = bounds.start;
  dateInput.max = bounds.end;
}
function renderLotWeeklyProgramCandidates() {
  const farm = $('#lot-weekly-program-farm').value.trim();
  const scheduledDate = lotWeeklyProgramDate($('#lot-weekly-program-date').value);
  const summary = $('#lot-weekly-program-date-summary');
  const target = $('#lot-weekly-program-candidates');
  const saveButton = $('#lot-weekly-program-save');
  if (!farm || !scheduledDate) {
    state.editingLotWeeklyProgramId = null;
    state.lotWeeklyProgramDraftKey = '';
    state.lotWeeklyProgramDraftLotCodes = [];
    $('#lot-weekly-program-title').textContent = 'Crear programa semanal';
    $('#lot-weekly-program-save').textContent = 'Guardar programa';
    $('#lot-weekly-program-cancel').hidden = true;
    $('#lot-weekly-program-date').disabled = false;
    summary.textContent = 'Elige una finca y una fecha para ver la semana y el día programados.';
    target.innerHTML = '<p class="lot-followup-empty">Selecciona una finca y fecha para consultar los lotes elegibles.</p>';
    saveButton.disabled = true;
    updateLotWeeklyProgramDateBounds();
    return;
  }
  const weekStart = lotWeeklyProgramWeekStart(scheduledDate);
  const weekEnd = lotWeeklyProgramShiftDate(weekStart, 6);
  const dayName = lotWeeklyProgramDayName(scheduledDate);
  const programKey = normalizeLotWeeklyFarm(farm) + '|' + weekStart;
  const existing = state.lotWeeklyPrograms.find(program =>
    normalizeLotWeeklyFarm(program.farm) === normalizeLotWeeklyFarm(farm) &&
    String(program.week_start || '').slice(0, 10) === weekStart
  );
  $('#lot-weekly-program-date').disabled = !!existing && existing.can_update_date === false;
  const candidates = lotWeeklyProgramCandidates(state.lotFollowupPlans, state.lotLookup, farm, scheduledDate, existing);
  if (state.lotWeeklyProgramDraftKey !== programKey ||
      (existing && state.editingLotWeeklyProgramId !== existing.id) ||
      (!existing && state.editingLotWeeklyProgramId)) {
    state.lotWeeklyProgramDraftKey = programKey;
    state.editingLotWeeklyProgramId = existing ? existing.id : null;
    state.lotWeeklyProgramDraftLotCodes = existing
      ? lotWeeklyProgramMemberCodes(existing)
      : candidates.map(candidate => candidate.lotCode);
  }
  const selectedCodes = new Set(state.lotWeeklyProgramDraftLotCodes);
  const eligibleCodes = new Set(candidates.map(candidate => candidate.lotCode));
  const invalidSelected = [...selectedCodes].filter(lotCode => !eligibleCodes.has(lotCode));
  const title = existing
    ? 'Editar programa · ' + farm + ' · semana del ' + formatDate(weekStart)
    : 'Crear programa semanal';
  $('#lot-weekly-program-title').textContent = title;
  $('#lot-weekly-program-save').textContent = existing ? 'Guardar cambios' : 'Guardar programa';
  $('#lot-weekly-program-cancel').hidden = !existing;
  summary.textContent = 'Fecha común: ' + formatDate(scheduledDate) + ' · Día: ' +
    dayName.charAt(0).toLocaleUpperCase('es-GT') + dayName.slice(1) +
    ' · Semana: ' + formatDate(weekStart) + ' a ' + formatDate(weekEnd) +
    (existing && existing.can_update_date === false ? ' · La fecha está bloqueada por lotes de zonas no asignadas.' : '');
  const candidateRows = candidates.map(candidate =>
    '<label class="lot-weekly-candidate">' +
      '<input type="checkbox" data-lot-weekly-lot value="' + esc(candidate.lotCode) + '"' +
        (selectedCodes.has(candidate.lotCode) ? ' checked' : '') + '>' +
      '<span><strong>Lote ' + esc(candidate.lotCode) + '</strong><small>Fecha de referencia: ' +
        esc(formatDate(candidate.referenceDate)) + '</small></span>' +
      '<span><small>Rango permitido: ' + esc(formatDate(candidate.allowedStart)) + ' a ' +
        esc(formatDate(candidate.allowedEnd)) + '</small></span>' +
    '</label>'
  );
  const warning = invalidSelected.length
    ? '<p class="field-hint">Algunos lotes del programa existente quedan fuera del rango para esta fecha y no se incluirán: ' +
      esc(invalidSelected.join(', ')) + '.</p>'
    : '';
  target.innerHTML = warning + (candidateRows.length
    ? candidateRows.join('')
    : '<p class="lot-followup-empty">No hay lotes de esta finca cuyo rango de ±5 días incluya la fecha elegida.</p>');
  saveButton.disabled = !candidates.some(candidate => selectedCodes.has(candidate.lotCode));
  updateLotWeeklyProgramDateBounds();
}
function renderLotFollowup() {
  if (!canAccessLotFollowup()) return;
  const today = localDate();
  const visitsByLot = new Map();
  for (const visit of state.lotFollowupVisits) {
    const lotCode = normalizeVisitMapLotCode(visit.lot_code);
    if (!lotCode) continue;
    if (!visitsByLot.has(lotCode)) visitsByLot.set(lotCode, []);
    visitsByLot.get(lotCode).push(visit);
  }
  const plans = state.lotFollowupPlans.map(plan => {
    const lotCode = normalizeVisitMapLotCode(plan.lot_code);
    const lot = state.lotLookup[lotCode] || {};
    return {
      plan,
      lotCode,
      farm: lot.finca || plan.finca || '',
      summary: evaluateLotFollowup(plan, visitsByLot.get(lotCode) || [], today)
    };
  }).sort((a, b) => a.farm.localeCompare(b.farm) || a.lotCode.localeCompare(b.lotCode));
  const pendingVisits = plans.reduce((total, item) => total + item.summary.pendingCount, 0);
  const overdueVisits = plans.reduce((total, item) => total + item.summary.overdueCount, 0);
  const fulfilledLots = plans.filter(item => item.summary.fulfilled).length;
  $('#lot-followup-summary').innerHTML = [
    ['Lotes con plan', plans.length],
    ['Visitas pendientes', pendingVisits],
    ['Visitas atrasadas', overdueVisits],
    ['Lotes cumplidos', fulfilledLots]
  ].map(([label, count]) => '<div class="lot-followup-stat"><strong>' + count + '</strong><span>' + label + '</span></div>').join('');

  const query = $('#lot-followup-search').value.trim().toLocaleLowerCase();
  const filter = $('#lot-followup-filter').value;
  const visible = plans.filter(item => {
    const matchesFilter = filter === 'all' || item.summary.statusKey === filter;
    const searchText = [item.farm, item.lotCode, item.plan.crop_state, item.plan.responsible].join(' ').toLocaleLowerCase();
    return matchesFilter && (!query || searchText.includes(query));
  });
  const rows = visible.map(item => {
    const { plan, lotCode, farm, summary } = item;
    const details = summary.slots.map(slot =>
      '<li><strong>Visita ' + slot.number + '</strong>: programada ' + esc(formatDate(slot.due_date)) + ' · ' + esc(slot.status) +
      (slot.visit_date ? ' (' + esc(formatDate(slot.visit_date)) + ')' : '') + '</li>'
    );
    summary.extraVisits.forEach((visit, index) => {
      details.push('<li><strong>Visita adicional ' + (index + 1) + '</strong>: ' + esc(formatDate(visit.visit_date)) +
        (visit.pending_sync ? (visit.conflict ? ' · Conflicto por revisar' : ' · Pendiente de sincronizar') : '') + '</li>');
    });
    if (!details.length) details.push('<li>No hay visitas programadas para este lote.</li>');
    const visitCount = summary.requiredCount
      ? summary.actualCount + ' / ' + summary.requiredCount + ' requeridas'
      : summary.actualCount + ' registradas · sin plan';
    const nextVisit = summary.nextDueDate ? formatDate(summary.nextDueDate) : '—';
    return '<tr>' +
      '<td class="lot-followup-lot"><strong>' + esc(farm || 'Sin finca') + '</strong><small>Lote ' + esc(lotCode) + '</small></td>' +
      '<td>' + esc(formatDate(plan.cycle_date)) + '</td>' +
      '<td>' + esc(plan.crop_state || '—') + '</td>' +
      '<td>' + esc(plan.responsible || '—') + '</td>' +
      '<td><details class="lot-followup-visits"><summary>' + esc(visitCount) + '</summary><ul>' + details.join('') + '</ul></details></td>' +
      '<td>' + esc(nextVisit) + '</td>' +
      '<td><span class="lot-followup-status-pill is-' + esc(summary.statusKey) + '">' + esc(summary.statusLabel) + '</span>' +
      (summary.pendingCount ? '<small class="followup-pending-note">' + summary.pendingCount + ' pendiente(s)</small>' : '') + '</td>' +
      '<td>' + (isActiveAdmin() ? '<div class="lot-followup-actions"><button class="record-view-button" type="button" data-lot-followup-edit="' + esc(lotCode) + '">Editar</button></div>' : 'Solo lectura') + '</td>' +
      '</tr>';
  });
  $('#lot-followup-rows').innerHTML = rows.length
    ? rows.join('')
    : '<tr><td colspan="8" class="lot-followup-empty">' + (plans.length ? 'No hay lotes que coincidan con el filtro.' : 'Todavía no hay planes de seguimiento cargados.') + '</td></tr>';
  renderLotWeeklySchedule();
}
function renderLotWeeklySchedule() {
  const allVisits = buildLotWeeklyVisitItems(
    state.lotFollowupPlans,
    state.lotFollowupVisits,
    state.lotLookup,
    localDate()
  );
  const responsibleSelect = $('#lot-weekly-schedule-filter-responsible');
  const selectedResponsible = responsibleSelect.value;
  const responsibleOptions = new Map();
  allVisits.forEach(visit => {
    const responsible = String(visit.responsible || '').trim();
    const key = responsible.toLocaleLowerCase();
    if (key && !responsibleOptions.has(key)) responsibleOptions.set(key, responsible);
  });
  responsibleSelect.innerHTML = '<option value="">Todos los responsables</option>' +
    [...responsibleOptions.values()].sort((a, b) => a.localeCompare(b, 'es'))
      .map(responsible => '<option value="' + esc(responsible) + '">' + esc(responsible) + '</option>').join('');
  const matchingResponsible = [...responsibleOptions.values()].find(responsible =>
    responsible.toLocaleLowerCase() === selectedResponsible.trim().toLocaleLowerCase()
  );
  if (matchingResponsible) responsibleSelect.value = matchingResponsible;
  const weekGroups = filterWeeklyScheduleGroups(
    groupLotWeeklyVisits(allVisits),
    $('#lot-weekly-schedule-filter-farm').value,
    $('#lot-weekly-schedule-filter-week').value
  );
  const groups = filterLotWeeklyVisitGroups(
    weekGroups,
    '',
    $('#lot-weekly-schedule-filter-day').value,
    responsibleSelect.value
  );
  const weeks = new Map();
  groups.forEach(group => {
    if (!weeks.has(group.weekStart)) weeks.set(group.weekStart, []);
    weeks.get(group.weekStart).push(group);
  });
  const sections = [...weeks.entries()].map(([weekStart, weekGroups]) => {
    const weekEnd = lotWeeklyProgramShiftDate(weekStart, 6);
    return '<section class="lot-weekly-week-group"><div class="section-heading">' +
      '<h2>Semana del ' + esc(formatDate(weekStart)) + ' al ' + esc(formatDate(weekEnd)) + '</h2></div>' +
      weekGroups.map(lotWeeklyVisitGroupCard).join('') + '</section>';
  });
  $('#lot-weekly-program-list').innerHTML = sections.length
    ? sections.join('')
    : '<p class="lot-followup-empty">No hay visitas pendientes ni vencidas para la semana y finca seleccionadas.</p>';
}
async function fetchAllLotFollowupPlans() {
  const plans = [];
  for (let offset = 0, page; ; offset += 1000) {
    page = await cloudRequest('lot_visit_plans?select=lot_code,cycle_date,crop_state,responsible,visit_dates,updated_at&order=lot_code.asc&limit=1000&offset=' + offset);
    if (!Array.isArray(page)) throw new Error('Supabase devolvió una lista de planes no válida.');
    plans.push(...page);
    if (page.length < 1000) return plans;
  }
}
async function fetchAllLotWeeklyPrograms() {
  const programs = [];
  for (let offset = 0, page; ; offset += 1000) {
    page = await cloudRequest('rpc/get_lot_weekly_visit_programs?select=id,farm,week_start,scheduled_date,members,protected_date_start,protected_date_end,can_update_date,can_delete&order=week_start.desc,farm.asc&limit=1000&offset=' + offset, {
      method: 'POST',
      body: {}
    });
    if (!Array.isArray(page)) throw new Error('Supabase devolvió una lista de programas semanales no válida.');
    programs.push(...page);
    if (page.length < 1000) return programs;
  }
}
async function fetchAllLotFollowupVisits() {
  const visits = [];
  for (let offset = 0, page; ; offset += 1000) {
    page = await cloudRequest('rpc/get_lot_followup_visits_with_links?select=record_id,lot_code,visit_date,cycle_date,visit_number&order=record_id.asc,lot_code.asc&limit=1000&offset=' + offset, {
      method: 'POST',
      body: {}
    });
    if (!Array.isArray(page)) throw new Error('Supabase devolvió una lista de visitas no válida.');
    visits.push(...page);
    if (page.length < 1000) return visits;
  }
}
async function loadLotFollowup() {
  if (!canAccessLotFollowup()) return;
  if (state.lotFollowupLoadPromise) return state.lotFollowupLoadPromise;
  const user = { ...state.user, allowedZones: [...(state.user.allowedZones || [])] };
  const key = offlineSnapshotKey('lot-followup', user);
  const request = (async () => {
    setLotFollowupStatus('Consultando planes y visitas…', 'info');
    let snapshot;
    let saveWarning = false;
    if (state.configured && navigator.onLine) {
      try {
        await loadLotLookup();
        const [plans, visits] = await Promise.all([
          fetchAllLotFollowupPlans(),
          fetchAllLotFollowupVisits()
        ]);
        if (!sameOfflineScope(user)) return;
        snapshot = { id: key, savedAt: new Date().toISOString(), plans, visits };
        try { await putOfflineSnapshot(snapshot); }
        catch (error) {
          saveWarning = true;
          console.error('No se pudo guardar el seguimiento para uso sin conexión.', error);
        }
      } catch (error) {
        if (!sameOfflineScope(user)) return;
        if (!error.connectionFailure) {
          state.lotFollowupPlans = [];
          state.lotFollowupVisits = [];
          renderLotFollowupLotOptions();
          renderLotFollowup();
          throw error;
        }
        console.warn('No se pudo actualizar el seguimiento compartido.', error);
      }
    }
    if (!snapshot) snapshot = await getOfflineSnapshot(key);
    if (!sameOfflineScope(user)) return;
    if (!snapshot || !Array.isArray(snapshot.plans) || !Array.isArray(snapshot.visits) || !snapshot.savedAt) {
      state.lotFollowupPlans = [];
      state.lotFollowupVisits = [];
      renderLotFollowupLotOptions();
      renderLotFollowup();
      throw new Error('No hay seguimiento guardado para esta cuenta. Conéctate y actualiza la programación.');
    }
    const groups = (await getWeeklyVisitOutbox()).filter(group => group.userId === user.id && canAccessWeeklyOutbox(group));
    if (!sameOfflineScope(user)) return;
    const pendingVisits = groups.flatMap(group => group.captures.map(capture => ({
      record_id: capture.record_id, lot_code: capture.lot_code, cycle_date: capture.cycle_date,
      visit_number: capture.visit_number,
      visit_date: capture.datos.subregistros.malezas_detalle[0].FECHA || capture.datos.FECHA,
      pending_sync: true, conflict: group.status === 'conflict'
    })));
    const pendingIds = new Set(pendingVisits.map(visit => visit.record_id));
    state.lotFollowupPlans = snapshot.plans;
    state.lotFollowupVisits = snapshot.visits.filter(visit => !pendingIds.has(visit.record_id)).concat(pendingVisits);
    renderLotFollowupLotOptions();
    renderLotFollowup();
    setLotFollowupStatus(saveWarning
      ? 'Seguimiento actualizado, pero no se pudo guardar una copia sin conexión.'
      : 'Datos consultados el ' + offlineSnapshotDate(snapshot) + '. Pueden cambiar al sincronizar.', saveWarning ? 'warning' : 'info');
  })();
  state.lotFollowupLoadPromise = request;
  try {
    await request;
  } catch (error) {
    setLotFollowupStatus(error.message || 'No se pudo cargar el seguimiento desde Supabase.', 'warning');
    throw error;
  } finally {
    if (state.lotFollowupLoadPromise === request) state.lotFollowupLoadPromise = null;
  }
}
let weeklyCapture = null;
let weeklyCaptureDraftTimer = null;
function weeklyVisitIdentity(visit) {
  return [visit.lotCode, visit.cycleDate, visit.visitNumber, visit.scheduledDate].join(':');
}
function weeklyVisitDraftId(farm, assignedDate, visits) {
  const identity = (Array.isArray(visits) ? visits : [])
    .map(weeklyVisitIdentity)
    .sort()
    .join('|');
  return 'weekly-visit:' + state.user.id + ':' + normalizeLotWeeklyFarm(farm) + ':' +
    assignedDate + ':' + encodeURIComponent(identity);
}
function setWeeklyVisitIncluded(row, included) {
  const grid = $('.field-grid', row);
  const button = $('[data-weekly-toggle-visit]', row);
  const notice = $('[data-weekly-excluded-notice]', row);
  row.dataset.weeklyExcluded = included ? '' : 'true';
  grid.hidden = !included;
  for (const input of $$('input, select, textarea, button', grid)) {
    if (!included) {
      input.dataset.weeklyWasDisabled = input.disabled ? 'true' : 'false';
      input.disabled = true;
    } else if (input.dataset.weeklyWasDisabled !== undefined) {
      input.disabled = input.dataset.weeklyWasDisabled === 'true';
      delete input.dataset.weeklyWasDisabled;
    }
  }
  notice.hidden = included;
  button.textContent = included ? 'Quitar lote de esta captura' : 'Volver a incluir lote';
  const lot = $('[data-child-field="LOTE"]', row).value;
  button.setAttribute('aria-label', included ? 'Quitar lote ' + lot + ' de esta captura' : 'Volver a incluir lote ' + lot);
  button.setAttribute('aria-expanded', String(included));
}
function updateWeeklyCaptureDateLimit(capture) {
  const active = capture.visits.filter(visit => !capture.excludedVisits.has(weeklyVisitIdentity(visit)));
  $('[name="FECHA"]', $('#weekly-capture-fields')).min = active.reduce(
    (latest, visit) => visit.cycleDate > latest ? visit.cycleDate : latest, ''
  );
  $('#weekly-capture-summary').textContent = capture.farm + ' · Fecha asignada: ' +
    formatDate(capture.assignedDate) + ' · ' + active.length + ' lote(s) incluido(s)' +
    (active.length < capture.visits.length ? ' · ' + (capture.visits.length - active.length) + ' pendiente(s) excluido(s)' : '');
}
function queueWeeklyCaptureDraft() {
  if (!weeklyCapture || weeklyCapture.busy) return;
  if (weeklyCaptureDraftTimer) clearTimeout(weeklyCaptureDraftTimer);
  weeklyCaptureDraftTimer = setTimeout(() => {
    weeklyCaptureDraftTimer = null;
    persistWeeklyCaptureDraft().catch(showWeeklyCaptureError);
  }, 300);
}
function persistWeeklyCaptureDraft() {
  const capture = weeklyCapture;
  if (!capture || capture.busy) return Promise.resolve();
  const save = async () => {
    if (weeklyCapture !== capture || capture.busy) return;
    if (!sameOfflineScope(capture.userScope)) throw new Error('Cambió la cuenta o sus permisos; no se guardó el borrador.');
    const data = await serializeForm(
      $('#weekly-capture-form'),
      capture.recordIds[0],
      capture.data || {},
      'malezas'
    );
    if (!sameOfflineScope(capture.userScope)) throw new Error('Cambió la cuenta o sus permisos; no se guardó el borrador.');
    const visits = capture.visits.map((visit, index) => ({
      ...visit,
      recordId: capture.recordIds[index],
      excluded: !!capture.excludedVisits?.has(weeklyVisitIdentity(visit))
    }));
    capture.data = data;
    $$('.child-row', $('[data-repeat-list="malezas_detalle"]', $('#weekly-capture-fields')))
      .forEach((row, index) => { row.dataset.originalIndex = String(index); });
    await putWeeklyVisitDraft({
      id: capture.draftId,
      userId: capture.userScope.id,
      farm: capture.farm,
      assignedDate: capture.assignedDate,
      visits,
      data,
      time: capture.time,
      updatedAt: new Date().toISOString()
    });
    const status = $('#weekly-capture-draft-status');
    if (status) status.textContent = 'Borrador guardado en este dispositivo.';
  };
  capture.persistPromise = (capture.persistPromise || Promise.resolve()).then(save, save);
  return capture.persistPromise;
}
async function flushWeeklyCaptureDraft() {
  if (weeklyCaptureDraftTimer) {
    clearTimeout(weeklyCaptureDraftTimer);
    weeklyCaptureDraftTimer = null;
  }
  await persistWeeklyCaptureDraft();
}
async function closeWeeklyCaptureDialog() {
  const closeButtons = [$('#weekly-capture-close'), $('#weekly-capture-cancel')];
  closeButtons.forEach(button => { button.disabled = true; });
  try {
    await flushWeeklyCaptureDraft();
    $('#weekly-capture-dialog').close();
  } finally {
    closeButtons.forEach(button => { button.disabled = false; });
  }
}
async function openWeeklyCapture(button, reviewGroup) {
  if (!canAccessLotFollowup() || !userCanOpenModule('malezas')) throw new Error('No tienes permiso para capturar esta visita.');
  const user = { ...state.user, allowedZones: [...(state.user.allowedZones || [])] };
  let visits;
  try {
    visits = JSON.parse(button.dataset.weeklyCaptureGroup);
  } catch {
    throw new Error('No se pudo leer el grupo de visitas; actualiza la programación.');
  }
  if (!Array.isArray(visits) || !visits.length) throw new Error('El grupo no tiene visitas pendientes.');
  await loadLotFollowup();
  if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la consulta.');
  if (reviewGroup) {
    if (state.syncBusy || !canAccessWeeklyOutbox(reviewGroup) || reviewGroup.status !== 'conflict') {
      throw new Error('El grupo no está disponible para revisión. Actualiza Pendientes.');
    }
    if (visits.some(visit => {
      const plan = state.lotFollowupPlans.find(item => item.lot_code === visit.lotCode);
      return !plan || plan.cycle_date !== visit.cycleDate ||
        plan.visit_dates[visit.visitNumber - 1] !== visit.scheduledDate;
    })) {
      throw new Error('El plan de una visita cambió. Descarga los datos pendientes y revísalos con el administrador.');
    }
  } else {
    const pending = buildLotWeeklyVisitItems(state.lotFollowupPlans, state.lotFollowupVisits, state.lotLookup, localDate());
    visits = visits.filter(selected => pending.some(item =>
      item.lotCode === selected.lotCode && item.visitNumber === selected.visitNumber &&
      item.cycleDate === selected.cycleDate && item.scheduledDate === selected.scheduledDate
    ));
  }
  if (!visits.length) throw new Error('Las visitas de este grupo ya no están pendientes. Actualiza la programación.');
  visits.sort((a, b) => a.lotCode.localeCompare(b.lotCode, undefined, { numeric: true }) || a.visitNumber - b.visitNumber);
  const farm = visits[0].farm || state.lotLookup[visits[0].lotCode].finca;
  if (visits.some(visit => normalizeLotWeeklyFarm(visit.farm) !== normalizeLotWeeklyFarm(farm))) {
    throw new Error('El grupo incluye visitas de más de una finca.');
  }
  const draftId = reviewGroup ? reviewGroup.id : weeklyVisitDraftId(farm, button.dataset.weeklyCaptureDate, visits);
  if (!reviewGroup && (await getWeeklyVisitOutbox()).some(group => group.id === draftId && group.userId === state.user.id)) {
    throw new Error('Este grupo ya está en la cola. Consulta Pendientes para revisarlo.');
  }
  const draft = await getWeeklyVisitDraft(draftId);
  if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la consulta.');
  if (reviewGroup && (!draft || !draft.data)) {
    throw new Error('No se encontró el borrador. Descarga los datos pendientes para revisarlos.');
  }
  const draftByIdentity = new Map((draft && Array.isArray(draft.visits) ? draft.visits : [])
    .map(visit => [weeklyVisitIdentity(visit), visit]));
  const recordIds = visits.map(visit => {
    const saved = draftByIdentity.get(weeklyVisitIdentity(visit));
    const queued = reviewGroup && reviewGroup.captures.find(item =>
      item.lot_code === visit.lotCode && item.visit_number === visit.visitNumber && item.cycle_date === visit.cycleDate);
    return queued ? queued.record_id : saved && saved.recordId || crypto.randomUUID();
  });
  const form = $('#weekly-capture-form');
  const fields = $('#weekly-capture-fields');
  form.reset();
  fields.innerHTML = weedsFields('weekly-');
  const list = $('[data-repeat-list="malezas_detalle"]', fields);
  list.innerHTML = '';
  $('[data-add-child]', fields).hidden = true;
  visits.forEach((visit, index) => {
    const location = state.lotLookup[visit.lotCode];
    if (!location) throw new Error('El lote ' + visit.lotCode + ' ya no está disponible para esta cuenta.');
    list.insertAdjacentHTML('beforeend', childRowMarkup('malezas_detalle', index, 'weekly-'));
    const row = list.lastElementChild;
    row.dataset.originalIndex = String(index);
    row.dataset.weeklyVisitIdentity = weeklyVisitIdentity(visit);
    row.querySelector('.field-grid').insertAdjacentHTML('afterbegin',
      '<div class="field full weekly-visit-row-heading"><strong>Lote ' + esc(visit.lotCode) +
      ' · Visita ' + visit.visitNumber + '</strong><span>Fecha programada original: ' +
      esc(formatDate(visit.scheduledDate)) + '</span></div>');
    const removeButton = $('[data-remove-child]', row);
    if (reviewGroup) removeButton.hidden = true;
    else {
      removeButton.removeAttribute('data-remove-child');
      removeButton.setAttribute('data-weekly-toggle-visit', '');
      removeButton.setAttribute('aria-label', 'Quitar lote ' + visit.lotCode + ' de esta captura');
      removeButton.setAttribute('aria-expanded', 'true');
      removeButton.textContent = 'Quitar lote de esta captura';
      row.insertAdjacentHTML('afterbegin', '<p data-weekly-excluded-notice class="field-hint" hidden>Lote ' +
        esc(visit.lotCode) + ' excluido: seguirá pendiente y sus datos no se guardarán al enviar esta captura.</p>');
    }
    const lot = $('[data-child-field="LOTE"]', row);
    lot.value = visit.lotCode;
    lot.readOnly = true;
    const detailDate = $('[data-child-field="FECHA"]', row);
    detailDate.min = visit.cycleDate;
    detailDate.required = true;
    detailDate.dataset.weeklyCycleDate = visit.cycleDate;
    $('[data-child-field="% CONTROL"]', row).addEventListener('input', () => updateWeedsCoverage(row));
    updateWeedsCatorcena(row);
    updateWeedsCoverage(row);
  });
  const location = state.lotLookup[visits[0].lotCode];
  const mainDate = $('[name="FECHA"]', fields);
  mainDate.min = visits.reduce((latest, visit) => visit.cycleDate > latest ? visit.cycleDate : latest, visits[0].cycleDate);
  const farmInput = $('[name="FINCA"]', fields);
  farmInput.value = location.finca;
  farmInput.disabled = true;
  const zoneInput = $('[name="ZONA"]', fields);
  zoneInput.value = location.zona;
  zoneInput.readOnly = true;
  const responsable = $('[name="RESPONSABLE"]', fields);
  responsable.value = visits[0].responsible || state.user.displayName;
  const header = $('#weekly-capture-fields');
  if (draft && draft.data) {
    setNamedFields(header, draft.data);
    visits.forEach((visit, index) => {
      const saved = draftByIdentity.get(weeklyVisitIdentity(visit));
      const row = $$('.child-row', list)[index];
      if (saved && draft.data.subregistros && draft.data.subregistros.malezas_detalle) {
        const draftIndex = draft.visits.findIndex(item => weeklyVisitIdentity(item) === weeklyVisitIdentity(visit));
        if (draftIndex >= 0) {
          row.dataset.originalIndex = String(draftIndex);
          setChildFields(row, draft.data.subregistros.malezas_detalle[draftIndex]);
        }
      }
      $('[data-child-field="LOTE"]', row).value = visit.lotCode;
      $('[data-child-field="LOTE"]', row).readOnly = true;
      const dateInput = $('[data-child-field="FECHA"]', row);
      dateInput.min = visit.cycleDate;
      dateInput.required = true;
      dateInput.dataset.weeklyCycleDate = visit.cycleDate;
      updateWeedsCatorcena(row);
      updateWeedsCoverage(row);
    });
  } else {
    for (const [index, visit] of visits.entries()) {
      const row = $$('.child-row', list)[index];
      const detailDate = $('[data-child-field="FECHA"]', row);
      detailDate.value = mainDate.value;
      detailDate.dataset.visitDateValue = mainDate.value;
      setFormValue($('[data-child-field="LABOR"]', row), '');
    }
  }
  farmInput.value = location.finca;
  farmInput.disabled = true;
  zoneInput.value = location.zona;
  zoneInput.readOnly = true;
  $('#weekly-capture-title').textContent = 'Capturar visitas del día';
  $('#weekly-capture-summary').textContent = farm + ' · Fecha asignada: ' +
    formatDate(button.dataset.weeklyCaptureDate) + ' · ' + visits.length + ' lote(s) pendiente(s)';
  $('#weekly-capture-error').hidden = true;
  $('#weekly-capture-draft-status').textContent = draft ? 'Borrador recuperado de este dispositivo.' : 'El borrador se guarda automáticamente en este dispositivo.';
  weeklyCapture = {
    draftId,
    farm,
    assignedDate: button.dataset.weeklyCaptureDate,
    visits,
    recordIds,
    excludedVisits: new Set(reviewGroup ? [] : visits
      .filter(visit => draftByIdentity.get(weeklyVisitIdentity(visit))?.excluded)
      .map(weeklyVisitIdentity)),
    data: draft && draft.data || null,
    time: draft && draft.time || captureTimestamp(),
    reviewConflict: !!reviewGroup,
    userScope: user,
    busy: false,
    persistPromise: Promise.resolve()
  };
  if (!reviewGroup) $$('.child-row', list).forEach((row, index) => {
    if (weeklyCapture.excludedVisits.has(weeklyVisitIdentity(visits[index]))) setWeeklyVisitIncluded(row, false);
  });
  updateWeeklyCaptureDateLimit(weeklyCapture);
  $('[data-weeds-retry-location]', fields).addEventListener('click', () => captureWeedsLocation(fields));
  $('#weekly-capture-dialog').showModal();
  captureWeedsLocation(fields);
}
async function saveWeeklyCapture(event) {
  event.preventDefault();
  const capture = weeklyCapture;
  const form = event.currentTarget;
  if (!capture || capture.busy || capture.saving) return;
  if (capture.excludedVisits && capture.visits.every(visit => capture.excludedVisits.has(weeklyVisitIdentity(visit)))) {
    throw new Error('Incluye al menos un lote para guardar. Los lotes excluidos seguirán pendientes.');
  }
  if (!form.reportValidity()) return;
  if (!state.user || !state.configured) throw new Error('Inicia sesión y configura el espacio compartido antes de guardar visitas.');
  const user = { ...state.user, allowedZones: [...(state.user.allowedZones || [])] };
  capture.saving = true;
  const submit = $('#weekly-capture-submit');
  submit.disabled = true;
  $('#weekly-capture-close').disabled = true;
  $('#weekly-capture-cancel').disabled = true;
  try {
    await flushWeeklyCaptureDraft();
    const rows = $$('.child-row', $('[data-repeat-list="malezas_detalle"]', $('#weekly-capture-fields')));
    const invalidDate = rows.find((row, index) => {
      if (capture.excludedVisits && capture.excludedVisits.has(weeklyVisitIdentity(capture.visits[index]))) return false;
      const input = $('[data-child-field="FECHA"]', row);
      return !input.value || input.value < capture.visits[index].cycleDate;
    });
    if (invalidDate) throw new Error('Cada fecha de visita debe ser igual o posterior al inicio del ciclo de su lote.');
    capture.busy = true;
    const data = await serializeForm(form, capture.recordIds[0], capture.data, 'malezas');
    data.FINCA = capture.farm;
    data.hora_registro = capture.time.horaRegistro;
    const details = data.subregistros.malezas_detalle;
    const captures = capture.visits.flatMap((visit, index) => {
      if (capture.excludedVisits && capture.excludedVisits.has(weeklyVisitIdentity(visit))) return [];
      const recordId = capture.recordIds[index];
      const recordData = JSON.parse(JSON.stringify(data));
      const detail = recordData.subregistros.malezas_detalle[index];
      detail.ID_NEW = recordId;
      recordData.ID = recordId;
      recordData.subregistros.malezas_detalle = [detail];
      return [{
        record_id: recordId,
        lot_code: visit.lotCode,
        cycle_date: visit.cycleDate,
        visit_number: visit.visitNumber,
        scheduled_date: visit.scheduledDate,
        datos: recordData
      }];
    });
    if (!sameOfflineScope(user)) throw new Error('Cambió la cuenta o sus permisos durante la captura.');
    await writeWeeklyVisitOutbox({
      id: capture.draftId, userId: user.id, scope: offlineSnapshotKey('scope', user),
      farm: capture.farm, assignedDate: capture.assignedDate, captures,
      status: 'pending', createdAt: new Date().toISOString()
    }, capture.reviewConflict ? 'replace-conflict' : 'add');
    if (!sameOfflineScope(user)) return;
    capture.data = data;
    $('#weekly-capture-dialog').close();
    weeklyCapture = null;
    toast(captures.length + ' visita(s) guardada(s) en este dispositivo y pendientes de sincronizar.');
    try {
      await refreshLists();
      await loadLotFollowup();
      if (navigator.onLine) await syncCloudRecords(false);
    } catch (error) {
      handleLotFollowupError(error);
      setLotFollowupStatus('Las visitas permanecen en Pendientes. Revisa la conexión y vuelve a sincronizar.', 'warning');
    }
  } finally {
    capture.busy = false;
    capture.saving = false;
    submit.disabled = false;
    $('#weekly-capture-close').disabled = false;
    $('#weekly-capture-cancel').disabled = false;
  }
}
function showWeeklyCaptureError(error) {
  console.error('No se pudo guardar la visita semanal.', error);
  const node = $('#weekly-capture-error');
  node.textContent = error.message || 'No se pudo guardar la visita.';
  node.hidden = false;
}
function editLotWeeklyProgram(programId) {
  if (!canAccessLotFollowup()) return;
  const program = state.lotWeeklyPrograms.find(item => String(item.id) === String(programId));
  if (!program) {
    setLotFollowupStatus('No se encontró el programa semanal que intentas editar. Actualiza la lista e inténtalo de nuevo.', 'warning');
    return;
  }
  $('#lot-weekly-program-farm').value = program.farm;
  $('#lot-weekly-program-date').value = lotWeeklyProgramDate(program.scheduled_date);
  state.lotWeeklyProgramDraftKey = '';
  renderLotWeeklyProgramCandidates();
  setLotFollowupStatus('', '');
  $('#lot-weekly-program-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function saveLotWeeklyProgram(event) {
  event.preventDefault();
  if (!canAccessLotFollowup()) throw new Error('Solo una cuenta administradora o supervisora activa puede gestionar este módulo.');
  if (!state.configured || !navigator.onLine) throw new Error('Conéctate a internet para guardar cambios en el espacio compartido.');
  const form = $('#lot-weekly-program-form');
  if (!form.reportValidity()) return;
  const farm = $('#lot-weekly-program-farm').value.trim();
  const scheduledDate = lotWeeklyProgramDate($('#lot-weekly-program-date').value);
  const weekStart = lotWeeklyProgramWeekStart(scheduledDate);
  const selectedCodes = $$('[data-lot-weekly-lot]:checked', $('#lot-weekly-program-candidates'))
    .map(input => normalizeVisitMapLotCode(input.value));
  if (!farm || !scheduledDate || !weekStart) throw new Error('Selecciona una finca y una fecha válida.');
  if (!selectedCodes.length) throw new Error('Selecciona al menos un lote para el programa semanal.');
  if (new Set(selectedCodes).size !== selectedCodes.length) throw new Error('No se puede incluir un lote más de una vez en el mismo programa.');
  const existing = state.lotWeeklyPrograms.find(program =>
    normalizeLotWeeklyFarm(program.farm) === normalizeLotWeeklyFarm(farm) &&
    String(program.week_start || '').slice(0, 10) === weekStart
  );
  const candidates = lotWeeklyProgramCandidates(state.lotFollowupPlans, state.lotLookup, farm, scheduledDate, existing);
  const candidatesByCode = new Map(candidates.map(candidate => [candidate.lotCode, candidate]));
  const invalidCodes = selectedCodes.filter(lotCode => !candidatesByCode.has(lotCode));
  if (invalidCodes.length) throw new Error('Estos lotes ya no son elegibles para la fecha elegida: ' + invalidCodes.join(', ') + '.');
  const bounds = lotWeeklyProgramDateBounds({
    week_start: weekStart,
    members: selectedCodes.map(lotCode => ({ reference_date: candidatesByCode.get(lotCode).referenceDate })),
    protected_date_start: existing && existing.protected_date_start,
    protected_date_end: existing && existing.protected_date_end
  });
  if (!bounds || !bounds.valid || scheduledDate < bounds.start || scheduledDate > bounds.end) {
    throw new Error('La fecha elegida debe estar dentro de la semana y del rango permitido para todos los lotes del programa.');
  }
  await cloudRequest('rpc/save_lot_weekly_visit_program', {
    method: 'POST',
    body: {
      p_farm: farm,
      p_week_start: weekStart,
      p_scheduled_date: scheduledDate,
      p_lot_codes: selectedCodes
    }
  });
  await loadLotFollowup();
  resetLotWeeklyProgramForm();
  setLotFollowupStatus('Programa de ' + farm + ' guardado para el ' + formatDate(scheduledDate) + '.', 'success');
  toast('Programa semanal guardado.');
}
async function saveLotWeeklyProgramDate(programId) {
  if (!canAccessLotFollowup()) throw new Error('Solo una cuenta administradora o supervisora activa puede gestionar este módulo.');
  if (!state.configured || !navigator.onLine) throw new Error('Conéctate a internet para guardar cambios en el espacio compartido.');
  const program = state.lotWeeklyPrograms.find(item => String(item.id) === String(programId));
  const dateInput = $$('[data-lot-weekly-date]').find(input => String(input.dataset.lotWeeklyDate) === String(programId));
  if (!program || !dateInput) throw new Error('No se encontró el programa o su fecha. Actualiza la lista e inténtalo de nuevo.');
  if (program.can_update_date === false) throw new Error('No puedes cambiar la fecha de un programa que incluye lotes de zonas no asignadas.');
  const scheduledDate = lotWeeklyProgramDate(dateInput.value);
  const bounds = lotWeeklyProgramDateBounds(program);
  if (!scheduledDate || lotWeeklyProgramWeekStart(scheduledDate) !== String(program.week_start).slice(0, 10) ||
      !bounds || !bounds.valid || scheduledDate < bounds.start || scheduledDate > bounds.end) {
    throw new Error('La fecha debe permanecer dentro de la semana y del rango permitido para todos los lotes.');
  }
  await cloudRequest('rpc/update_lot_weekly_visit_program_date', {
    method: 'POST',
    body: { p_program_id: program.id, p_scheduled_date: scheduledDate }
  });
  await loadLotFollowup();
  setLotFollowupStatus('Fecha del programa actualizada al ' + formatDate(scheduledDate) + '.', 'success');
  toast('Fecha programada actualizada.');
}
async function deleteLotWeeklyProgram(programId) {
  if (!canAccessLotFollowup()) throw new Error('Solo una cuenta administradora o supervisora activa puede gestionar este módulo.');
  if (!state.configured || !navigator.onLine) throw new Error('Conéctate a internet para eliminar el programa compartido.');
  const program = state.lotWeeklyPrograms.find(item => String(item.id) === String(programId));
  if (!program) throw new Error('No se encontró el programa semanal. Actualiza la lista e inténtalo de nuevo.');
  if (program.can_delete === false) throw new Error('No tienes acceso a todas las zonas con lotes de este programa y no puedes eliminarlo.');
  if (!window.confirm('¿Eliminar el programa de ' + program.farm + ' para la semana del ' + formatDate(program.week_start) + '?')) return;
  await cloudRequest('rpc/delete_lot_weekly_visit_program', {
    method: 'POST',
    body: { p_program_id: program.id }
  });
  if (String(state.editingLotWeeklyProgramId) === String(program.id)) resetLotWeeklyProgramForm();
  await loadLotFollowup();
  setLotFollowupStatus('Programa semanal eliminado.', 'success');
  toast('Programa semanal eliminado.');
}
function editLotFollowup(lotCode) {
  if (!isActiveAdmin()) return;
  const plan = state.lotFollowupPlans.find(item => item.lot_code === lotCode);
  if (!plan) {
    setLotFollowupStatus('No se encontró el plan que intentas editar. Actualiza la lista e inténtalo de nuevo.', 'warning');
    return;
  }
  resetLotFollowupForm();
  state.editingLotFollowup = plan.lot_code;
  $('#lot-followup-code').value = plan.lot_code;
  $('#lot-followup-code').readOnly = true;
  $('#lot-followup-cycle-date').value = String(plan.cycle_date || '').slice(0, 10);
  $('#lot-followup-state').value = plan.crop_state || '';
  $('#lot-followup-responsible').value = plan.responsible || '';
  $('#lot-followup-form-title').textContent = 'Editar plan · lote ' + plan.lot_code;
  $('#lot-followup-save').textContent = 'Guardar cambios';
  $('#lot-followup-cancel-edit').hidden = false;
  $('#lot-followup-date-inputs').innerHTML = '';
  (Array.isArray(plan.visit_dates) && plan.visit_dates.length ? plan.visit_dates : ['']).forEach(addLotFollowupDateInput);
  updateLotFollowupFarm();
  setLotFollowupStatus('', '');
  $('#lot-followup-form-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function saveLotFollowup(event) {
  event.preventDefault();
  if (!isActiveAdmin()) throw new Error('Solo una cuenta administradora activa puede guardar planes de seguimiento.');
  if (!state.configured || !navigator.onLine) throw new Error('Conéctate a internet para guardar cambios en el espacio compartido.');
  const form = $('#lot-followup-form');
  if (!form.reportValidity()) return;
  const lotCode = normalizeVisitMapLotCode($('#lot-followup-code').value);
  const cycleDate = excelDateToIso($('#lot-followup-cycle-date').value);
  if (!lotCode) throw new Error('Ingresa un código de lote válido.');
  if (!cycleDate) throw new Error('Ingresa una fecha válida de siembra o corte.');
  $('#lot-followup-code').value = lotCode;
  if (!state.lotLookup[lotCode] && !(await refreshLotLookupEntry(lotCode))) {
    throw new Error('El lote no existe en el catálogo o no está autorizado para tu cuenta.');
  }
  const visitDates = [];
  let emptyVisitSeen = false;
  for (const input of $$('[data-lot-followup-date]', $('#lot-followup-date-inputs'))) {
    const date = excelDateToIso(input.value);
    if (!date) { emptyVisitSeen = true; continue; }
    if (emptyVisitSeen) throw new Error('Completa las fechas de visita en orden; no dejes espacios entre visitas.');
    visitDates.push(date);
  }
  if (visitDates.length > 5) throw new Error('El ciclo admite como máximo cinco visitas programadas.');
  for (let index = 0; index < visitDates.length; index++) {
    if (visitDates[index] < cycleDate) throw new Error('Las fechas de visita no pueden ser anteriores a la fecha de siembra o corte.');
    if (index && visitDates[index] <= visitDates[index - 1]) throw new Error('Las fechas de visita deben ser únicas y estar en orden cronológico.');
  }
  const payload = {
    lot_code: lotCode,
    cycle_date: cycleDate,
    crop_state: $('#lot-followup-state').value.trim(),
    responsible: $('#lot-followup-responsible').value.trim(),
    visit_dates: visitDates,
    updated_at: new Date().toISOString()
  };
  const existingPlan = state.lotFollowupPlans.find(plan => plan.lot_code === lotCode);
  if (!state.editingLotFollowup && existingPlan &&
      !window.confirm('Ya existe un plan para este lote. ¿Deseas reemplazarlo con el nuevo ciclo y sus fechas?')) return;
  const editingLot = state.editingLotFollowup || (existingPlan && existingPlan.lot_code);
  let saved;
  try {
    saved = editingLot
      ? await cloudRequest('lot_visit_plans?lot_code=eq.' + encodeURIComponent(editingLot), {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: payload
      })
      : await cloudRequest('lot_visit_plans', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: payload
      });
  } catch (error) {
    if (!editingLot && /duplicate key|unique constraint|lot_visit_plans_pkey/i.test(error.message)) {
      throw new Error('Ya existe un plan para este lote. Actualiza la lista y edita el plan existente.');
    }
    throw error;
  }
  if (!Array.isArray(saved) || saved.length !== 1) throw new Error('Supabase no confirmó el guardado del plan.');
  await loadLotFollowup();
  resetLotFollowupForm();
  setLotFollowupStatus('El plan del lote ' + lotCode + ' se guardó correctamente.', 'success');
  toast(editingLot ? 'Plan actualizado.' : 'Plan guardado.');
}
async function importLotFollowupWorkbook(file) {
  if (!isActiveAdmin()) throw new Error('Solo una cuenta administradora activa puede importar planes.');
  if (!state.configured || !navigator.onLine) throw new Error('Conéctate a internet para importar planes a Supabase.');
  setLotFollowupStatus('Leyendo y validando el archivo Excel…', 'info');
  const rows = await parseXlsxWorkbook(file);
  const parsed = parseLotFollowupRows(rows);
  if (parsed.errors.length) {
    const details = parsed.errors.slice(0, 8).join(' · ');
    throw new Error(details + (parsed.errors.length > 8 ? ' · y ' + (parsed.errors.length - 8) + ' error(es) más.' : ''));
  }
  await loadLotFollowup();
  const issues = [];
  for (const plan of parsed.plans) {
    const authorizedLot = state.lotLookup[plan.lot_code];
    if (!authorizedLot) {
      issues.push('Lote ' + plan.lot_code + ' no existe en el catálogo o no está autorizado.');
      continue;
    }
    if (plan.finca && authorizedLot.finca && normalizeLotFarmLabel(plan.finca) !== normalizeLotFarmLabel(authorizedLot.finca)) {
      issues.push('La finca de la fila del lote ' + plan.lot_code + ' no coincide con el catálogo.');
    }
  }
  if (issues.length) throw new Error(issues.slice(0, 8).join(' · ') + (issues.length > 8 ? ' · y ' + (issues.length - 8) + ' error(es) más.' : ''));
  const existingLots = new Set(state.lotFollowupPlans.map(plan => plan.lot_code));
  const replacementCount = parsed.plans.filter(plan => existingLots.has(plan.lot_code)).length;
  if (replacementCount && !window.confirm('El archivo reemplazará los planes de ' + replacementCount + ' lote(s) que ya existen. ¿Deseas continuar?')) {
    setLotFollowupStatus('', '');
    return;
  }
  await cloudRequest('lot_visit_plans?on_conflict=lot_code', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: parsed.plans.map(plan => ({
      lot_code: plan.lot_code,
      cycle_date: plan.cycle_date,
      crop_state: plan.crop_state,
      responsible: plan.responsible,
      visit_dates: plan.visit_dates,
      updated_at: new Date().toISOString()
    }))
  });
  await loadLotFollowup();
  const savedPlans = new Map(state.lotFollowupPlans.map(plan => [plan.lot_code, plan]));
  const unconfirmed = parsed.plans.filter(plan => {
    const savedPlan = savedPlans.get(plan.lot_code);
    return !savedPlan ||
      savedPlan.cycle_date !== plan.cycle_date ||
      (savedPlan.crop_state || '') !== plan.crop_state ||
      (savedPlan.responsible || '') !== plan.responsible ||
      JSON.stringify(savedPlan.visit_dates || []) !== JSON.stringify(plan.visit_dates);
  });
  if (unconfirmed.length) {
    throw new Error('La base de datos no confirmó todos los planes del archivo: ' + unconfirmed.slice(0, 5).map(plan => plan.lot_code).join(', ') + '.');
  }
  setLotFollowupStatus('Se importaron ' + parsed.plans.length + ' plan(es); ' + replacementCount + ' reemplazaron un plan existente.', 'success');
  toast('Importación completada: ' + parsed.plans.length + ' lote(s).');
}
function renderHome() {
  renderGroups($('#module-groups'));
  renderGroups($('#module-picker'));
  $('#welcome-user').textContent = state.user.displayName.split(/\s+/)[0];
  $('#active-user').textContent = state.user.displayName;
  $('#active-role').textContent = roleName(state.user.role);
  $('#open-visit-map').hidden = !['admin', 'supervisor'].includes(state.user.role);
  $$('.admin-nav').forEach(group => { group.hidden = !isActiveAdmin(); });
  $$('[data-admin-only]').forEach(element => { element.hidden = !isActiveAdmin(); });
  $$('.reviewer-nav').forEach(group => { group.hidden = !canAccessLotFollowup(); });
  $('#invite-user-form').hidden = !isActiveAdmin();
  $('#create-user-form').hidden = !isActiveAdmin();
  resetLotFollowupForm();
  renderLotWeeklyFarmOptions();
  $('#lot-weekly-schedule-filter-farm').value = '';
  $('#lot-weekly-schedule-filter-week').value = '';
  $('#lot-weekly-schedule-filter-day').value = '';
  $('#lot-weekly-schedule-filter-responsible').value = '';
  populateInviteRoles();
  populateCreateUserRoles();
  $('#home-subtitle').textContent = state.user.role === 'aereo' ? 'Captura vuelos y datos de apoyo para aplicaciones aéreas.' : state.user.role === 'terrestre' ? 'Captura calibraciones y labores de aplicación terrestre.' : state.user.role === 'supervisor' ? 'Consulta tus capturas y los apartados de Malezas y Calidad.' : 'Administra perfiles y revisa las capturas aéreas y terrestres.';
  refreshLists();
}
function workspaceMenuKey() {
  return WORKSPACE_MENU_KEY + state.user.id;
}
function readWorkspaceMenu() {
  try {
    const saved = JSON.parse(localStorage.getItem(workspaceMenuKey()) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch (error) {
    console.warn('No se pudo leer el menú guardado.', error);
    return {};
  }
}
function saveWorkspaceMenu(page) {
  if (!state.user) return;
  try {
    const saved = readWorkspaceMenu();
    if (page) saved.page = page;
    saved.groups = Object.fromEntries($$('[data-menu-group]').map(group => [group.dataset.menuGroup, group.open]));
    localStorage.setItem(workspaceMenuKey(), JSON.stringify(saved));
  } catch (error) {
    console.warn('No se pudo guardar el menú de trabajo.', error);
    toast('No se pudo guardar el menú en este dispositivo.');
  }
}
function restoreWorkspaceMenu() {
  const saved = readWorkspaceMenu();
  $$('[data-menu-group]').forEach(group => {
    if (saved.groups && typeof saved.groups[group.dataset.menuGroup] === 'boolean') {
      group.open = saved.groups[group.dataset.menuGroup];
    } else group.open = true;
  });
  const page = WORKSPACE_PAGES.includes(saved.page) ? saved.page : 'inicio';
  if (['usuarios', 'exportar-excel'].includes(page) && !isActiveAdmin()) return 'inicio';
  if (['seguimiento-lotes', 'programacion-semanal'].includes(page) && !canAccessLotFollowup()) return 'inicio';
  return page;
}
function setMobileMenu(open) {
  $('#workspace-menu').classList.toggle('mobile-open', open);
  $('#mobile-menu-toggle').setAttribute('aria-expanded', String(open));
  $('#mobile-menu-backdrop').hidden = !open;
  document.body.classList.toggle('mobile-menu-open', open);
  if (open) $('#mobile-menu-close').focus();
}
function navigate(page) {
  if (!state.user) return;
  if (!WORKSPACE_PAGES.includes(page)) return;
  if (['usuarios', 'exportar-excel'].includes(page) && !isActiveAdmin()) { toast('Solo una cuenta administradora activa puede abrir esta pantalla.'); return; }
  if ((page === 'seguimiento-lotes' || page === 'programacion-semanal') && !canAccessLotFollowup()) { toast('Solo una cuenta administradora o supervisora activa puede consultar el seguimiento de lotes.'); return; }
  if (!state.editingRecord && WORK_CONTEXT_MODULES.includes(state.currentModule) &&
      !saveWorkContextDraft(state.currentModule, false)) {
    toast('No se pudo conservar el contexto de trabajo en este dispositivo.');
  }
  if (state.recordTimeTimer) { clearInterval(state.recordTimeTimer); state.recordTimeTimer = null; }
  if (page !== 'capturar' && state.editingRecord) {
    state.editingRecord = null;
    state.currentModule = null;
    $('#capture-form').reset();
    $('#form-fields').innerHTML = '';
    $('#capture-form').hidden = true;
    $('#module-picker').hidden = false;
    $('#capture-submit').textContent = 'Guardar captura';
  }
  $$('.page').forEach(section => { section.hidden = section.id !== 'page-' + page; });
  $$('.nav-item,.mobile-nav button').forEach(button => {
    const active = button.dataset.page === page ||
      (page === 'gestionar' && button.closest('.mobile-nav') && button.dataset.page === 'registros');
    button.classList.toggle('active', !!active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $$('.nav-group').forEach(group => {
    group.classList.toggle('has-active-page', !!$('[data-page="' + page + '"]', group));
  });
  $('#mobile-menu-toggle').classList.toggle('active', !['inicio', 'capturar', 'pendientes', 'registros'].includes(page));
  saveWorkspaceMenu(page);
  setMobileMenu(false);
  if (page === 'capturar') {
    state.editingRecord = null;
    $('#capture-form').reset();
    $('#form-fields').innerHTML = '';
    state.currentModule = null;
    $('#capture-form').hidden = true;
    $('#module-picker').hidden = false;
    $('#capture-submit').textContent = 'Guardar captura';
    $('#capture-eyebrow').textContent = 'NUEVA CAPTURA';
    $('#form-title').textContent = 'Selecciona una actividad';
    $('#form-subtitle').textContent = 'Elige un apartado disponible para tu perfil.';
    renderGroups($('#module-picker'));
  }
  if (page === 'pendientes' || page === 'registros' || page === 'gestionar' || page === 'inicio') refreshLists();
  if (page === 'usuarios') refreshUsers().catch(handleCloudError);
  if (page === 'exportar-excel') {
    renderExcelModules();
    void loadExcelFilterOptions();
  }
  if (page === 'variacion-vuelo') void loadFlightVariation();
  if (page === 'clima-grafica') void loadClimateChart();
  if (page === 'seguimiento-lotes' || page === 'programacion-semanal') {
    loadLotFollowup().catch(handleLotFollowupError);
  }
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
let excelExportSequence = 0;
let excelOptionsSequence = 0;
const excelFilterLabels = { farm: 'Todas las fincas', zone: 'Todas las zonas', labor: 'Todas las labores', owner: 'Todos los usuarios' };
function resetExcelExport() {
  excelExportSequence++;
  excelOptionsSequence++;
  $('#excel-export-form').reset();
  $('#excel-export-modules').innerHTML = '';
  $('#excel-export-status').textContent = '';
  $('#excel-export-submit').disabled = false;
  for (const [key, label] of Object.entries(excelFilterLabels)) {
    $('#excel-' + key).innerHTML = '<option value="">' + esc(label) + '</option>';
  }
  $('#excel-options-status').textContent = '';
  $('#excel-options-retry').hidden = true;
}
function renderExcelModules() {
  const container = $('#excel-export-modules');
  if (container.children.length) return;
  container.innerHTML = Object.entries(modules).map(([key, module]) =>
    '<label><input type="checkbox" name="module" value="' + esc(key) + '" checked><span>' + esc(module.title) + '</span></label>').join('');
}
async function fetchExcelRecords(selected, isCurrent) {
  const records = [];
  let afterCreated = null, afterId = null;
  for (;;) {
    const page = await cloudRequest('rpc/admin_export_field_records', {
      method: 'POST',
      body: { p_modules: selected, p_after_created: afterCreated, p_after_id: afterId, p_limit: 250 }
    });
    if (!isCurrent()) return null;
    if (!Array.isArray(page) || page.length > 250) throw new Error('La base de datos devolvió una respuesta de exportación no válida.');
    records.push(...page);
    if (page.length < 250) return records;
    const last = page[page.length - 1];
    if (!last.created_at || !last.id || (last.created_at === afterCreated && last.id === afterId)) {
      throw new Error('No se pudo continuar la consulta de exportación.');
    }
    afterCreated = last.created_at;
    afterId = last.id;
  }
}
async function loadExcelFilterOptions() {
  if (!isActiveAdmin()) return;
  const userId = state.user.id;
  const sequence = ++excelOptionsSequence;
  const isCurrent = () => sequence === excelOptionsSequence && isActiveAdmin() && state.user.id === userId;
  const status = $('#excel-options-status');
  const retry = $('#excel-options-retry');
  status.textContent = 'Cargando opciones de las capturas sincronizadas…';
  retry.hidden = true;
  try {
    if (!navigator.onLine || !state.configured) throw new Error('Conéctate al espacio compartido.');
    const records = await fetchExcelRecords(Object.keys(modules), isCurrent);
    if (!records || !isCurrent()) return;
    const options = ExcelExport.filterOptions(records);
    for (const [key, label] of Object.entries(excelFilterLabels)) {
      const select = $('#excel-' + key);
      const selected = select.value;
      const items = options[key].slice();
      if (selected && !items.includes(selected)) items.push(selected);
      select.innerHTML = '<option value="">' + esc(label) + '</option>' +
        items.map(value => '<option value="' + esc(value) + '">' + esc(value) + '</option>').join('');
      select.value = selected;
    }
    status.textContent = records.length
      ? 'Opciones obtenidas de las capturas sincronizadas de todos los módulos.'
      : 'No hay capturas sincronizadas para mostrar opciones de filtro.';
  } catch (error) {
    if (!isCurrent()) return;
    console.error('No se pudieron cargar las opciones de exportación.', error);
    status.textContent = 'No se pudieron cargar las opciones de filtro. ' + (error.message || 'Vuelve a intentarlo.');
    retry.hidden = false;
  }
}
async function downloadAdminExcel(event) {
  event.preventDefault();
  if (!isActiveAdmin()) { toast('Solo una cuenta administradora activa puede exportar capturas.'); return; }
  const userId = state.user.id;
  const sequence = ++excelExportSequence;
  const button = $('#excel-export-submit');
  const status = $('#excel-export-status');
  const selected = $$('input[name="module"]:checked', $('#excel-export-modules')).map(input => input.value);
  const filters = {
    from: $('#excel-from').value, to: $('#excel-to').value,
    farm: $('#excel-farm').value.trim(), zone: $('#excel-zone').value.trim(),
    labor: $('#excel-labor').value.trim(), owner: $('#excel-owner').value.trim()
  };
  if (!selected.length || selected.some(key => !Object.hasOwn(modules, key))) {
    status.textContent = 'Selecciona al menos un módulo válido.';
    return;
  }
  if ((filters.from && !ExcelExport.dateValue(filters.from)) || (filters.to && !ExcelExport.dateValue(filters.to)) ||
      (filters.from && filters.to && filters.from > filters.to)) {
    status.textContent = 'El rango de fechas no es válido.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Consultando las capturas sincronizadas…';
  try {
    if (!navigator.onLine || !state.configured) throw new Error('Conéctate al espacio compartido para descargar las capturas.');
    const records = await fetchExcelRecords(selected, () =>
      sequence === excelExportSequence && isActiveAdmin() && state.user.id === userId);
    if (!records) return;
    const visitLinks = selected.includes('malezas') ? await fetchAllLotFollowupVisits() : [];
    if (sequence !== excelExportSequence || !isActiveAdmin() || state.user.id !== userId) return;
    status.textContent = 'Preparando el archivo Excel…';
    const result = await ExcelExport.createWorkbook(records, selected, filters, modules, { childSchemas, qualityForms }, window.ExcelJS,
      { visitLinks, weedsCatorcenaForDate });
    if (sequence !== excelExportSequence || !isActiveAdmin() || state.user.id !== userId) return;
    const blob = new Blob([result.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mym-campo-capturas-' + localDate() + '.xlsx';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status.textContent = result.totalRows
      ? 'Archivo listo: se inició la descarga de ' + result.totalRows + ' fila(s).'
      : 'Archivo listo: no hay capturas que coincidan con los filtros.';
  } catch (error) {
    if (sequence !== excelExportSequence) return;
    console.error('No se pudo exportar Excel.', error);
    status.textContent = 'No se pudo descargar Excel: ' + (error.message || 'error inesperado') + '.';
  } finally {
    if (sequence === excelExportSequence) button.disabled = false;
  }
}
function handleCloudError(error) {
  state.syncConnected = false;
  updateConnection();
  console.error('No se pudo completar la operación con el espacio compartido.', error);
  if (state.user) toast(error.message || 'No se pudo conectar con el espacio compartido.');
}
async function startSession(user, session) {
  resetFlightVariation();
  resetClimateChart();
  resetExcelExport();
  state.authSession = session;
  state.visitMap = null;
  clearLotFollowupData();
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
  navigate(restoreWorkspaceMenu());
  if (navigator.onLine) {
    try { await syncCloudRecords(false); }
    catch (error) { handleCloudError(error); }
  }
}
async function endSession() {
  if (!state.editingRecord && WORK_CONTEXT_MODULES.includes(state.currentModule) &&
      !saveWorkContextDraft(state.currentModule, false)) {
    toast('No se pudo conservar el contexto de trabajo en este dispositivo.');
  }
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
  state.zoneOptions = [];
  state.zonesReady = false;
  state.usersLoadPromise = null;
  $('#users-list').innerHTML = '';
  $('#create-user-zones').innerHTML = '';
  $('#invite-user-zones').innerHTML = '';
  $('#users-load-status').hidden = true;
  setMobileMenu(false);
  state.visitMap = null;
  state.flightReportRecords = [];
  resetFlightVariation();
  resetClimateChart();
  resetExcelExport();
  clearLotFollowupData();
  const mapDialog = $('#visit-map-dialog');
  if (mapDialog.open) mapDialog.close();
  const flightReportDialog = $('#flight-report-dialog');
  if (flightReportDialog.open) flightReportDialog.close();
  resetFlightReportView();
  $('#visit-map-stage').innerHTML = '';
  state.acceptingInvite = false;
  localStorage.removeItem(INVITE_PENDING_KEY);
  state.syncConnected = false;
  state.currentModule = null;
  state.editingRecord = null;
  if (state.recordTimeTimer) { clearInterval(state.recordTimeTimer); state.recordTimeTimer = null; }
  $('#capture-form').reset();
  $('#form-fields').innerHTML = '';
  $('#capture-submit').textContent = 'Guardar captura';
  showAuthScreen('login');
}
$$('[data-menu-group]').forEach(group => group.addEventListener('toggle', () => saveWorkspaceMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#workspace-menu').classList.contains('mobile-open')) {
    setMobileMenu(false);
    $('#mobile-menu-toggle').focus();
  }
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 760 && $('#workspace-menu').classList.contains('mobile-open')) setMobileMenu(false);
});
document.addEventListener('click', event => {
  if (event.target.closest('#mobile-menu-toggle')) {
    setMobileMenu(!$('#workspace-menu').classList.contains('mobile-open'));
    return;
  }
  if (event.target.closest('#mobile-menu-close, #mobile-menu-backdrop')) {
    setMobileMenu(false);
    $('#mobile-menu-toggle').focus();
    return;
  }
  if (event.target.closest('#users-retry')) {
    refreshUsers().catch(handleCloudError);
    return;
  }
  const authMode = event.target.closest('[data-auth-mode]');
  if (authMode) { showAuthScreen(authMode.dataset.authMode); return; }
  const flightReportButton = event.target.closest('[data-open-flight-report]');
  if (flightReportButton) {
    event.preventDefault();
    openFlightReport().catch(handleFlightReportError);
    return;
  }
  const viewRecord = event.target.closest('[data-view-record]');
  if (viewRecord) {
    showRecordDetails(viewRecord.dataset.viewRecord).catch(error => {
      console.error(error);
      toast('No se pudo cargar la información de la captura.');
    });
    return;
  }
  const eppPdfButton = event.target.closest('[data-epp-pdf]');
  if (eppPdfButton) {
    generateEppPdf(eppPdfButton.dataset.eppPdf).catch(error => {
      console.error(error);
      toast('No se pudo generar el PDF de la captura EPP.');
    });
    return;
  }
  const malezasPdfButton = event.target.closest('[data-malezas-pdf]');
  if (malezasPdfButton) {
    generateMalezasPdf(malezasPdfButton.dataset.malezasPdf).catch(error => {
      console.error(error);
      toast(error.message || 'No se pudo generar el PDF de la captura Malezas.');
    });
    return;
  }
  const editRecordButton = event.target.closest('[data-edit-record]');
  if (editRecordButton) {
    editCapture(editRecordButton.dataset.editRecord).catch(error => {
      console.error(error);
      toast('No se pudo abrir la captura guardada en este dispositivo.');
    });
    return;
  }
  const deleteRecordButton = event.target.closest('[data-delete-record]');
  if (deleteRecordButton) {
    deleteCapture(deleteRecordButton.dataset.deleteRecord).catch(error => {
      console.error(error);
      toast('No se pudo actualizar la captura guardada en este dispositivo.');
    });
    return;
  }
  const lotFollowupEditButton = event.target.closest('[data-lot-followup-edit]');
  if (lotFollowupEditButton) { editLotFollowup(lotFollowupEditButton.dataset.lotFollowupEdit); return; }
  if (event.target.closest('#lot-followup-add-date')) { addLotFollowupDateInput(''); return; }
  const removeLotFollowupDateButton = event.target.closest('[data-remove-lot-followup-date]');
  if (removeLotFollowupDateButton) {
    removeLotFollowupDateButton.closest('.lot-followup-date-row').remove();
    $$('.lot-followup-date-row', $('#lot-followup-date-inputs')).forEach((row, index) => {
      $('.field-label', row).textContent = 'VISITA ' + (index + 1);
    });
    return;
  }
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
  const memberDeleteButton = event.target.closest('[data-member-delete]');
  if (memberDeleteButton) {
    deleteMember(memberDeleteButton).catch(handleCloudError);
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
$('#form-fields').addEventListener('click', event => {
  const saveButton = event.target.closest('[data-save-work-context]');
  if (saveButton) {
    event.preventDefault();
    const saved = saveWorkContextDraft(saveButton.dataset.saveWorkContext, true);
    toast(saved ? 'Contexto guardado en este dispositivo.' : 'No se pudo guardar el contexto de trabajo.');
    return;
  }
  const newContextButton = event.target.closest('[data-new-work-context]');
  if (!newContextButton) return;
  event.preventDefault();
  const moduleKey = newContextButton.dataset.newWorkContext;
  if (!window.confirm('¿Iniciar un contexto nuevo? El borrador actual de ' +
      (moduleKey === 'vuelos' ? 'Vuelos' : 'Clima') + ' se eliminará de este dispositivo.')) return;
  if (!clearWorkContextDraft(moduleKey)) return;
  chooseModule(moduleKey);
  toast('Contexto nuevo iniciado.');
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
  if (event.target.matches('[data-lot-lookup]')) void updateLotLocations($('#form-fields'), false);
  if (event.target.matches('[data-farm-selector]')) updateZoneFromFarm($('#form-fields'));
  if (state.currentModule === 'vuelos' && ['labor', 'litros', 'area_ha'].includes(event.target.name)) {
    updateFlightMetricsReadouts();
  }
  if (state.currentModule === 'malezas') updateWeedsDatesForInput(event.target);
  if (WORK_CONTEXT_MODULES.includes(state.currentModule)) saveWorkContextDraft(state.currentModule, false);
});
$('#capture-form').addEventListener('change', event => {
  if (event.target.matches('[data-lot-lookup]')) void updateLotLocations($('#form-fields'), true);
  if (event.target.matches('[data-farm-selector]')) updateZoneFromFarm($('#form-fields'));
  if (state.currentModule === 'vuelos' && ['labor', 'litros', 'area_ha'].includes(event.target.name)) {
    updateFlightMetricsReadouts();
  }
  if (state.currentModule === 'malezas') updateWeedsDatesForInput(event.target);
  if (state.currentModule === 'vuelos' && !state.editingRecord && event.target.name === 'labor') {
    const laborInput = event.target;
    const previousLabor = laborInput.dataset.activityLabor || '';
    if (!laborInput.value) {
      laborInput.value = previousLabor;
      updateFlightMetricsReadouts();
    } else {
      const requestedLabor = laborInput.value;
      const contextInput = $('[name="contexto_vuelos_id"]', $('#form-fields'));
      setWorkContextStatus('vuelos', 'Actualizando la labor en los vuelos asociados...', false);
      state.flightActivityLaborUpdatePromise = queueFlightActivityLaborUpdate(
        contextInput && contextInput.value,
        requestedLabor,
        state.user.id,
        state.user.username
      ).then(result => {
        if (!resolveFlightActivityLaborSelection(laborInput, requestedLabor, result)) return result;
        if (!result || !result.ok) {
          updateFlightMetricsReadouts();
          saveWorkContextDraft('vuelos', false);
          setWorkContextStatus('vuelos', 'No se pudo actualizar la labor de los vuelos asociados.', true);
        } else {
          setWorkContextStatus('vuelos', flightActivityLaborMessage(result), false);
        }
        return result;
      });
    }
  }
  if (WORK_CONTEXT_MODULES.includes(state.currentModule)) saveWorkContextDraft(state.currentModule, false);
});
$('#form-fields').addEventListener('change', event => {
  if (event.target.id === 'pcpm-labor') renderPcpmDetails(event.target.value);
  if (event.target.id === 'ag-tipo-aguilon') renderAguilonDetails(event.target.value);
  if (event.target.name === 'calidad_tipo' && state.currentModule === 'calidad') renderQualityDetails(event.target.value);
});
$('#capture-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const editing = state.editingRecord;
  const moduleKey = state.currentModule;
  const captureTime = captureTimestamp();
  if (moduleKey === 'vuelos' && state.flightActivityLaborUpdatePromise) {
    const activityLaborUpdate = await state.flightActivityLaborUpdatePromise;
    if (!activityLaborUpdate || !activityLaborUpdate.ok) return;
  }
  if (editing && editing.syncStatus === 'synced' && !navigator.onLine) {
    toast('Conéctate a internet para guardar cambios de una captura sincronizada.');
    return;
  }
  const lotLookupResult = await updateLotLocations(form, true);
  if (lotLookupResult === null) {
    toast('No se pudo comprobar la disponibilidad de los lotes. Verifica tu conexión e inténtalo de nuevo.');
    return;
  }
  const unauthorizedLots = invalidLotsInForm(form);
  if (unauthorizedLots.length) {
    toast('Sin acceso a los lotes: ' + unauthorizedLots.join(', '));
    return;
  }
  if (state.currentModule === 'clima' && !$$('.repeat-row', $('#weather-rows')).length) { toast('Agrega por lo menos una lectura de clima.'); return; }
  if (moduleKey === 'vuelos') {
    const contextId = $('[name="contexto_vuelos_id"]', $('#form-fields'));
    if (contextId && !contextId.value) contextId.value = crypto.randomUUID();
  }
  const createdAt = editing ? editing.createdAt : captureTime.createdAt;
  const recordId = editing ? editing.id : crypto.randomUUID();
  let datos;
  try { datos = await serializeForm(form, recordId, editing && editing.datos); }
  catch (error) { console.error(error); toast('No se pudo preparar la captura. Revisa los datos e inténtalo de nuevo.'); return; }
  if (!editing) datos.hora_registro = captureTime.horaRegistro;
  const record = editing
    ? {
      ...editing, id: recordId, tipo: state.currentModule, createdAt, schemaVersion: 5,
      syncStatus: editing.syncStatus === 'synced' ? 'synced' : 'pending', datos
    }
    : {
      id: recordId, tipo: state.currentModule, createdAt, schemaVersion: 5, syncStatus: 'pending',
      syncOrigin: 'new', ownerId: state.user.id, ownerUsername: state.user.username, ownerName: state.user.displayName, ownerRole: state.user.role, datos
    };
  if (editing) {
    record.reviewStatus = 'pending';
    record.reviewedBy = null;
    record.reviewedAt = null;
    record.reviewNote = null;
  }
  if (editing && editing.syncStatus === 'synced') {
    try {
      await cloudRequest('rpc/update_field_record', {
        method: 'POST',
        body: { p_record_id: recordId, p_schema_version: 5, p_datos: datos }
      });
    } catch (error) {
      handleCloudError(error);
      return;
    }
  }
  try {
    await putRecord(record);
    let flightActivityLaborResult = null;
    if (editing && moduleKey === 'vuelos') {
      const ownerId = record.ownerId || (record.ownerUsername === state.user.username ? state.user.id : null);
      flightActivityLaborResult = await queueFlightActivityLaborUpdate(
        record.datos.contexto_vuelos_id,
        record.datos.labor,
        ownerId,
        record.ownerUsername || state.user.username
      );
    }
    await refreshLists();
    if (!editing && moduleKey === 'vuelos') {
      clearFlightEntryFields($('#form-fields'));
      updateFlightMetricsReadouts();
      const contextSaved = saveWorkContextDraft('vuelos', true);
      if (contextSaved) {
        setWorkContextStatus('vuelos', 'Vuelo guardado como registro independiente. Puedes agregar otro a este contexto.', false);
      }
      toast(contextSaved
        ? 'Vuelo guardado. Puedes agregar otro a la misma jornada.'
        : 'Vuelo guardado, pero no se pudo conservar el contexto en este dispositivo.');
      if (navigator.onLine) syncCloudRecords(false).catch(handleCloudError);
      return;
    }
    const contextCleared = editing || moduleKey !== 'clima' || clearWorkContextDraft('clima');
    form.reset();
    $('#form-fields').innerHTML = '';
    $('#capture-submit').textContent = 'Guardar captura';
    state.editingRecord = null;
    state.currentModule = null;
    const savedMessage = !contextCleared
      ? 'Captura guardada, pero no se pudo borrar el contexto anterior de este dispositivo.'
      : editing
      ? editing.syncStatus === 'synced' ? 'Cambios guardados; la captura volvió a revisión pendiente.' : 'Cambios guardados en este dispositivo.'
      : 'Guardado en este dispositivo.';
    toast(flightActivityLaborResult
      ? flightActivityLaborResult.ok
        ? flightActivityLaborResult.updated
          ? 'Cambios guardados. ' + flightActivityLaborMessage(flightActivityLaborResult)
          : savedMessage
        : 'Captura guardada, pero no se pudo actualizar la labor de todos los vuelos de la actividad.'
      : savedMessage);
    navigate(editing ? 'gestionar' : 'inicio');
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
  if (!['admin', 'aereo'].includes($('#create-user-role').value) && !state.zonesReady) {
    authMessage('create-user-message', 'Primero carga las zonas permitidas con el botón Reintentar.');
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
  $$('input:checked', $('#create-user-zones')).forEach(input => { input.checked = false; });
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
  if (!['admin', 'aereo'].includes($('#invite-user-role').value) && !state.zonesReady) {
    authMessage('invite-user-message', 'Primero carga las zonas permitidas con el botón Reintentar.');
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
    $$('input:checked', $('#invite-user-zones')).forEach(input => { input.checked = false; });
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
  if (!['admin', 'aereo'].includes(roleSelect.value) && !state.zonesReady) {
    throw new Error('Primero carga las zonas permitidas con el botón Reintentar.');
  }
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
async function deleteMember(button) {
  if (!isActiveAdmin()) throw new Error('Solo un administrador activo puede eliminar usuarios.');
  const userId = button.dataset.memberDelete;
  if (userId === state.user.id) throw new Error('No puedes eliminar tu propia cuenta.');
  if (!window.confirm('¿Eliminar la cuenta de ' + button.dataset.memberName +
      '? La persona perderá el acceso. Se conservarán sus capturas sincronizadas y su historial de visitas. ' +
      'Las capturas pendientes de otros dispositivos ya no podrán sincronizarse con esta cuenta.')) return;
  button.disabled = true;
  try {
    await apiRequest('/functions/v1/delete-user', {
      method: 'POST', token: await accessToken(), body: { user_id: userId }
    });
    authMessage('user-create-message', 'Cuenta eliminada. Sus capturas sincronizadas y visitas se conservaron.');
    $('#user-create-message').classList.add('success-message');
    await refreshUsers();
  } finally {
    button.disabled = false;
  }
}
async function reviewRecord(recordId, decision) {
  if (!['approved', 'rejected'].includes(decision) || !isActiveAdmin()) return;
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
function handleLotFollowupError(error) {
  console.error('No se pudo completar la operación de seguimiento de lotes.', error);
  setLotFollowupStatus(error.message || 'No se pudo completar la operación.', 'warning');
  toast(error.message || 'No se pudo completar la operación de seguimiento.');
}
$('#check-access').addEventListener('click', async () => {
  try { await refreshCloudProfile(); }
  catch (error) { authMessage('pending-error', error.message || 'No se pudo comprobar el acceso.'); }
});
$('#pending-logout').addEventListener('click', endSession);
$('#record-search').addEventListener('input', refreshLists);
$('#manage-record-search').addEventListener('input', refreshLists);
$('#open-visit-map').addEventListener('click', openVisitMap);
$('#visit-map-stage').addEventListener('click', event => {
  const lot = event.target.closest('[data-visit-lot]');
  if (lot) selectVisitMapLot(lot.dataset.visitLot);
});
$('#visit-map-stage').addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const lot = event.target.closest('[data-visit-lot]');
  if (!lot) return;
  event.preventDefault();
  selectVisitMapLot(lot.dataset.visitLot);
});
function visibleLocalRecords(records) {
  const scoped = records.filter(record => record.syncStatus !== 'delete-pending' && recordHasLotAccess(record));
  if (isActiveAdmin()) return scoped;
  return scoped.filter(record => flightRecordBelongsToUser(record, state.user));
}
$('#climate-chart-filters').addEventListener('change', renderClimateChart);
$('#excel-export-form').addEventListener('submit', event => { void downloadAdminExcel(event); });
$('#excel-options-retry').addEventListener('click', () => { void loadExcelFilterOptions(); });
$('#climate-chart-refresh').addEventListener('click', () => { void loadClimateChart(); });
function selectClimateReading(event) {
  const target = event.target.closest('[data-climate-reading]');
  if (!target || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
  if (event.type === 'keydown') event.preventDefault();
  const row = (state.climateRows || [])[Number(target.dataset.climateReading)];
  if (!row) return;
  state.climateSelected = row.key;
  renderClimateDetails(row);
  $$('[data-climate-reading]', $('#climate-chart-list')).forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.climateReading) === Number(target.dataset.climateReading)));
  });
}
$('#climate-chart-plot').addEventListener('click', selectClimateReading);
$('#climate-chart-plot').addEventListener('keydown', selectClimateReading);
$('#climate-chart-list').addEventListener('click', selectClimateReading);
$('#flight-variation-filters').addEventListener('change', renderFlightVariation);
$('#flight-variation-refresh').addEventListener('click', () => { void loadFlightVariation(); });
$('#flight-variation-chart').addEventListener('click', event => {
  const button = event.target.closest('[data-flight-variation-drone]');
  if (!button) return;
  state.flightVariationDrone = button.dataset.flightVariationDrone;
  renderFlightVariation();
  const replacement = $$('[data-flight-variation-drone]', $('#flight-variation-chart'))
    .find(item => item.dataset.flightVariationDrone === state.flightVariationDrone);
  if (replacement) replacement.focus({ preventScroll: true });
});
$('#flight-report-filters').addEventListener('change', renderFlightReport);
$('#flight-report-refresh').addEventListener('click', () => loadFlightReportRecords().catch(handleFlightReportError));
$('#flight-report-pdf').addEventListener('click', () => {
  try {
    generateFlightReportPdf();
  } catch (error) {
    console.error('No se pudo generar el PDF acumulado de Vuelos.', error);
    toast(error.message || 'No se pudo generar el PDF acumulado de Vuelos.');
  }
});
$('#import-local').addEventListener('click', async () => {
  try {
    const result = await syncCloudRecords(true);
    const deleted = result.deleted ? result.deleted + (result.deleted === 1 ? ' eliminación sincronizada; ' : ' eliminaciones sincronizadas; ') : '';
    toast(result.uploaded + ' registros locales importados; ' + deleted + result.downloaded + ' registros compartidos actualizados.');
  } catch (error) { handleCloudError(error); }
});
$('#sync-now').addEventListener('click', async () => {
  try {
    if (!navigator.onLine || !state.configured) throw new Error('Conéctate al espacio compartido para sincronizar.');
    const result = await syncCloudRecords(false);
    const deleted = result.deleted ? result.deleted + (result.deleted === 1 ? ' eliminación sincronizada; ' : ' eliminaciones sincronizadas; ') : '';
    if (result.weeklyConflicts) toast('Hay visitas con conflictos. Revísalas en Pendientes.');
    else toast(result.uploaded + ' capturas y ' + (result.weeklyUploaded || 0) +
      ' visitas sincronizadas; ' + deleted + result.downloaded + ' registros compartidos actualizados.');
  } catch (error) { handleCloudError(error); }
});
$('#pending-weekly-list').addEventListener('click', async event => {
  const retry = event.target.closest('[data-retry-weekly]');
  const download = event.target.closest('[data-export-weekly]');
  const edit = event.target.closest('[data-edit-weekly]');
  if (!retry && !download && !edit) return;
  try {
    if (retry) await retryWeeklyOutbox(retry.dataset.retryWeekly);
    else if (edit) {
      const group = (await getWeeklyVisitOutbox()).find(item => item.id === edit.dataset.editWeekly);
      if (!group || !canAccessWeeklyOutbox(group)) throw new Error('No tienes acceso a este grupo de visitas.');
      const visits = group.captures.map(capture => ({
        lotCode: capture.lot_code, cycleDate: capture.cycle_date, visitNumber: capture.visit_number,
        scheduledDate: capture.scheduled_date, farm: group.farm,
        responsible: capture.datos.RESPONSABLE || ''
      }));
      await openWeeklyCapture({
        dataset: { weeklyCaptureGroup: JSON.stringify(visits), weeklyCaptureDate: group.assignedDate }
      }, group);
    }
    else {
      const group = (await getWeeklyVisitOutbox()).find(item => item.id === download.dataset.exportWeekly);
      if (!group || !canAccessWeeklyOutbox(group)) throw new Error('No tienes acceso a este grupo de visitas.');
      downloadJson(group.captures, 'mym-campo-visitas-pendientes-' + localDate() + '.json');
    }
  } catch (error) { handleLotFollowupError(error); }
});
$('#lot-followup-form').addEventListener('submit', event => {
  saveLotFollowup(event).catch(handleLotFollowupError);
});
$('#lot-followup-code').addEventListener('input', updateLotFollowupFarm);
$('#lot-followup-code').addEventListener('change', async () => {
  const lotCode = normalizeVisitMapLotCode($('#lot-followup-code').value);
  if (!lotCode || state.lotLookup[lotCode]) { updateLotFollowupFarm(); return; }
  try {
    await refreshLotLookupEntry(lotCode);
    updateLotFollowupFarm();
  } catch (error) {
    handleLotFollowupError(error);
  }
});
$('#lot-followup-cancel-edit').addEventListener('click', () => {
  resetLotFollowupForm();
  setLotFollowupStatus('', '');
});
$('#lot-followup-refresh').addEventListener('click', () => loadLotFollowup().catch(handleLotFollowupError));
$('#lot-followup-search').addEventListener('input', renderLotFollowup);
$('#lot-followup-filter').addEventListener('change', renderLotFollowup);
$('#lot-weekly-schedule-filter-farm').addEventListener('change', renderLotWeeklySchedule);
$('#lot-weekly-schedule-filter-week').addEventListener('change', renderLotWeeklySchedule);
$('#lot-weekly-schedule-filter-day').addEventListener('change', renderLotWeeklySchedule);
$('#lot-weekly-schedule-filter-responsible').addEventListener('change', renderLotWeeklySchedule);
$('#lot-weekly-schedule-refresh').addEventListener('click', () => loadLotFollowup().catch(handleLotFollowupError));
$('#lot-weekly-program-list').addEventListener('click', event => {
  const button = event.target.closest('[data-weekly-capture-group]');
  if (button) openWeeklyCapture(button).catch(handleLotFollowupError);
});
$('#weekly-capture-form').addEventListener('input', event => {
  updateWeedsDatesForInput(event.target, $('#weekly-capture-fields'));
  queueWeeklyCaptureDraft();
});
$('#weekly-capture-form').addEventListener('change', event => {
  updateWeedsDatesForInput(event.target, $('#weekly-capture-fields'));
  queueWeeklyCaptureDraft();
});
$('#weekly-capture-form').addEventListener('click', event => {
  const button = event.target.closest('[data-weekly-toggle-visit]');
  const capture = weeklyCapture;
  if (!button || !capture || capture.busy || capture.saving || capture.reviewConflict) return;
  const row = button.closest('.child-row');
  const identity = row.dataset.weeklyVisitIdentity;
  if (!capture.visits.some(visit => weeklyVisitIdentity(visit) === identity)) return;
  const included = capture.excludedVisits.has(identity);
  if (included) capture.excludedVisits.delete(identity);
  else capture.excludedVisits.add(identity);
  setWeeklyVisitIncluded(row, included);
  updateWeeklyCaptureDateLimit(capture);
  queueWeeklyCaptureDraft();
});
$('#weekly-capture-form').addEventListener('submit', event => {
  saveWeeklyCapture(event).catch(showWeeklyCaptureError);
});
$('#weekly-capture-close').addEventListener('click', () => closeWeeklyCaptureDialog().catch(showWeeklyCaptureError));
$('#weekly-capture-cancel').addEventListener('click', () => closeWeeklyCaptureDialog().catch(showWeeklyCaptureError));
$('#weekly-capture-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  if (!weeklyCapture || !weeklyCapture.busy) closeWeeklyCaptureDialog().catch(showWeeklyCaptureError);
});
$('#weekly-capture-dialog').addEventListener('click', event => {
  if (event.target !== $('#weekly-capture-dialog') || !weeklyCapture || weeklyCapture.busy) return;
  closeWeeklyCaptureDialog().catch(showWeeklyCaptureError);
});
$('#weekly-capture-dialog').addEventListener('close', () => { weeklyCapture = null; });
$('#lot-followup-import').addEventListener('change', async event => {
  const input = event.currentTarget;
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    await importLotFollowupWorkbook(file);
  } catch (error) {
    handleLotFollowupError(error);
  } finally {
    input.value = '';
  }
});
$('#export-all').addEventListener('click', async () => downloadJson(visibleLocalRecords(await getRecords()), 'mym-campo-' + localDate() + '.json'));
$('#export-pending').addEventListener('click', async () => downloadJson(visibleLocalRecords(await getRecords()).filter(record => record.syncStatus === 'pending'), 'mym-campo-pendientes-' + localDate() + '.json'));
$('#logout-button').addEventListener('click', endSession);
window.addEventListener('online', () => {
  updateConnection();
  syncCloudRecords(false).catch(handleCloudError);
  if (state.user && (!$('#page-seguimiento-lotes').hidden || !$('#page-programacion-semanal').hidden)) loadLotFollowup().catch(handleLotFollowupError);
  if (state.user && !$('#page-clima-grafica').hidden) void loadClimateChart();
  if (state.user && !$('#page-variacion-vuelo').hidden) void loadFlightVariation();
});
window.addEventListener('offline', () => {
  updateConnection();
  if (!$('#page-seguimiento-lotes').hidden || !$('#page-programacion-semanal').hidden) {
    loadLotFollowup().catch(handleLotFollowupError);
  }
  if (state.user && !$('#page-clima-grafica').hidden) void loadClimateChart();
  if (state.user && !$('#page-variacion-vuelo').hidden) void loadFlightVariation();
});
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
