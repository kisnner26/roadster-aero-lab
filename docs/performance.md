# rendimiento y verificación

## cambios de arquitectura

- el recorrido hace un único render por avance. las 68 líneas aerodinámicas comparten geometría indexada y una llamada de dibujo.
- el mundo de conducción se importa al pulsar conducir. el minimapa comparte un trazado ligero y no construye terreno, coches estáticos ni carga texturas para mostrarse en el estudio.
- las cajas estáticas se instancian por material y política de sombras. los coches aparcados fusionan sus piezas por material antes de instanciarse; el modelo móvil conserva sus componentes independientes.
- los alambres y chorros inactivos no se dibujan. los chorros transparentes no proyectan sombras sólidas. el estudio reutiliza sombras cuando solo cambia la cámara; la conducción las recalcula al mover el vehículo.
- el índice del circuito es un árbol kd compacto en arrays tipados. conserva la misma muestra y desempate que el recorrido lineal anterior; las consultas consecutivas idénticas reutilizan su resultado.
- cámaras, nodos del monitor, formato de hora y trazado del minimapa se reutilizan. las texturas del tablero se actualizan solo si cambian los valores representados.

## resolución

| perfil | densidad máxima | presupuesto de píxeles |
| --- | ---: | ---: |
| automático | 1.75× | 2.5 millones |
| calidad | 2× | 4 millones |
| rendimiento | 1× | 1.1 millones |

la densidad nunca supera la del dispositivo. automático reduce gradualmente la escala ante intervalos de fotograma sostenidos superiores a 25 ms y la recupera más despacio cuando bajan de 18 ms. los saltos de más de 200 ms no se consideran presión sostenida. es una heurística de cadencia, no un temporizador gpu: el navegador, la frecuencia de pantalla y el modo de energía pueden influir en ella. calidad y rendimiento mantienen un presupuesto fijo.

## mediciones locales

revisión del 18 de octubre de 2026; son muestras reproducibles de esta implementación, no garantías de fps en otros equipos.

| recurso o escena | antes | después |
| --- | ---: | ---: |
| tres texturas del circuito, misma resolución 1k | 2,853,156 bytes | 821,914 bytes |
| cuatro tipografías, todos los caracteres | 400,160 bytes | 164,984 bytes |
| llamadas de dibujo, zona `n`, cámara `3`, detenido al inicio, 1280 × 720 | 1,084 | 581 |

los formatos anteriores se conservan en el historial. las licencias no cambian. la fusión estática puede enviar más triángulos de una tanda aunque reduzca las llamadas de dibujo; no se presenta como una reducción de polígonos.

## repetir las comprobaciones

```sh
npm run check
npm test
npm run build
npm run benchmark:track
```

el benchmark usa 12,000 consultas deterministas cercanas al trazado, verifica primero todos los resultados y publica la mediana de cinco pasadas. una ejecución local dio 9.95 ms para el recorrido lineal y 4.44 ms para el índice, aproximadamente 2.24×; conviene repetirlo en el equipo objetivo. no se impone un umbral temporal en ci.

el canvas `#viewport` publica `data-draw-calls`, `data-triangles`, `data-render-mode`, `data-render-ratio` y `data-frame-ms`, actualizados como máximo una vez por segundo. `frame-ms` es el intervalo medio entre callbacks, no tiempo de trabajo gpu. estos datos no añaden controles flotantes.

la revisión manual debe incluir: estudio pausado y en reproducción; flujo y malla técnica; entrada y salida de conducción; primera/tercera persona; aceleración y salto; clics y teclado dentro del monitor; cambio de perfil; reproducción real de youtube; escala del asfalto y ausencia de errores de consola.

## límites pendientes

three.js sigue siendo la mayor parte del javascript inicial. vite avisa del tamaño del bloque principal; no se oculta el aviso ni se atribuye la división del mundo a una reducción de toda la biblioteca. no se promete una puntuación lighthouse ni una tasa de cuadros universal. el modelo y la física continúan siendo una reconstrucción visual y una simulación de juego, no ingeniería certificada del fabricante.
