# conducción: fuentes y alcance

verificación de la [ficha oficial del roadster](https://www.tesla.com/roadster), 18 de octubre de 2026, en navegador. el extractor de texto externo no exponía la página completa; la ficha renderizada sí permitió comprobar sus contenidos.

## qué confirma tesla

la ficha describe aerodinámica activa, succión mediante ventiladores y sellado inferior, dirección electrónica, un monitor central y dos pantallas frontales. distingue performance de dos plazas, thrust de dos plazas con propulsores traseros y rocket monoplaza con empuje distribuido, elevación y rotación. indica menos de un segundo de 0 a 60 mph para thrust; rocket no se anuncia para circulación en vías públicas.

también describe pintura blanca de inspiración aeroespacial, cristales de tono dorado, elementos de titanio y otros materiales ligeros. esas referencias guían la geometría y los materiales, sin convertirlos en piezas cad oficiales.

la ficha consultada no aporta curvas de par/potencia, dimensiones completas, parámetros de suspensión, consumo de gas, fuerza de cada tobera ni una velocidad máxima numérica verificable. las cifras adicionales de los pantallazos se tratan como referencias del usuario, no como ensayos certificados.

## decisiones de juego

- modelo de bicicleta con integración fija de 1/120 s; frenado prioritario sobre acelerador, regeneración y resistencia creciente con velocidad.
- el lanzamiento sin gas ronda 1.56 s de 0 a 60 mph en la prueba ideal. los modos con gas apuntan a 0.83 s y 0.575 s. son resultados del código y objetivos ajustados a las referencias, no mediciones de un vehículo real. 60 mph no equivale a 100 km/h.
- límite de juego de 112 m/s: 403.2 km/h. no se presenta como velocidad máxima homologada del roadster actual.
- cuatro segundos equivalentes de aire a caudal nominal; consumo combinado, agotamiento y recarga acelerada solo al detenerse. no es un cálculo de presión, volumen ni temperatura de un copv real.
- contacto vertical, gravedad, impulso de rampa, elevación, control de actitud y aterrizaje. las maniobras no usan una dinámica de cuerpo rígido completa.
- succión y ala modifican el agarre; la asistencia lateral consume aire en rocket. no hay cfd ni reproducción del controlador propietario.
- loop de exhibición con trayectoria circular restringida. la succión permite contacto invertido lento; sin ella, se libera el contacto si falta velocidad. esto no constituye una validación del sistema real ni de su carga aerodinámica.
- vehículos estacionados y camión con colisión simplificada dependiente de altura; sin deformación, daños ni ocupantes.

## zonas y controles

`n`: rampa y cinco coches; `v`: salto sobre camión; `g`: loop; `b`: circuito. `t` reinicia la zona actual. las zonas se alcanzan mediante reposicionamiento de juego, no navegación real.

`wasd`, `1` / `3`, `shift`, espacio, `i/k`, `j/l`, `x`, `q` y `f` controlan conducción, cámaras, propulsión, actitud, freno de mano, succión y configuración. `h` muestra la ayuda dentro del monitor del coche. no hay paneles superpuestos durante el manejo.

las pruebas verifican límites, frenado, aire finito, aceleración objetivo, despegue, aterrizaje, salto completo sobre cinco coches y contacto invertido. pasar las pruebas confirma el comportamiento del juego, no la exactitud de un automóvil de producción.
