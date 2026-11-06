import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateInvitation } from '../_shared/invitation.mjs';

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

  const authorization = request.headers.get('Authorization') || '';
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return respond(401, { message: 'Inicia sesión con una cuenta administradora.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const redirectTo = Deno.env.get('INVITE_REDIRECT_URL');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !redirectTo) {
    console.error('Faltan secretos requeridos para invitar usuarios.');
    return respond(500, { message: 'El servicio de invitaciones no está configurado.' });
  }

  let invitation: ReturnType<typeof validateInvitation>;
  try {
    invitation = validateInvitation(await request.json());
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
    return respond(403, { message: 'Solo una cuenta administradora activa puede invitar usuarios.' });
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    invitation.email,
    {
      data: { display_name: invitation.display_name, username: invitation.username },
      redirectTo
    }
  );
  if (inviteError || !inviteData.user) {
    return respond(400, { message: inviteError?.message || 'No se pudo crear la invitación.' });
  }

  const { data: profile, error: updateError } = await adminClient
    .from('profiles')
    .update({ role: invitation.role, status: 'active' })
    .eq('id', inviteData.user.id)
    .select('id')
    .maybeSingle();

  if (updateError || !profile) {
    console.error('La invitación se envió, pero no se pudo activar el perfil.', updateError);
    return respond(502, {
      message: 'La invitación se envió, pero el perfil no pudo activarse. Revisa la cuenta en Usuarios y asigna su perfil.'
    });
  }

  return respond(201, { email: invitation.email });
});
