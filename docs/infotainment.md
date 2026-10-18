# pantalla interactiva

`src/infotainment.js` contiene la interfaz y el ciclo de vida de las aplicaciones. es una sección html operativa, no un diálogo flotante. `cockpit-screen.js` la incorpora como un css3dobject hijo de la superficie del monitor; css3drenderer y webgl comparten cámara y transformaciones. youtube y los archivos locales se reproducen dentro de ese elemento real, no se capturan como imágenes.

la interacción se habilita al tocar el monitor o pulsar `e`. la cámara se acerca al panel físico, con un campo de visión adaptado al aspecto de ventana; escape devuelve la vista. la capa dom se oculta en tercera persona o si la cámara no mira la cara frontal del monitor, para evitar que atraviese visualmente la carrocería. no se intenta una composición de profundidad arbitraria entre html y webgl.

## conexión con la escena

- `getTelemetry` devuelve una copia del estado de conducción. el mapa y los indicadores no inventan datos de batería, autonomía o temperatura física.
- `onOpen` pausa la conducción y libera las teclas; `onClose` devuelve la cámara y el foco, mantiene la conducción pausada y no apaga el contenido del monitor.
- `onVisualChange` redibuja la escena al cambiar el brillo, el volumen o la luz.
- `onDoors` modifica los paneles del modelo; la conducción no continúa con puertas abiertas.
- `car-preview.js` renderiza una miniatura de la geometría original en un render target, sin otro contexto webgl ni imágenes generadas.

para añadir una aplicación, agrega un botón `data-os-app`, su sección `os-panel-<id>` y su etiqueta en `drawTexture`. `switchApp` conserva el contenido de cada panel y pausa los medios que dejan de estar visibles. mantén las nuevas integraciones desconectadas hasta una acción del usuario.

## navegación web

github pages es alojamiento estático: no hay proxy, backend, credenciales ni proceso chrome. las búsquedas se envían a google en otra pestaña. las direcciones públicas https pueden abrirse en una vista interna con sandbox, sin navegación de la ventana superior. no se admiten protocolos ejecutables, credenciales en urls o direcciones de red local.

el encabezado [x-frame-options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options) y las políticas csp de un sitio pueden impedir su incrustación. el navegador no permite que la página anfitriona inspeccione el contenido de un iframe de otro origen para confirmar si fue bloqueado; por eso hay una salida externa permanente y no se muestra un estado de «cargado» ficticio.

## multimedia

youtube usa la [iframe player api](https://developers.google.com/youtube/iframe_api_reference), dominio youtube-nocookie, identificación de origen, controles nativos y errores explícitos. los vídeos dependen de las restricciones del autor, región y navegador; no se descargan ni se eluden restricciones. el api se carga solo tras solicitar un vídeo. cambiar de aplicación pausa el vídeo; alejar la cámara conserva el contenido en el monitor. salir de la página destruye el reproductor.

los archivos locales usan `url.createobjecturl` y un elemento de vídeo nativo, también válido para audio. se revoca la url al quitar o sustituir el archivo y al salir de la página. el volumen del pie controla el coche y los archivos locales; youtube conserva su propio control nativo.

## comprobaciones

`npm test` cubre enlaces, direcciones inseguras, preferencias y dinámica. la verificación visual del monitor incluye carga y reproducción real de youtube sobre la superficie 3d, cambio de cámara y ausencia de hud flotante. el diseño anterior tenía una ventana ampliada y controles táctiles; las capturas antiguas se conservan como historial y no describen el modo de juego actual.
