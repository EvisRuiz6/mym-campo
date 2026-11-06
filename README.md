# MyM Campo

Aplicación web progresiva para capturar actividades de campo, trabajar temporalmente sin conexión y sincronizar registros con un espacio compartido.

## Arquitectura

La aplicación conserva su interfaz estática y el almacenamiento local IndexedDB, y usa **Supabase Auth + PostgreSQL** como servicio central. Encaja con esta PWA sin backend propio: proporciona inicio de sesión por correo, una base consultable y políticas RLS aplicadas en el servidor. La interfaz nunca recibe una clave `service_role`; las reglas de la base limitan qué cuentas pueden leer, agregar o revisar datos.

Las capturas nuevas se guardan primero en el dispositivo y se envían cuando vuelve la conexión. Los supervisores y administradores pueden consultar capturas del equipo y aprobarlas o rechazarlas; cada usuario solo puede insertar y consultar sus propios registros. Las cuentas nuevas quedan pendientes hasta que un administrador asigne un perfil.

**La sincronización no queda activa con este cambio por sí solo.** Es necesario crear y configurar el proyecto Supabase, aplicar la migración y proporcionar su URL y clave pública. No se creó ningún servicio ni se desplegó la aplicación.

## Configuración

1. Crea un proyecto Supabase en la organización que administrará los datos.
2. En **SQL Editor**, ejecuta `supabase/migrations/20261106000000_multiuser_sync.sql`.
3. En **Authentication → URL Configuration**, configura la URL HTTPS donde publicarás MyM Campo y las URL de redirección permitidas. Configura SMTP/verificación de correo para la política de acceso de tu organización.
4. Copia la **Project URL** y la **publishable/anon key** del proyecto en `config.js` (`supabaseUrl` y `supabaseAnonKey`). Esa clave es pública y se entrega al navegador; **nunca** pongas en `config.js` la clave `service_role`, una contraseña ni otra credencial privada. No publiques los datos hasta confirmar que la migración y RLS están aplicados.
5. Publica los archivos estáticos detrás de HTTPS. Para desarrollo local, ejecuta `node server.mjs` desde la carpeta del proyecto y abre `http://localhost:8000`. Puedes usar `PORT` para cambiar el puerto. El servidor incluido solo sirve archivos estáticos y escucha en `127.0.0.1`; no es un servidor de sincronización.
6. Crea la primera cuenta desde **Solicitar acceso** y verifica el correo si está habilitada la confirmación. En el SQL Editor del proyecto, activa de forma explícita esa cuenta como administradora, sustituyendo el correo:

   ```sql
   update public.profiles
   set role = 'admin', status = 'active'
   where email = lower('administrador@ejemplo.com');
   ```

   Comprueba que se modificó exactamente una fila. Cierra sesión y vuelve a entrar o pulsa **Comprobar acceso**.
7. Configura y despliega la función de invitación desde una instalación de Supabase CLI enlazada al proyecto. Establece `INVITE_REDIRECT_URL` como un secreto con la URL HTTPS raíz de la aplicación (por ejemplo, `https://mi-dominio.example/`) y agrega esa URL en **Authentication → URL Configuration → Redirect URLs**. Los secretos `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los proporciona el entorno de Supabase Edge Functions; la clave `service_role` solo se usa en el servidor y nunca se copia a este repositorio ni a `config.js`.

   ```sh
   supabase secrets set INVITE_REDIRECT_URL=https://mi-dominio.example/
   supabase functions deploy invite-user
   ```

   La función valida el token del solicitante y vuelve a comprobar en `profiles` que sea administrador activo antes de usar Auth Admin. El correo de invitación lo entrega el servicio de correo de Supabase: configura SMTP propio para uso operativo y revisa la plantilla de invitación. El enlace vuelve a MyM Campo, donde la persona establece su contraseña; no se envía ni se genera una contraseña temporal. La función usa el perfil creado por el trigger de la migración existente, por lo que **no requiere una migración SQL adicional**. La lista/gestión de perfiles permanece protegida por las políticas/RPC existentes.
8. Entra con la cuenta administradora y usa **Usuarios → Invitar usuario**. Completa nombre, usuario, correo y perfil. Las cuentas invitadas quedan activas con el perfil seleccionado, pero solo pueden establecer la contraseña a través del enlace de invitación. Si una invitación falla después de crear la cuenta, revisa su perfil en la lista de Usuarios y asígnale el perfil manualmente.
9. Prueba con dos cuentas y dos dispositivos antes del uso operativo: confirma que una captura nueva se sincroniza, que el usuario normal no ve capturas ajenas, que solo Supervisor/Administrador puede revisar una captura de otra persona y que un usuario no administrador no puede invitar llamando directamente a la función.

Las políticas de seguridad se aplican en PostgreSQL aunque un cliente modifique la interfaz. Mantén activado RLS; no concedas privilegios `service_role` a usuarios ni los incrustes en el frontend. La función de revisión no permite que una persona revise sus propias capturas.

## Conservación e importación de datos locales

Las capturas y cuentas existentes en IndexedDB no se borran ni se suben automáticamente. Antes de actualizar un dispositivo con datos importantes, exporta **Registros → Exportar JSON** y conserva el archivo en un lugar protegido; puede incluir observaciones, coordenadas e imágenes. Las contraseñas locales se guardaban como hashes y no se pueden convertir en credenciales de Supabase: cada persona deberá solicitar una nueva cuenta con el mismo usuario para relacionar sus capturas.

Una vez configurado el proyecto, inicia sesión con una cuenta cuyo usuario coincida con el de las capturas antiguas y usa **Pendientes → Importar registros locales de esta cuenta**. La importación solo envía registros cuyo `ownerUsername` coincide con el usuario autenticado; no cambia ni elimina el original local. Los identificadores existentes hacen que los reintentos sean idempotentes. Las nuevas capturas se sincronizan automáticamente; si falla la red o Supabase, permanecen en la cola local y el error se informa.

Los archivos de imagen todavía viajan dentro del JSON del registro, como datos codificados. Para cargas grandes conviene definir y configurar un bucket privado de Supabase Storage y una política de retención antes de ampliar ese flujo.

## Validación local

- `node --check app.js`
- `node --check server.mjs`
- `node --test tests/invitation.test.mjs`
- Con un proyecto configurado, completar la prueba manual de dos cuentas descrita arriba. Sin URL/clave válidas y el esquema aplicado, la autenticación y sincronización remotas no están disponibles.
