import { createClient } from 'npm:@supabase/supabase-js@2';
import { deleteUserAccount, DeleteUserError } from '../_shared/delete-user.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { message: 'Método no permitido.' });
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respond(401, { message: 'Inicia sesión con una cuenta administradora.' });
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    console.error('Faltan secretos requeridos para eliminar usuarios.');
    return respond(500, { message: 'El servicio de eliminación de usuarios no está configurado.' });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return respond(400, { message: 'La solicitud no es válida.' }); }
  const targetId = body && typeof body === 'object' && 'user_id' in body ? body.user_id : null;
  const options = { auth: { autoRefreshToken: false, persistSession: false } };
  const callerClient = createClient(url, anonKey, options);
  const { data, error } = await callerClient.auth.getUser(token);
  if (error || !data.user) return respond(401, { message: 'La sesión no es válida o expiró.' });
  const adminClient = createClient(url, serviceKey, options);
  try {
    await deleteUserAccount(adminClient, data.user.id, targetId);
    return respond(200, { message: 'Cuenta eliminada; se conservó su historial.' });
  } catch (error) {
    if (error instanceof DeleteUserError) return respond(error.status, { message: error.message });
    console.error('Falló la eliminación de la cuenta.', error);
    return respond(500, { message: 'No se pudo eliminar la cuenta.' });
  }
});
