# pantalla interactiva

`src/infotainment.js` contiene la interfaz y el ciclo de vida de las aplicaciones. es un diálogo html nativo, no una captura interactiva ni un iframe fingiendo ser chrome. la pantalla del modelo usa una textura sincronizada; tocar su superficie abre la interfaz ampliada mediante raycasting.

## conexión con la escena

- `getTelemetry` devuelve una copia del estado de conducción. el mapa y los indicadores no inventan datos de batería, autonomía o temperatura física.
- `onOpen` pausa la conducción y libera las teclas; `onClose` devuelve el foco y mantiene la conducción pausada.
- `onVisualChange` redibuja la escena al cambiar el brillo, el volumen o la luz.
- `onDoors` modifica los paneles del modelo; la conducción no continúa con puertas abiertas.
- `car-preview.js` renderiza una miniatura de la geometría original en un render target, sin otro contexto webgl ni imágenes generadas.

para añadir una aplicación, agrega un botón `data-os-app`, su sección `os-panel-<id>` y su etiqueta en `drawTexture`. `switchApp` conserva el contenido de cada panel y pausa los medios que dejan de estar visibles. mantén las nuevas integraciones desconectadas hasta una acción del usuario.

## navegación web

github pages es alojamiento estático: no hay proxy, backend, credenciales ni proceso chrome. las búsquedas se envían a google en otra pestaña. las direcciones públicas https pueden abrirse en una vista interna con sandbox, sin navegación de la ventana superior. no se admiten protocolos ejecutables, credenciales en urls o direcciones de red local.

el encabezado [x-frame-options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options) y las políticas csp de un sitio pueden impedir su incrustación. el navegador no permite que la página anfitriona inspeccione el contenido de un iframe de otro origen para confirmar si fue bloqueado; por eso hay una salida externa permanente y no se muestra un estado de «cargado» ficticio.

## multimedia

youtube usa la [iframe player api](https://developers.google.com/youtube/iframe_api_reference), dominio youtube-nocookie, identificación de origen, controles nativos y errores explícitos. los vídeos dependen de las restricciones del autor, región y navegador; no se descargan ni se eluden restricciones. el api se carga solo tras solicitar un vídeo y el reproductor se destruye al cerrar la pantalla.

los archivos locales usan `url.createobjecturl` y un elemento de vídeo nativo, también válido para audio. se revoca la url al quitar o sustituir el archivo y al salir de la página. el volumen del pie controla el coche y los archivos locales; youtube conserva su propio control nativo.

## comprobaciones

`npm test` cubre enlaces de youtube, instantes, búsquedas, direcciones inseguras, preferencias corruptas y dinámica de conducción. las pruebas visuales se realizaron en escritorio y a 390 × 844: toque de la pantalla 3d, diálogo, teclado, pausa, vídeo incrustado, aviso de vídeo restringido, página compatible y reproducción de un wav de prueba sin subida.
