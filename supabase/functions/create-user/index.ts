import { createClient } from 'npm:@supabase/supabase-js@2';
import { fetchLotZones, noEmailAuthAddress, validateUserCreation, zonesForRole } from '../_shared/invitation.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { message: 'Método no permitido.' });

  const accessToken = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return respond(401, { message: 'Inicia sesión con una cuenta administradora.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Faltan secretos requeridos para crear usuarios.');
    return respond(500, { message: 'El servicio de creación de usuarios no está configurado.' });
  }

  let userInput: ReturnType<typeof validateUserCreation>;
  try {
    userInput = validateUserCreation(await request.json());
  } catch (error) {
    return respond(400, { message: error instanceof Error ? error.message : 'La solicitud no es válida.' });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(accessToken);
  if (callerError || !callerData.user) return respond(401, { message: 'La sesión no es válida o expiró.' });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role,status')
    .eq('id', callerData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('No se pudo verificar el perfil administrador.', profileError);
    return respond(500, { message: 'No se pudo verificar el permiso de administración.' });
  }
  if (callerProfile?.role !== 'admin' || callerProfile.status !== 'active') {
    return respond(403, { message: 'Solo una cuenta administradora activa puede crear usuarios.' });
  }

  let allZones: string[];
  try {
    allZones = await fetchLotZones(adminClient);
  } catch (error) {
    console.error('No se pudieron comprobar las zonas permitidas.', error);
    return respond(500, { message: 'No se pudieron verificar las zonas configuradas.' });
  }

  let allowedZones: string[];
  try {
    allowedZones = zonesForRole(userInput.role, userInput.allowed_zones, allZones);
  } catch (error) {
    return respond(400, { message: error instanceof Error ? error.message : 'La selección de zonas no es válida.' });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: noEmailAuthAddress(userInput.username),
    password: userInput.password,
    email_confirm: true,
    app_metadata: { mym_no_email_account: true },
    user_metadata: { display_name: userInput.display_name, username: userInput.username }
  });
  if (createError || !created.user) {
    console.error('No se pudo crear la cuenta sin correo.', createError);
    return respond(400, { message: 'No se pudo crear la cuenta. Verifica que el usuario no esté registrado.' });
  }

  const { data: profile, error: updateError } = await adminClient
    .from('profiles')
    .update({ email: null, role: userInput.role, status: 'active', allowed_zones: allowedZones })
    .eq('id', created.user.id)
    .select('id')
    .maybeSingle();

  if (updateError || !profile) {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(created.user.id);
    console.error('No se pudo completar el perfil de la cuenta sin correo.', { updateError, deleteError });
    return respond(502, {
      message: deleteError
        ? 'No se pudo completar el perfil ni limpiar la cuenta incompleta. Contacta al administrador del sistema.'
        : 'No se pudo completar el perfil. La cuenta incompleta fue eliminada; inténtalo de nuevo.'
    });
  }

  return respond(201, { username: userInput.username });
});
