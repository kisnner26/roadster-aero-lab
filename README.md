# roadster aero lab

estudio tridimensional de forma, flujo y vuelo. una secuencia continua de 56 segundos sobre el tesla roadster de primera generación y falcon heavy.

[ver sitio](https://kisnner26.github.io/roadster-aero-lab/)

![estudio tridimensional del roadster](public/assets/roadster-studio.jpg)

## incluye

- modelo paramétrico con carrocería, habitáculo, llantas, frenos y luces
- cuatro capítulos: superficie, estructura, flujo y vuelo
- iluminación de estudio, sombras, malla técnica y cotas proyectadas en 3d
- líneas de corriente y partículas animadas mediante shaders
- tierra procedural, estrellas y falcon heavy en la escena orbital
- cámaras continuas, exploración táctil, navegación y línea de tiempo
- sonido ambiental opcional, movimiento reducido y pausa al ocultar la pestaña
- tipografías locales; ningún recurso remoto necesario durante la reproducción

![campo de flujo cualitativo](public/assets/roadster-flow.jpg)

## controles

arrastra para orbitar. selecciona un capítulo o arrastra la línea de tiempo para buscar un instante. espacio pausa o reproduce; las flechas y la rueda cambian de capítulo. el sonido comienza únicamente al activarlo.

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

- [tesla roadster](https://www.tesla.com/es_es/roadster)
- [manual del propietario roadster 2.5](https://service.tesla.com/docs/Public/Roadster/Owner/Roadster_2.5_Owners_Manual.pdf)
- [manual de servicio roadster](https://service.tesla.com/docs/Public/Roadster/ServiceManual/en-us/GUID-4E037ADB-D0F4-48A0-9261-1083193D4C1B.html)
- [falcon heavy](https://www.spacex.com/vehicles/falcon-heavy/)
- [falcon user's guide](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf)

three.js, gsap y vite. la geometría, las cámaras y los shaders se evalúan desde un tiempo absoluto, permitiendo saltar entre instantes sin acumular simulación.

proyecto independiente no afiliado a tesla ni spacex. las medidas citadas son referencias públicas; la carrocería es interpretativa y no un cad de fabricación. el flujo es cualitativo, no cfd. la escena orbital es una reconstrucción artística y sus objetos no comparten una escala física. el manual 2.5 documenta la referencia dimensional; no implica que el automóvil de la misión fuera esa variante.

las fuentes barlow condensed, ibm plex mono y manrope se distribuyen con sus licencias sil open font license en `public/fonts`.
