# MyM Campo

Aplicación web progresiva para capturar actividades de campo, trabajar temporalmente sin conexión y sincronizar registros con un espacio compartido.

## Arquitectura

La aplicación conserva su interfaz estática y el almacenamiento local IndexedDB, y usa **Supabase Auth + PostgreSQL** como servicio central. Encaja con esta PWA sin backend propio: proporciona inicio de sesión por correo o usuario, una base consultable y políticas RLS aplicadas en el servidor. La interfaz nunca recibe una clave `service_role`; las reglas de la base limitan qué cuentas pueden leer, agregar o revisar datos.

Las capturas nuevas se guardan primero en el dispositivo y se envían cuando vuelve la conexión. Cada perfil solo puede abrir sus formularios asignados, y PostgreSQL valida el mismo permiso al recibir capturas: Aplicaciones aéreas usa Clima, EPP y Vuelos; Terrestre usa Variación Aguilón y Calibraciones; Supervisor usa Malezas y Calidad; Administrador puede usar todos. Administradores y usuarios de Aplicaciones aéreas tienen acceso a todas las zonas; Terrestre y Supervisor necesitan zonas asignadas. Las zonas disponibles se derivan de las fincas y lotes registrados en `field_lots`, tanto en la administración como en la validación del servidor. Supervisores y administradores pueden revisar capturas del equipo dentro de su alcance; cada usuario también puede consultar sus propios registros dentro de las zonas permitidas. Las solicitudes públicas quedan pendientes; las cuentas creadas por administradores reciben inmediatamente el perfil y las zonas elegidas.

**La sincronización no queda activa con este cambio por sí solo.** Es necesario crear y configurar el proyecto Supabase, aplicar la migración y proporcionar su URL y clave pública. No se creó ningún servicio ni se desplegó la aplicación.

## Configuración

1. Crea un proyecto Supabase en la organización que administrará los datos.
2. En **SQL Editor**, ejecuta en orden `supabase/migrations/20261106000000_multiuser_sync.sql`, `supabase/migrations/20261106010000_role_zone_access.sql`, `supabase/migrations/20261106020000_username_only_users.sql` y `supabase/migrations/20261106030000_dynamic_zones_from_field_lots.sql`. La segunda migración crea el catálogo protegido de lotes y fincas; las zonas se derivan de los valores únicos de `field_lots.zone`. La tercera habilita perfiles sin correo y la cuarta actualiza instalaciones existentes a este esquema.
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
7. Configura y despliega las funciones de invitación y creación de usuarios desde una instalación de Supabase CLI enlazada al proyecto. Establece `INVITE_REDIRECT_URL` como un secreto con la URL HTTPS raíz de la aplicación (por ejemplo, `https://mi-dominio.example/`) y agrega esa URL en **Authentication → URL Configuration → Redirect URLs**. Los secretos `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los proporciona el entorno de Supabase Edge Functions; la clave `service_role` solo se usa en el servidor y nunca se copia a este repositorio ni a `config.js`.

   ```sh
   supabase secrets set INVITE_REDIRECT_URL=https://mi-dominio.example/
   supabase functions deploy invite-user
   supabase functions deploy create-user
   ```

   Ambas funciones validan el token del solicitante y vuelven a comprobar en `profiles` que sea administrador activo antes de usar Auth Admin. El correo de invitación lo entrega el servicio de correo de Supabase: configura SMTP propio para uso operativo y revisa la plantilla de invitación. El enlace vuelve a MyM Campo, donde la persona establece su contraseña; no se envía ni se genera una contraseña temporal. La creación sin correo usa un alias interno solo para Auth, protegido por metadata de servidor; el perfil de MyM Campo conserva `email = null`.
8. Entra con la cuenta administradora y usa **Usuarios** para invitar por correo o crear una cuenta sin correo. Para cuentas sin correo, define una contraseña inicial y entrégala directamente a la persona; iniciará sesión con su usuario y esa contraseña. La función usa un alias interno no enrutable para Supabase Auth, pero el perfil de MyM Campo queda sin correo. En ambos flujos, Administrador y Aplicaciones aéreas reciben acceso a todas las zonas; Terrestre y Supervisor solo a las zonas asignadas. Las cuentas existentes con esos dos últimos perfiles empiezan sin zonas asignadas y no verán formularios de captura hasta recibir una zona. Después de cambiar permisos, pide a la persona que recargue la aplicación para actualizar su perfil y la lista local de lotes. Si una invitación falla después de crear la cuenta, revisa su perfil en la lista de Usuarios y asígnale perfil y zonas.
9. Cada formulario sigue limitado por perfil tanto en la interfaz como en la política de inserción de PostgreSQL. El catálogo de lotes ya no se descarga como un archivo público: se lee desde `field_lots`, protegida por RLS; la política RLS y la revisión de capturas también respetan las zonas asignadas. Para el trabajo sin conexión, la aplicación guarda localmente solo la lista autorizada de la cuenta actual.
10. Prueba con dos cuentas y dos dispositivos antes del uso operativo: confirma que un usuario no puede abrir ni enviar formularios de otro perfil, que los perfiles restringidos solo ven/capturan lotes de zonas asignadas, que las asignaciones se respetan al leer o revisar capturas del equipo y que un usuario no administrador no puede invitar, crear cuentas o cambiar zonas llamando directamente a las funciones. Los registros locales antiguos que incluyan lotes ajenos o no presentes en el catálogo quedan en el dispositivo y no se sincronizan hasta corregir la asignación o el código.

Las políticas de seguridad se aplican en PostgreSQL aunque un cliente modifique la interfaz. Mantén activado RLS; no concedas privilegios `service_role` a usuarios ni los incrustes en el frontend. La función de revisión no permite que una persona revise sus propias capturas.

## Conservación e importación de datos locales

Las capturas y cuentas existentes en IndexedDB no se borran ni se suben automáticamente. Antes de actualizar un dispositivo con datos importantes, exporta **Registros → Exportar JSON** y conserva el archivo en un lugar protegido; puede incluir observaciones, coordenadas e imágenes. Las contraseñas locales se guardaban como hashes y no se pueden convertir en credenciales de Supabase: cada persona deberá solicitar una nueva cuenta con el mismo usuario para relacionar sus capturas.

Una vez configurado el proyecto, inicia sesión con una cuenta cuyo usuario coincida con el de las capturas antiguas y usa **Pendientes → Importar registros locales de esta cuenta**. La importación solo envía registros cuyo `ownerUsername` coincide con el usuario autenticado; no cambia ni elimina el original local. Los identificadores existentes hacen que los reintentos sean idempotentes. Las nuevas capturas se sincronizan automáticamente; si falla la red o Supabase, permanecen en la cola local y el error se informa.

Los archivos de imagen todavía viajan dentro del JSON del registro, como datos codificados. Para cargas grandes conviene definir y configurar un bucket privado de Supabase Storage y una política de retención antes de ampliar ese flujo.

## Validación local

- `node --check app.js`
- `node --check server.mjs`
- `node --test tests/invitation.test.mjs`
- Con un proyecto configurado y las cuatro migraciones aplicadas, completar las pruebas manuales de acceso por perfil y zona descritas arriba. Sin URL/clave válidas, catálogos y políticas aplicados, la autenticación, captura y lista de lotes remotas no están disponibles.
