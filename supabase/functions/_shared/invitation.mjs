export const INVITABLE_ROLES = Object.freeze(['aereo', 'terrestre', 'supervisor', 'admin']);
export const NO_EMAIL_AUTH_DOMAIN = 'users.mym-campo.invalid';

export function noEmailAuthAddress(username) {
  return `${username}@${NO_EMAIL_AUTH_DOMAIN}`;
}

export async function fetchLotZones(client) {
  const lots = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from('field_lots')
      .select('zone')
      .order('lot_code')
      .range(offset, offset + 999);
    if (error) throw error;
    lots.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return zonesFromLots(lots);
}

export function validateUserCreation(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('El cuerpo de la solicitud no es válido.');
  }
  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    throw new Error('Las cuentas creadas desde este formulario no pueden incluir correo.');
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const role = typeof body.role === 'string' ? body.role : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const allowedZones = body.allowed_zones == null ? [] : body.allowed_zones;

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('El usuario debe tener de 3 a 32 letras, números, puntos, guiones o guiones bajos.');
  }
  if (displayName.length < 1 || displayName.length > 120) {
    throw new Error('El nombre debe tener entre 1 y 120 caracteres.');
  }
  if (!INVITABLE_ROLES.includes(role)) {
    throw new Error('El perfil seleccionado no es válido.');
  }
  if (password.length < 8 || password.length > 72) {
    throw new Error('La contraseña inicial debe tener entre 8 y 72 caracteres.');
  }
  if (!Array.isArray(allowedZones) || allowedZones.length > 32 ||
      allowedZones.some(zone => typeof zone !== 'string' || !/^[A-Za-z0-9._ -]{1,32}$/.test(zone.trim()))) {
    throw new Error('La selección de zonas no es válida.');
  }

  return {
    username,
    display_name: displayName,
    role,
    password,
    allowed_zones: [...new Set(allowedZones.map(zone => zone.trim()))]
  };
}

export function validateInvitation(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('El cuerpo de la solicitud no es válido.');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const role = typeof body.role === 'string' ? body.role : '';
  const allowedZones = body.allowed_zones == null ? [] : body.allowed_zones;

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Ingresa un correo válido.');
  }
  if (email.endsWith('@' + NO_EMAIL_AUTH_DOMAIN)) {
    throw new Error('Ese dominio está reservado para cuentas sin correo.');
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('El usuario debe tener de 3 a 32 letras, números, puntos, guiones o guiones bajos.');
  }
  if (displayName.length < 1 || displayName.length > 120) {
    throw new Error('El nombre debe tener entre 1 y 120 caracteres.');
  }
  if (!INVITABLE_ROLES.includes(role)) {
    throw new Error('El perfil seleccionado no es válido.');
  }
  if (!Array.isArray(allowedZones) || allowedZones.length > 32 ||
      allowedZones.some(zone => typeof zone !== 'string' || !/^[A-Za-z0-9._ -]{1,32}$/.test(zone.trim()))) {
    throw new Error('La selección de zonas no es válida.');
  }

  return { email, username, display_name: displayName, role, allowed_zones: [...new Set(allowedZones.map(zone => zone.trim()))] };
}

export function zonesForRole(role, requestedZones, configuredZones) {
  const allZones = [...new Set(configuredZones)];
  if (requestedZones.some(zone => !allZones.includes(zone))) {
    throw new Error('La selección contiene una zona que no está configurada.');
  }
  return ['admin', 'aereo'].includes(role)
    ? allZones
    : [...new Set(requestedZones)];
}

export function zonesFromLots(lots) {
  return [...new Set(lots.map(lot => lot.zone).filter(zone => typeof zone === 'string' && zone.length > 0))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}
