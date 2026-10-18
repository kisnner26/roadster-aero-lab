# roadster aero lab

reconstrucción tridimensional de un concepto roadster a partir de las imágenes y el vídeo de referencia proporcionados. una secuencia continua de 70 segundos con carrocería en cuña, puertas elevables, habitáculo y aerodinámica visual.

[ver sitio](https://kisnner26.github.io/roadster-aero-lab/)

![estudio tridimensional del roadster](public/assets/roadster-studio.jpg)

## incluye

- carrocería blanca facetada, cabina cerrada y luces de ancho completo
- puertas animadas, cinco radios por rueda, alerón y cuatro boquillas traseras
- cinco capítulos: superficie, estructura, flujo, habitáculo y vuelo conceptual
- iluminación de estudio, sombras, malla técnica y proporciones proyectadas en 3d
- líneas de corriente y partículas animadas mediante shaders
- yoke, pantalla central, asientos claros y revestimiento interior
- tierra procedural, estrellas y una escena especulativa de propulsión
- cámaras continuas, exploración táctil, navegación y línea de tiempo
- sonido ambiental opcional, movimiento reducido y pausa al ocultar la pestaña
- tipografías locales; ningún recurso remoto necesario durante la reproducción

![campo de flujo cualitativo](public/assets/roadster-flow.jpg)

## controles

arrastra para orbitar. selecciona un capítulo o arrastra la línea de tiempo para buscar un instante. el botón `puertas` abre o cierra ambos paneles. espacio pausa o reproduce; las flechas y la rueda cambian de capítulo. el sonido comienza únicamente al activarlo.

![habitáculo reconstruido](public/assets/roadster-cabin.jpg)

## desarrollo

```bash
npm install
npm run dev
```

validación:

```bash
npm run check
npm run build
```

## fuentes

- cuatro imágenes de referencia aportadas por el usuario: frontal con puertas abiertas, tres cuartos trasero, trasera e interior
- [vídeo de referencia proporcionado](https://www.youtube.com/shorts/oCvC70oIS5w)
- [tesla roadster oficial](https://www.tesla.com/roadster)

three.js, gsap y vite. la geometría, las cámaras y los shaders se evalúan desde un tiempo absoluto, permitiendo saltar entre instantes sin acumular simulación.

proyecto independiente no afiliado a tesla ni spacex. no se ha confirmado que el diseño de las referencias sea oficial. la geometría es una interpretación visual, no un cad de fabricación.

las proporciones se normalizan a la longitud de la carrocería (`l`): longitud `1.000 l`, batalla `0.600 l`, ancho `0.440 l` y altura con puertas cerradas `0.262 l`. son estimaciones del modelo, no dimensiones físicas certificadas. no se reutilizan las cotas del roadster de primera generación para esta carrocería. el flujo es cualitativo, no cfd; la propulsión y la escena espacial son especulativas, no una recreación de la misión de 2018.

las fuentes barlow condensed, ibm plex mono y manrope se distribuyen con sus licencias sil open font license en `public/fonts`.
