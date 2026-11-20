# MyM Campo

Aplicación web progresiva para capturar actividades de campo, trabajar temporalmente sin conexión y sincronizar registros con un espacio compartido.

## Arquitectura

La aplicación conserva su interfaz estática y el almacenamiento local IndexedDB, y usa **Supabase Auth + PostgreSQL** como servicio central. Encaja con esta PWA sin backend propio: proporciona inicio de sesión por correo o usuario, una base consultable y políticas RLS aplicadas en el servidor. La interfaz nunca recibe una clave `service_role`; las reglas de la base limitan qué cuentas pueden leer, agregar o revisar datos.

Las capturas nuevas se guardan primero en el dispositivo y se envían cuando vuelve la conexión. Cada perfil solo puede abrir sus formularios asignados, y PostgreSQL valida el mismo permiso al recibir capturas: Aplicaciones aéreas usa Clima, EPP y Vuelos; Terrestre usa Variación Aguilón y Calibraciones; Supervisor usa Malezas y Calidad; Administrador puede usar todos. Administradores y usuarios de Aplicaciones aéreas tienen acceso a todas las zonas; Terrestre y Supervisor necesitan zonas asignadas. Las zonas disponibles se derivan de las fincas y lotes registrados en `field_lots`, tanto en la administración como en la validación del servidor. Solo los administradores activos pueden consultar y revisar capturas ajenas; los demás consultan sus propias capturas dentro de sus zonas. Los supervisores conservan la información de visitas compartida para la programación semanal. Las solicitudes públicas quedan pendientes; las cuentas creadas por administradores reciben inmediatamente el perfil y las zonas elegidas. En Malezas, la finca se selecciona del catálogo autorizado y la zona se completa cuando la relación finca-zona es única; la ubicación GPS se solicita automáticamente y puede editarse o reintentarse. Cada detalle por lote admite varias imágenes y la labor se selecciona entre Plantilla y Soca. La fecha principal se copia a los detalles nuevos y su catorcena se actualiza al cambiarla, mientras no se modifique manualmente la fecha del lote. La catorcena se calcula para los calendarios de los periodos 30 y 31, del 20/10/2025 al 17/10/2027. El mapa de lotes muestreados colorea cada polígono según el % CONTROL del muestreo más reciente y muestra ese valor al seleccionar el lote.

El menú del espacio de trabajo agrupa las pantallas por actividad y conserva en este dispositivo, para cada cuenta, la última pantalla y los grupos abiertos o cerrados. En teléfonos, el botón **Menú** abre la barra sobre el contenido; se cierra al elegir una pantalla, tocar fuera o pulsar **Cerrar menú**. Si falla la carga de usuarios o zonas, **Reintentar** vuelve a consultarlas; no se permite guardar una asignación restringida mientras no se hayan cargado las zonas.

En **Usuarios**, un administrador activo puede eliminar otra cuenta previa confirmación. Se elimina el acceso de Supabase Auth y se conserva un perfil histórico suspendido para mantener capturas, revisiones y programación; su nombre de usuario y correo permanecen reservados. No se puede eliminar la propia cuenta ni el último administrador activo. Los datos no sincronizados de otros dispositivos no se trasladan al servidor al eliminar la cuenta.

En **Administración → Exportar Excel**, un administrador activo puede seleccionar módulos y filtrar capturas sincronizadas por fechas, finca, zona, labor y usuario. Las listas desplegables se llenan con valores de las capturas sincronizadas de todos los módulos; si falla la carga, se puede reintentar. El archivo `.xlsx` incluye una hoja por módulo, datos de revisión y detalles separados para cada lectura de clima o lote de Malezas. Los filtros se aplican por detalle cuando corresponde; los registros sin el dato filtrado no se incluyen. Las fechas y horas de creación y revisión se muestran en UTC; las fechas y horas de captura se conservan tal como fueron ingresadas. Las imágenes no se incluyen: se exportan sus nombres, tipos y tamaños. Las capturas pendientes de sincronización no forman parte del archivo. La función de Supabase exige un administrador activo en cada página de la consulta; requiere aplicar `20261120040000_admin_excel_export.sql`.

En **Registros → Variación por vuelo**, la gráfica suma las hectáreas por dron y permite filtrar por fechas y labor; al seleccionar un dron muestra sus vuelos y el detalle de cada captura. Un administrador puede filtrar por usuario; los demás solo consultan sus propios vuelos. Con conexión se consultan los registros sincronizados y se incluyen las capturas pendientes de este dispositivo; sin conexión se indican los datos disponibles localmente. Los datos sin hectáreas válidas no se suman y se informa su cantidad.

La privacidad entre cuentas se exige también mediante las políticas de Supabase: los supervisores no pueden consultar ni revisar capturas ajenas, pero conservan la información de visitas compartida para la programación semanal. El almacenamiento sin conexión del navegador no cifra los datos por cuenta: no compartas un dispositivo con personas que no deban poder inspeccionar su almacenamiento local.

En **Registros**, las capturas EPP incluyen **Generar PDF**. La opción abre la vista de impresión del navegador para imprimir o guardar el reporte como PDF; incluye los conteos de asistencia y cumplimiento por función, los datos de la captura y el estado de sincronización/revisión.

Las capturas de Malezas también incluyen **Generar PDF**. El reporte por captura muestra un mapa de los lotes con geometría disponible, coloreados por % CONTROL, además de control, cobertura y las imágenes de cada lote. El % COBERTURA se calcula automáticamente como `100 - % CONTROL` y queda vacío cuando no hay un control válido; los mapas requieren los límites protegidos de Supabase, salvo que ya se hayan cargado en la sesión.

**La sincronización requiere Supabase configurado.** Crea el proyecto, aplica las migraciones y proporciona su URL y clave pública. La aplicación se publica como archivos estáticos; el servidor local incluido solo sirve esos archivos.

## Configuración

1. Crea un proyecto Supabase en la organización que administrará los datos.
2. En **SQL Editor**, ejecuta en orden `supabase/migrations/20261106000000_multiuser_sync.sql`, `supabase/migrations/20261106010000_role_zone_access.sql`, `supabase/migrations/20261106020000_username_only_users.sql`, `supabase/migrations/20261106030000_dynamic_zones_from_field_lots.sql`, `supabase/migrations/20261106040000_field_lot_boundaries.sql`, `supabase/migrations/20261116000000_record_management.sql`, `supabase/migrations/20261116010000_lot_visit_followup.sql`, `supabase/migrations/20261119000000_weekly_visit_capture.sql` y `supabase/migrations/20261119010000_weekly_visit_batch_capture.sql`. La segunda migración crea el catálogo protegido de lotes y fincas; las zonas se derivan de los valores únicos de `field_lots.zone`. La tercera habilita perfiles sin correo, la cuarta actualiza instalaciones existentes, la quinta crea la tabla protegida de límites para el mapa, la sexta agrega operaciones seguras para editar y eliminar capturas, la séptima crea el plan vigente de visitas por lote, la octava vincula capturas a una visita y la novena las guarda en grupo como una sola operación atómica. `20261116020000_lot_weekly_visit_programs.sql` es una migración heredada de la agenda manual anterior y ya no es necesaria: la agenda actual se calcula desde los planes y las capturas de Malezas.
   Después, ejecuta en orden `20261120000000_service_role_field_lots.sql`, `20261120010000_deferred_username_account_validation.sql`, `20261120020000_flight_record_privacy.sql`, `20261120030000_climate_record_privacy.sql`, `20261120040000_admin_excel_export.sql`, `20261120050000_supervisor_capture_privacy.sql` y `20261120060000_preserve_deleted_user_history.sql`. Antes de la última también es necesario aplicar `20261116020000_lot_weekly_visit_programs.sql`, pues conserva las referencias históricas de esos programas. Las últimas migraciones protegen las capturas por cuenta, habilitan la exportación exclusiva para administradores, reservan la carga de planes al administrador y conservan el historial al eliminar una cuenta.
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
   supabase functions deploy delete-user
   ```

   Las tres funciones validan el token del solicitante y vuelven a comprobar en `profiles` que sea administrador activo antes de usar Auth Admin. El correo de invitación lo entrega el servicio de correo de Supabase: configura SMTP propio para uso operativo y revisa la plantilla de invitación. El enlace vuelve a MyM Campo, donde la persona establece su contraseña; no se envía ni se genera una contraseña temporal. La creación sin correo usa un alias interno solo para Auth, protegido por metadata de servidor; el perfil de MyM Campo conserva `email = null`.
8. Entra con la cuenta administradora y usa **Usuarios** para invitar por correo o crear una cuenta sin correo. Para cuentas sin correo, define una contraseña inicial y entrégala directamente a la persona; iniciará sesión con su usuario y esa contraseña. La función usa un alias interno no enrutable para Supabase Auth, pero el perfil de MyM Campo queda sin correo. En ambos flujos, Administrador y Aplicaciones aéreas reciben acceso a todas las zonas; Terrestre y Supervisor solo a las zonas asignadas. Las cuentas existentes con esos dos últimos perfiles empiezan sin zonas asignadas y no verán formularios de captura hasta recibir una zona. Después de cambiar permisos, pide a la persona que recargue la aplicación para actualizar su perfil y la lista local de lotes. Si una invitación falla después de crear la cuenta, revisa su perfil en la lista de Usuarios y asígnale perfil y zonas.
9. Cada formulario sigue limitado por perfil tanto en la interfaz como en la política de inserción de PostgreSQL. El catálogo de lotes ya no se descarga como un archivo público: se lee desde `field_lots`, protegida por RLS; la política RLS y la revisión de capturas también respetan las zonas asignadas. Para el trabajo sin conexión, la aplicación guarda localmente solo la lista autorizada de la cuenta actual.
10. Prueba con dos cuentas y dos dispositivos antes del uso operativo: confirma que un usuario no puede abrir ni enviar formularios de otro perfil, que los perfiles restringidos solo ven/capturan lotes de zonas asignadas, que las asignaciones se respetan al leer o revisar capturas del equipo, que el seguimiento cuenta solo capturas de Malezas desde la fecha del ciclo y que no muestra “Cumplido” antes de completar las visitas requeridas. Verifica que la agenda agrupe por finca las visitas cuyas fechas originales estén a cinco días o menos, asigne la fecha más antigua, incluya pendientes vencidas, excluya realizadas y conserve filtros y orden al consultar. Comprueba también la pantalla independiente de programación semanal y los permisos por zona, además de confirmar que un usuario no administrador no pueda invitar, crear cuentas o cambiar zonas llamando directamente a las funciones. Los registros locales antiguos que incluyan lotes ajenos o no presentes en el catálogo quedan en el dispositivo y no se sincronizan hasta corregir la asignación o el código.

Las políticas de seguridad se aplican en PostgreSQL aunque un cliente modifique la interfaz. Mantén activado RLS; no concedas privilegios `service_role` a usuarios ni los incrustes en el frontend. La función de revisión no permite que una persona revise sus propias capturas.

## Vuelos

Clima y Vuelos conservan un borrador de trabajo local por cuenta. Los cambios se guardan automáticamente; **Guardar contexto** permite guardarlo explícitamente y **Nuevo contexto** descarta el borrador actual. Al volver al módulo, se recuperan los campos y las lecturas parciales; estos borradores permanecen en el dispositivo y no se sincronizan como capturas hasta completar y guardar el formulario.

En Vuelos, cada envío crea un registro independiente con su propia hora asignada al presionar **Guardar vuelo**. La labor se define una sola vez en los datos de la actividad y se asigna a todos los vuelos de su contexto; al cambiarla, se actualizan los vuelos guardados del mismo contexto y se sincronizan los cambios pendientes. Después de guardar, se mantienen fecha, finca, lote, zona, responsable y labor para agregar vuelos a la misma jornada; cada vuelo conserva su dron, hectáreas, litros, observaciones y hora. El identificador de contexto relaciona los vuelos con la actividad.

El formulario muestra el **volumen de aplicación** definido para la labor, el **volumen real** (`litros aplicados / hectáreas aplicadas`) y la variación porcentual `((volumen real / volumen de aplicación) - 1) × 100`. Los tres valores se actualizan automáticamente al cambiar la labor, los litros o el área. La tabla de volúmenes está incluida en `app.js`, por lo que el cálculo funciona sin conexión y los resultados se guardan en la captura local. Si faltan datos o el área es cero, el volumen real y la variación se muestran como `—`.

| Labor | Litros/ha |
| --- | ---: |
| Madurante | 14 |
| Premadurante | 20 |
| Descecante | 20 |
| Bioestimulante | 14 |
| Agro K | 10 |
| Kelatex | 10 |
| Ensayo_20 | 20 |
| Ensayo_14 | 14 |
| Madurante_20 | 20 |
| Madurante_25 | 25 |
| Madurante_30 | 30 |

`Control de malezas` se conserva como opción por compatibilidad, pero no tiene volumen de aplicación configurado, por lo que su variación aparece como `—`. El campo **Dron** ofrece T40-1, T50-1 a T50-4 y T100-1 a T100-4; al editar una captura antigua se conserva su dron si no pertenece a esa lista.

Desde el formulario de Vuelos, **Resumen y PDF acumulado** abre una consulta local con filtros inclusivos por fecha, finca, zona y labor. La tabla siempre muestra T40-1, T50-1 a T50-4 y T100-1 a T100-4; también agrega cualquier otro dron guardado y vuelos sin dron identificado para que los totales incluyan todas las capturas coincidentes. El PDF de impresión aplica los mismos filtros y presenta los criterios seleccionados, vuelos, hectáreas y litros por dron. Capturas sin hectáreas o litros válidos se señalan y sus valores no se suman.

## Gráfica de clima

**Gráfica de clima** muestra cada lectura por fecha y hora, sin agrupar las mediciones de una misma captura. Permite elegir temperatura, humedad, viento, Delta T u otras variables numéricas registradas y filtrar por fechas, finca y zona. Los administradores pueden además filtrar por usuario. Selecciona un punto o una lectura en la lista para ver la ubicación y todos sus valores; la lista permite distinguir puntos superpuestos. Las lecturas sin fecha, hora o valor válido permanecen en la lista, pero no se dibujan; al filtrar por fecha se excluyen las capturas sin fecha válida y se informa su cantidad.

La migración `20261120030000_climate_record_privacy.sql` restringe en Supabase las capturas de clima a su propietario y a administradores activos, también en la función de revisión. La aplicación filtra los datos locales por cuenta y combina las capturas sincronizadas con las pendientes; sin conexión indica que solo muestra las disponibles en el dispositivo. IndexedDB no cifra los datos por cuenta: una persona con acceso al almacenamiento de un dispositivo compartido podría inspeccionar capturas guardadas anteriormente. No compartas dispositivos con información sensible sin protección adicional.

## Mapa de lotes muestreados

El botón **Mapa de muestreos** aparece para supervisores y administradores en **Registros**. Muestra los límites UTM 15N; los lotes sin muestreo aparecen en gris y los visitados se colorean por el % CONTROL del muestreo más reciente (menos de 25%, 25 a menos de 50%, 50 a menos de 75% y 75-100%). Al seleccionar un lote se consultan su último porcentaje, fecha, número de visitas y responsables; los muestreos sin porcentaje se identifican aparte. El mapa es vectorial, sin mapa base externo. Las geometrías no se publican en GitHub Pages: la aplicación las consulta desde `field_lot_boundaries`, cuyas políticas RLS aplican las zonas autorizadas.

## Gestión de capturas

El apartado **Administrar capturas** permite abrir una captura con su formulario original para corregirla o eliminarla permanentemente tras confirmar. Cada usuario gestiona sus propias capturas; un administrador puede gestionar todas y revisar las ajenas. Editar una captura sincronizada requiere conexión y la devuelve a revisión pendiente. Las capturas que siguen en cola pueden editarse sin conexión; si se eliminan sin conexión, la eliminación se completa en Supabase al reconectar. Los adjuntos existentes se conservan cuando no se selecciona un archivo nuevo.

## Seguimiento de lotes

El apartado **Seguimiento de lotes** está disponible para administradores y supervisores, limitado por las zonas autorizadas en Supabase. Solo los administradores pueden crear, editar o importar los planes; los supervisores los consultan sin modificarlos. Guarda un plan vigente por lote con fecha de siembra/corte, finca, estado, responsable y fechas `VISITA 1`, `VISITA 2`, etc. Se puede ingresar manualmente o importar la primera hoja de un archivo `.xlsx` con los encabezados de `RESUMEN-2.xlsx`; las fechas seriales de Excel se convierten a fechas ISO. Al importar un lote existente, se pide confirmación y se reemplaza su plan vigente.

El seguimiento cuenta cada captura guardada de Malezas que incluya el lote y cuya fecha sea igual o posterior a la fecha del ciclo. Una captura que contenga varias líneas del mismo lote cuenta una sola vez. Las visitas pendientes y atrasadas se comparan con las fechas programadas; **Cumplido** solo aparece cuando el total registrado alcanza la cantidad programada (y existe por lo menos una visita requerida). Un nuevo ciclo reemplaza el plan actual; no se conserva historial de ciclos.

**Visitas semanales** está en su propia pantalla de la navegación principal y móvil, separada de **Seguimiento de lotes**. Se genera automáticamente a partir de Visita 1, Visita 2 y Visita 3; agrupa por finca las visitas pendientes cuyas fechas originales están dentro de un intervalo máximo de cinco días y asigna la fecha original más antigua del grupo (si cae domingo, el lunes siguiente), sin modificar las fechas del plan. Muestra las visitas vencidas hasta que se registren como realizadas y conserva los filtros de semana, finca, día programado y responsable; no permite programar domingos. Los grupos muestran finca, lote, fecha original, responsable y fecha asignada. Para mantener la programación compartida, los supervisores autorizados siguen recibiendo el identificador de captura, lote, fecha y número de las visitas realizadas por otros usuarios en sus zonas, pero no pueden consultar el contenido de esas capturas.

Cada grupo de finca y fecha asignada permite abrir **Capturar visitas del día** con todos sus lotes pendientes. El formulario muestra para cada uno el número de visita y su fecha original, y permite completar sus datos de Malezas e imágenes antes de guardar. La operación es atómica: las capturas vinculadas al ciclo y número se guardan juntas o ninguna se registra. Requiere conexión y las migraciones `20261119000000_weekly_visit_capture.sql` y `20261119010000_weekly_visit_batch_capture.sql`. La base impide duplicados incluso con solicitudes concurrentes y comprueba el plan y los permisos por zona. El borrador grupal, incluidas las imágenes, se conserva en IndexedDB local al cerrar o reabrir el formulario. Las capturas históricas sin número siguen asignándose cronológicamente a los espacios disponibles. Al editar una captura vinculada se debe conservar el lote y una fecha dentro del ciclo; al eliminarla vuelve a quedar pendiente. Las capturas existentes no se sobrescriben.

Después de aplicar la quinta migración, importa el ZIP del maestro desde un equipo administrativo. El importador lee solo los componentes del shapefile que necesita, valida que la proyección sea EPSG:32615 y por defecto hace una lectura de prueba sin enviar datos. Respeta la codificación declarada en `.cpg`; si ese archivo falta, intenta UTF-8 y luego Windows-1252, solo decodifica los campos necesarios y normaliza zonas numéricas para que coincidan con los permisos. Para importar, define `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` solo en la terminal local; esta última puede ser la clave heredada `service_role` o una clave secreta nueva `sb_secret_`. El importador envía las claves `sb_secret_` solo en `apikey`, y agrega `Authorization: Bearer` únicamente para claves heredadas, que son JWT. Ejecuta:

```powershell
$env:SUPABASE_URL = 'https://<proyecto>.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<clave service_role>'
python scripts\import_lot_boundaries.py 'C:\ruta\al\MAESTRO DE LOTES.zip' --upload
Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
```

La clave `service_role` no debe guardarse en archivos, `config.js` ni en GitHub. El importador envía polígonos en lotes; sin `--upload`, solo valida el archivo y muestra cuántos lotes importaría.

## Conservación e importación de datos locales

Las capturas y cuentas existentes en IndexedDB no se borran ni se suben automáticamente. Antes de actualizar un dispositivo con datos importantes, exporta **Registros → Exportar JSON** y conserva el archivo en un lugar protegido; puede incluir observaciones, coordenadas e imágenes. Las contraseñas locales se guardaban como hashes y no se pueden convertir en credenciales de Supabase: cada persona deberá solicitar una nueva cuenta con el mismo usuario para relacionar sus capturas.

Una vez configurado el proyecto, inicia sesión con una cuenta cuyo usuario coincida con el de las capturas antiguas y usa **Pendientes → Importar registros locales de esta cuenta**. La importación solo envía registros cuyo `ownerUsername` coincide con el usuario autenticado; no cambia ni elimina el original local. Los identificadores existentes hacen que los reintentos sean idempotentes. Las nuevas capturas se sincronizan automáticamente; si falla la red o Supabase, permanecen en la cola local y el error se informa.

Las imágenes de Malezas admiten selección múltiple por lote y todavía viajan dentro del JSON del registro, como datos codificados. Para cargas grandes conviene definir y configurar un bucket privado de Supabase Storage y una política de retención antes de ampliar ese flujo.

## Validación local

- `node --check app.js`
- `node --check server.mjs`
- `node --test`
- `python -m unittest discover -s tests -p test_*.py`
- Con un proyecto configurado y las ocho migraciones aplicadas, completar las pruebas manuales de acceso por perfil y zona descritas arriba. Sin URL/clave válidas, catálogos y políticas aplicados, la autenticación, captura y lista de lotes remotas no están disponibles.
