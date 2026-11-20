export class DeleteUserError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function deleteUserAccount(adminClient, callerId, targetId) {
  if (typeof targetId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
    throw new DeleteUserError(400, 'Selecciona un usuario válido.');
  }
  const { data: caller, error: callerError } = await adminClient.from('profiles')
    .select('role,status,auth_user_id').eq('id', callerId).maybeSingle();
  if (callerError) {
    console.error('No se pudo verificar el perfil administrador.', callerError);
    throw new DeleteUserError(500, 'No se pudo verificar el permiso de administración.');
  }
  if (!caller || caller.role !== 'admin' || caller.status !== 'active' || caller.auth_user_id !== callerId) {
    throw new DeleteUserError(403, 'Solo una cuenta administradora activa puede eliminar usuarios.');
  }
  if (targetId.toLowerCase() === callerId.toLowerCase()) {
    throw new DeleteUserError(400, 'No puedes eliminar tu propia cuenta.');
  }
  const { data: target, error: targetError } = await adminClient.from('profiles')
    .select('auth_user_id').eq('id', targetId).maybeSingle();
  if (targetError) {
    console.error('No se pudo verificar la cuenta que se desea eliminar.', targetError);
    throw new DeleteUserError(500, 'No se pudo verificar la cuenta seleccionada.');
  }
  if (!target || target.auth_user_id !== targetId) {
    throw new DeleteUserError(404, 'La cuenta ya no existe o ya fue eliminada.');
  }
  const { error } = await adminClient.auth.admin.deleteUser(targetId);
  if (error) {
    console.error('No se pudo eliminar la cuenta.', error);
    throw new DeleteUserError(500, 'No se pudo eliminar la cuenta. Comprueba que quede otro administrador activo e inténtalo de nuevo.');
  }
}
