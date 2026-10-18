# pantalla interactiva

`src/infotainment.js` contiene la interfaz y el ciclo de vida de las aplicaciones. es una sección html operativa, no un diálogo flotante. `cockpit-screen.js` proyecta las cuatro esquinas de la superficie del monitor con la cámara de three.js. `screen-projection.js` calcula una homografía en píxeles que sitúa el html exactamente sobre ese cuadrilátero. youtube y los archivos locales se reproducen dentro de ese elemento real, no se capturan como imágenes.

la proyección directa evita una cámara css3d anidada: durante la revisión visual se detectaron controles visibles y accesibles por teclado que no recibían clics nativos. las pruebas verifican las cuatro esquinas, incluyendo perspectiva y planos degenerados; la comprobación en navegador incluye clics en botones y dentro del iframe. `resizeobserver` conserva las dimensiones sin medir el layout en cada fotograma.

la interacción se habilita al tocar el monitor o pulsar `e`. la cámara se acerca al panel físico, con un campo de visión adaptado al aspecto de ventana; escape devuelve la vista. la capa dom se oculta en tercera persona o si la cámara no mira la cara frontal del monitor, para evitar que atraviese visualmente la carrocería. no se intenta una composición de profundidad arbitraria entre html y webgl.

## conexión con la escena

- `getTelemetry` devuelve una copia del estado de conducción. el mapa y los indicadores no inventan datos de batería, autonomía o temperatura física.
- `onOpen` pausa la conducción y libera las teclas; `onClose` devuelve la cámara y el foco, mantiene la conducción pausada y no apaga el contenido del monitor.
- `onVisualChange` redibuja la escena al cambiar el brillo, el volumen o la luz.
- `onDoors` modifica los paneles del modelo; la conducción no continúa con puertas abiertas.
- `car-preview.js` renderiza una miniatura de la geometría original en un render target, sin otro contexto webgl ni imágenes generadas.
- mientras se enfoca el monitor, el canvas queda `inert`; al salir recupera la interacción y el foco. los atajos respetan campos editables, diálogos y modificadores del navegador.
- los nodos del panel y el trazado del minimapa se reutilizan. los datos dom se actualizan solo cuando el monitor es visible; las texturas del tablero no se suben de nuevo si sus valores no cambiaron.

para añadir una aplicación, agrega un botón `data-os-app`, su sección `os-panel-<id>` y su etiqueta en `drawTexture`. `switchApp` conserva el contenido de cada panel y pausa los medios que dejan de estar visibles. mantén las nuevas integraciones desconectadas hasta una acción del usuario.

## navegación web

github pages es alojamiento estático: no hay proxy, backend, credenciales ni proceso chrome. las búsquedas se envían a google en otra pestaña. las direcciones públicas https pueden abrirse en una vista interna con sandbox, sin navegación de la ventana superior. no se admiten protocolos ejecutables, credenciales en urls o direcciones de red local.

el encabezado [x-frame-options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options) y las políticas csp de un sitio pueden impedir su incrustación. el navegador no permite que la página anfitriona inspeccione el contenido de un iframe de otro origen para confirmar si fue bloqueado; por eso hay una salida externa permanente y no se muestra un estado de «cargado» ficticio.

## perfiles gráficos

`h` abre los controles y la pestaña vehículo. automático, calidad y rendimiento se eligen dentro del monitor, sin hud adicional; la preferencia se guarda en `roadster-render-mode`. la escala mostrada corresponde a la densidad efectiva del canvas, no a una cifra de fps. los presupuestos y la adaptación se describen en [rendimiento](performance.md).

## multimedia

youtube usa la [iframe player api](https://developers.google.com/youtube/iframe_api_reference), dominio youtube-nocookie, identificación de origen, controles nativos y errores explícitos. los vídeos dependen de las restricciones del autor, región y navegador; no se descargan ni se eluden restricciones. el api se carga solo tras solicitar un vídeo. cambiar de aplicación pausa el vídeo; alejar la cámara conserva el contenido en el monitor. salir de la página destruye el reproductor.

los archivos locales usan `url.createobjecturl` y un elemento de vídeo nativo, también válido para audio. se revoca la url al quitar o sustituir el archivo y al salir de la página. el volumen del pie controla el coche y los archivos locales; youtube conserva su propio control nativo.

el brillo del panel atenúa la interfaz con una capa negra sin eventos de puntero, no con un filtro css sobre el árbol del reproductor. youtube, los archivos locales y las páginas incrustadas quedan por encima de esa capa y conservan su luminosidad original. esto evita someter vídeo acelerado a un grupo filtrado dentro del plano css3d. no se alteran los fotogramas ni se puede inspeccionar el vídeo de youtube desde otro origen.

## comprobaciones

`npm test` cubre enlaces, direcciones inseguras, preferencias y dinámica. la verificación visual del monitor incluye carga y reproducción real de youtube sobre la superficie 3d, cambio de cámara y ausencia de hud flotante. el diseño anterior tenía una ventana ampliada y controles táctiles; las capturas antiguas se conservan como historial y no describen el modo de juego actual.
