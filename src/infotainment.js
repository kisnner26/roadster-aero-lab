import {webTarget,youtubeVideo,readCabinSettings} from './infotainment-utils.js'
import './infotainment.css'

const icons={map:'M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14',web:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',video:'M5 5h14v14H5zM10 8l6 4-6 4z',media:'M9 18V5l11-2v13M9 7l11-2M9 17c0 4-6 4-6 1s6-4 6-1M20 15c0 4-6 4-6 1s6-4 6-1',car:'M4 14l2-6h12l2 6v5h-3v-2H7v2H4zM4 13h16M7 15h2M15 15h2',close:'M6 6l12 12M18 6L6 18',expand:'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',back:'M15 5l-7 7 7 7',sound:'M4 9h4l5-4v14l-5-4H4zM17 8q5 4 0 8',arrow:'M5 12h14M13 6l6 6-6 6',climate:'M12 3v18M4 7l16 10M4 17L20 7M9 5l3 3 3-3M9 19l3-3 3 3',light:'M9 17h6M10 21h4M9 14a6 6 0 1 1 6 0v3H9z',play:'M8 5l12 7-12 7z'}
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]}"/></svg>`
let apiPromise
function loadYouTube() {
  if(window.YT?.Player)return Promise.resolve(window.YT)
  if(apiPromise)return apiPromise
  apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true
    const timeout=setTimeout(()=>{script.remove();apiPromise=null;reject(Error('youtube no responde'))},12000)
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve(window.YT)}
    script.onerror=()=>{clearTimeout(timeout);script.remove();apiPromise=null;reject(Error('youtube unavailable'))}
    document.head.append(script)
  })
  return apiPromise
}

export function createInfotainment({car,audio,cabinLight,carPreview,onOpen,onClose,getTelemetry,onReset,onDoors,onVisualChange=()=>{}}) {
  let storage
  try{storage=localStorage}catch{storage={getItem:()=>null}}
  const settings=readCabinSettings(storage)
  const dialog=document.createElement('section');dialog.id='infotainment';dialog.setAttribute('aria-labelledby','os-title');dialog.setAttribute('aria-label','pantalla del habitáculo')
  let focused=false
  dialog.innerHTML=`
    <div class="os-shell">
      <header class="os-topbar"><div class="os-brand"><span class="os-mark">r/</span><h2 id="os-title">roadster <span>os</span></h2><span class="os-build">experimental / 01</span></div><div class="os-system"><span class="os-park">p · estacionado</span><time id="os-clock"></time><button id="os-expand" aria-label="alternar pantalla completa">${icon('expand')}</button><button id="os-close" autofocus aria-label="cerrar pantalla y volver al coche">${icon('close')}</button></div></header>
      <div class="os-body">
        <aside class="os-vehicle" aria-label="estado del coche"><div class="os-vehicle-top"><span class="os-eyebrow">vehicle / live link</span><span class="os-live">conectado</span></div><div class="os-speed"><strong id="os-speed">0</strong><span>km/h</span></div><div class="os-car-image"><img src="${import.meta.env.BASE_URL}assets/roadster-studio.jpg" alt="roadster reconstruido en el estudio"><span>reference concept / 026</span></div><div class="os-trip"><div><span>recorrido</span><strong id="os-distance">0.00 <small>km</small></strong></div><div><span>superficie</span><strong id="os-surface">asfalto</strong></div></div><div class="os-link-note">telemetría de la simulación.<br>no conectado a un vehículo real.</div><button id="os-door-control" class="os-outline">${icon('car')}<span>abrir puertas</span></button></aside>
        <div class="os-workspace">
          <nav class="os-apps" aria-label="aplicaciones de la pantalla">${[['map','ruta'],['web','navegador'],['video','youtube'],['media','biblioteca'],['car','vehículo']].map(([id,label],index)=>`<button data-os-app="${id}" aria-pressed="${index===0}" aria-controls="os-panel-${id}">${icon(id)}<span>${label}</span></button>`).join('')}</nav>
          <div class="os-content">
            <section id="os-panel-map" class="os-panel" aria-labelledby="os-map-title"><div class="os-panel-heading"><div><span class="os-eyebrow">navigation / local circuit</span><h3 id="os-map-title">el camino, despejado.</h3></div><span class="os-chip">circuito privado</span></div><div class="os-map"><svg viewBox="0 0 600 330" aria-label="posición del vehículo en el circuito"><defs><pattern id="os-map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="currentColor" stroke-width=".5"/></pattern></defs><rect width="600" height="330" fill="url(#os-map-grid)"/><g transform="translate(80 0) scale(2.8)"><path id="os-map-route-border"/><path id="os-map-route"/><circle id="os-map-location" r="3.5"/></g></svg><div class="os-map-north">n ↑</div><div class="os-map-tag">test valley <span>/ circuito cerrado</span></div><div class="os-map-stats"><span id="os-lap">vuelta 01</span><span id="os-heading">rumbo 000°</span></div></div><div class="os-route-footer"><div><span class="os-eyebrow">dónde quieres ir</span><p>explora fuera del circuito.</p></div><form id="os-maps-form"><label class="sr-only" for="os-destination">destino en google maps</label><input id="os-destination" placeholder="buscar un destino" maxlength="180" required><button aria-label="buscar destino en google maps, abre otra pestaña">${icon('arrow')}</button></form></div><p class="os-note">el mapa del circuito es local. los destinos se abren en google maps en otra pestaña.</p></section>
            <section id="os-panel-web" class="os-panel" aria-labelledby="os-web-title" hidden><div class="os-panel-heading"><div><span class="os-eyebrow">browser / connected workspace</span><h3 id="os-web-title">una ventana al resto.</h3></div>${icon('web')}</div><form id="os-web-form" class="os-search"><label for="os-address">buscar en google o escribir una dirección</label><div class="os-input-row"><input id="os-address" placeholder="qué quieres explorar" maxlength="2048" aria-describedby="os-web-help os-web-error" required><button class="os-primary">abrir ${icon('arrow')}</button></div></form><p class="os-error" id="os-web-error" role="alert"></p><div class="os-web-shortcuts"><a href="https://www.google.com/" target="_blank" rel="noopener noreferrer"><span class="os-shortcut-monogram">g</span>google<span>buscar en la web ↗</span></a><a href="https://www.tesla.com/roadster" target="_blank" rel="noopener noreferrer"><span class="os-shortcut-monogram">t</span>tesla<span>roadster oficial ↗</span></a><a href="https://www.spacex.com/" target="_blank" rel="noopener noreferrer"><span class="os-shortcut-monogram">x</span>spacex<span>exploración espacial ↗</span></a></div><div class="os-browser-preview" hidden><div class="os-browser-bar"><span id="os-browser-domain"></span><a id="os-browser-external" target="_blank" rel="noopener noreferrer">abrir fuera ↗</a><button id="os-browser-stop" aria-label="cerrar página incrustada">${icon('close')}</button></div><div id="os-browser-frame"></div></div><div class="os-web-embed"><button id="os-embed" class="os-outline">ver dirección dentro de la pantalla</button><p class="os-note" id="os-web-help">google y algunas webs no permiten incrustarse. las búsquedas y «abrir» usan otra pestaña; la vista interna solo funciona si el sitio permite iframes. no es chrome embebido.</p></div></section>
            <section id="os-panel-video" class="os-panel" aria-labelledby="os-video-title" hidden><div class="os-panel-heading"><div><span class="os-eyebrow">theater / youtube</span><h3 id="os-video-title">primera fila. siempre.</h3></div><span class="os-chip">modo estacionado</span></div><form id="os-video-form" class="os-input-row"><label class="sr-only" for="os-video-url">enlace del vídeo de youtube</label><input id="os-video-url" placeholder="pega un enlace de youtube" aria-describedby="os-video-error" required><button class="os-primary">cargar ${icon('play')}</button></form><p class="os-error" id="os-video-error" role="alert"></p><div class="os-theater"><div id="os-youtube-host"></div><div id="os-video-empty" class="os-media-empty">${icon('video')}<strong>tu próxima perspectiva.</strong><span>vídeos, shorts y enlaces compartidos.</span><button id="os-reference" class="os-outline">cargar el vídeo de referencia</button></div></div><div class="os-media-meta"><span id="os-video-status" role="status">youtube se conecta solo al cargar un vídeo.</span><a id="os-youtube-external" href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">abrir en youtube ↗</a></div><p class="os-note">reproductor oficial. ciertos vídeos restringen la reproducción externa; si ocurre, ábrelos en youtube.</p></section>
            <section id="os-panel-media" class="os-panel" aria-labelledby="os-media-title" hidden><div class="os-panel-heading"><div><span class="os-eyebrow">library / on your device</span><h3 id="os-media-title">tu propia banda sonora.</h3></div>${icon('media')}</div><div class="os-local-stage"><div id="os-local-empty" class="os-media-empty">${icon('media')}<strong>sin cuentas. sin subir nada.</strong><span>reproduce audio o vídeo desde tu dispositivo.</span></div><video id="os-local-player" controls playsinline preload="metadata" hidden></video></div><label class="os-file-label" for="os-media-file">elegir audio o vídeo<input id="os-media-file" type="file" accept="audio/*,video/*"></label><div class="os-media-meta"><span id="os-local-name" role="status">ningún archivo seleccionado</span><button id="os-local-clear" hidden>quitar archivo</button></div><p class="os-error" id="os-local-error" role="alert"></p><p class="os-note">el archivo permanece en tu navegador. los formatos disponibles dependen de tu dispositivo.</p></section>
            <section id="os-panel-car" class="os-panel" aria-labelledby="os-car-title" hidden><div class="os-panel-heading"><div><span class="os-eyebrow">vehicle / dynamics</span><h3 id="os-car-title">cada respuesta, visible.</h3></div><span class="os-chip">datos de simulación</span></div><div class="os-dynamics"><div><span>aceleración longitudinal</span><strong id="os-acceleration">0.00 <small>m/s²</small></strong></div><div><span>aceleración lateral</span><strong id="os-lateral">0.00 <small>g</small></strong></div><div><span>dirección</span><strong id="os-steer">0.0 <small>°</small></strong></div><div><span>deslizamiento estimado</span><strong id="os-slip">0 <small>%</small></strong></div></div><div class="os-scope"><span class="os-eyebrow">velocidad / últimos 30 s</span><svg viewBox="0 0 600 100" role="img" aria-label="historial de velocidad de la simulación"><path d="M0 25H600M0 50H600M0 75H600" class="os-scope-grid"/><path id="os-speed-history"/></svg></div><div class="os-vehicle-controls"><div><span>iluminación del habitáculo</span><label><input type="range" id="os-light" min="0" max="100" value="50" aria-label="intensidad de la luz del habitáculo"><output for="os-light" id="os-light-value">50%</output></label></div><button id="os-reset-car" class="os-outline">volver al inicio del circuito</button></div><p class="os-note">dinámica aproximada, no validada por el fabricante. la iluminación modifica la escena 3d; la climatización es una interfaz conceptual.</p></section>
          </div>
        </div>
      </div>
      <footer class="os-dock"><div class="os-dock-climate">${icon('climate')}<button id="os-temp-down" aria-label="bajar temperatura">−</button><output id="os-temp" aria-live="polite">21°</output><button id="os-temp-up" aria-label="subir temperatura">+</button><span>clima conceptual</span></div><div class="os-dock-range">${icon('light')}<label class="sr-only" for="os-brightness">brillo de pantalla</label><input id="os-brightness" type="range" min="35" max="100" value="90"><output id="os-brightness-value" for="os-brightness">90%</output></div><div class="os-dock-range"><button id="os-audio" aria-label="activar sonido del coche" aria-pressed="false">${icon('sound')}</button><label class="sr-only" for="os-volume">volumen del coche y archivos locales</label><input id="os-volume" type="range" min="0" max="100" value="65"><output id="os-volume-value" for="os-volume">65%</output></div><span class="os-dock-label">roadster / independent concept</span></footer>
    </div>`
  document.body.append(dialog)
  const $=selector=>dialog.querySelector(selector)
  $('.os-car-image img').replaceWith(carPreview.canvas)
  let app='map',player=null,playerGeneration=0,objectUrl=null,returnFocus=null,history=[],lastSample=0,doorOpen=false,lastTexture=0
  const localPlayer=$('#os-local-player')
  const sample=()=>getTelemetry()||{speed:0,distance:0,steer:0,acceleration:0,lateral:0,slip:0,gear:1,x:0,z:0,heading:0,active:false}
  function saveSettings() {try{storage.setItem('roadster-cabin-v1',JSON.stringify(settings))}catch{ /* preferences are optional. */ }}
  function applySettings() {
    dialog.style.setProperty('--os-brightness',String(settings.brightness/100))
    audio.setVolume(settings.volume/100);localPlayer.volume=settings.volume/100;cabinLight.intensity=settings.light/100*1.7
    for(const name of ['brightness','volume','light']){$('#os-'+name).value=settings[name];$('#os-'+name+'-value').textContent=settings[name]+'%'}
    $('#os-temp').textContent=settings.temperature+'°';saveSettings();drawTexture();onVisualChange()
  }
  function switchApp(next) {
    if(next!=='video')player?.pauseVideo?.()
    if(next!=='media')localPlayer.pause()
    app=next
    dialog.querySelectorAll('[data-os-app]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.osApp===app)))
    dialog.querySelectorAll('.os-panel').forEach(panel=>panel.hidden=panel.id!=='os-panel-'+app)
    if(app!=='web')stopBrowser()
    drawTexture()
  }
  function stopBrowser() {$('#os-browser-frame').replaceChildren();$('.os-browser-preview').hidden=true}
  function open() {
    if(focused)return
    returnFocus=document.activeElement;focused=true;onOpen();carPreview.draw();update();$('#os-close').focus()
  }
  function close() {
    if(!focused)return
    focused=false;onClose();drawTexture();onVisualChange()
    if(returnFocus?.isConnected)returnFocus.focus()
  }
  function destroyYouTube() {playerGeneration++;player?.destroy?.();player=null;$('#os-youtube-host').replaceChildren();$('#os-video-empty').hidden=false;$('#os-video-form').removeAttribute('aria-busy');$('#os-video-status').textContent='youtube se conecta solo al cargar un vídeo.'}
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}event.stopPropagation()})
  $('#os-close').addEventListener('click',close)
  $('#os-expand').hidden=true
  $('#os-close').setAttribute('aria-label','volver a la vista de conducción')
  $('#os-map-title').textContent='navegación'
  $('#os-web-title').textContent='navegador'
  $('#os-video-title').textContent='youtube'
  $('#os-media-title').textContent='biblioteca'
  $('#os-car-title').textContent='dinámica y controles'
  const controls=document.createElement('div');controls.className='os-game-controls'
  controls.innerHTML='<p>wasd / flechas · conducir &nbsp; 1 / 3 / c · cámara &nbsp; shift · empuje</p><p>espacio · elevación &nbsp; i / k · cabeceo &nbsp; j / l · giro aéreo &nbsp; x · freno de mano</p><p>f · performance / thrust / rocket &nbsp; q · succión &nbsp; n · cinco coches &nbsp; v · camión &nbsp; g · loop &nbsp; b · circuito</p><p>e · pantalla &nbsp; p · pausa &nbsp; r · reversa &nbsp; t · reiniciar &nbsp; m · audio &nbsp; esc · salir</p><p id="os-game-status" role="status"></p>'
  $('#os-panel-car').prepend(controls)
  const airStatus=document.createElement('span');airStatus.id='os-air-status';airStatus.className='os-eyebrow';$('.os-vehicle').append(airStatus)
  dialog.querySelectorAll('[data-os-app]').forEach(button=>button.addEventListener('click',()=>switchApp(button.dataset.osApp)))
  function openExternal(url) {window.open(url,'_blank','noopener,noreferrer')}
  $('#os-maps-form').addEventListener('submit',event=>{event.preventDefault();openExternal(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent($('#os-destination').value.trim())}`)})
  $('#os-web-form').addEventListener('submit',event=>{
    event.preventDefault();$('#os-web-error').textContent=''
    try{const target=webTarget($('#os-address').value);openExternal(target.url)}catch(error){$('#os-web-error').textContent=error.message;$('#os-address').setAttribute('aria-invalid','true')}
  })
  $('#os-address').addEventListener('input',()=>{$('#os-address').removeAttribute('aria-invalid');$('#os-web-error').textContent=''})
  $('#os-embed').addEventListener('click',()=>{
    $('#os-web-error').textContent=''
    try {
      const target=webTarget($('#os-address').value)
      if(target.kind==='search'||new URL(target.url).origin===location.origin||/(^|\.)(google\.[a-z.]+|tesla\.com|spacex\.com)$/.test(new URL(target.url).hostname))throw Error('este destino se abre con «abrir» en otra pestaña; no se puede mostrar como un navegador interno.')
      const frame=document.createElement('iframe');frame.title='página web externa: '+target.label;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');frame.src=target.url
      $('#os-browser-domain').textContent=target.label;$('#os-browser-external').href=target.url;$('#os-browser-frame').replaceChildren(frame);$('.os-browser-preview').hidden=false
    }catch(error){$('#os-web-error').textContent=error.message;$('#os-address').setAttribute('aria-invalid','true')}
  })
  $('#os-browser-stop').addEventListener('click',stopBrowser)
  async function loadVideo() {
    let video
    $('#os-video-error').textContent='';$('#os-video-url').removeAttribute('aria-invalid')
    try{video=youtubeVideo($('#os-video-url').value)}catch(error){$('#os-video-error').textContent=error.message;$('#os-video-url').setAttribute('aria-invalid','true');return}
    destroyYouTube();localPlayer.pause()
    const generation=playerGeneration
    $('#os-video-status').textContent='conectando con youtube…';$('#os-video-form').setAttribute('aria-busy','true')
    $('#os-youtube-external').href=`https://www.youtube.com/watch?v=${video.id}&t=${video.start}`
    try {
      const YT=await loadYouTube()
      if(generation!==playerGeneration)return
      const host=document.createElement('div');$('#os-youtube-host').append(host);$('#os-video-empty').hidden=true
      player=new YT.Player(host,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:video.id,playerVars:{origin:location.origin,playsinline:1,autoplay:0,start:video.start,rel:0},events:{
        onReady:()=>{if(generation!==playerGeneration)return;$('#os-video-status').textContent='listo / pulsa reproducir en el vídeo';const iframe=player.getIframe();iframe.title='reproductor de youtube';iframe.referrerPolicy='strict-origin-when-cross-origin';if(app!=='video')player.pauseVideo()},
        onStateChange:event=>{if(generation!==playerGeneration)return;const labels={0:'vídeo finalizado',1:'reproduciendo desde youtube',2:'reproducción en pausa',3:'cargando vídeo…',5:'listo / pulsa reproducir en el vídeo'};if(labels[event.data])$('#os-video-status').textContent=labels[event.data]},
        onError:event=>{if(generation!==playerGeneration)return;$('#os-video-error').textContent=[101,150].includes(event.data)?'el autor no permite reproducir este vídeo fuera de youtube. usa «abrir en youtube».':event.data===153?'youtube no pudo verificar este navegador. usa «abrir en youtube».':'youtube no pudo reproducir este vídeo. prueba otro enlace o ábrelo en youtube.';$('#os-video-status').textContent='reproducción no disponible'},
      }})
    }catch{if(generation===playerGeneration){$('#os-video-error').textContent='no se pudo conectar con youtube. revisa tu conexión o ábrelo en otra pestaña.';$('#os-video-status').textContent='sin conexión con youtube'}}
    finally{if(generation===playerGeneration)$('#os-video-form').removeAttribute('aria-busy')}
    drawTexture()
  }
  $('#os-video-form').addEventListener('submit',event=>{event.preventDefault();loadVideo()})
  $('#os-reference').addEventListener('click',()=>{$('#os-video-url').value='https://www.youtube.com/shorts/oCvC70oIS5w';loadVideo()})
  function clearLocal() {
    localPlayer.pause();localPlayer.removeAttribute('src');localPlayer.load();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null
    localPlayer.hidden=true;$('#os-local-empty').hidden=false;$('#os-local-clear').hidden=true;$('#os-local-name').textContent='ningún archivo seleccionado';$('#os-media-file').value=''
  }
  $('#os-media-file').addEventListener('change',event=>{
    const file=event.target.files[0];if(!file)return
    $('#os-local-error').textContent=''
    if(!/^(audio|video)\//.test(file.type)&&! /\.(mp4|webm|mov|m4a|mp3|ogg|wav|aac|flac)$/i.test(file.name)){$('#os-local-error').textContent='selecciona un archivo de audio o vídeo.';return}
    clearLocal();player?.pauseVideo?.();objectUrl=URL.createObjectURL(file);localPlayer.src=objectUrl;localPlayer.hidden=false;$('#os-local-empty').hidden=true;$('#os-local-clear').hidden=false;$('#os-local-name').textContent=file.name;drawTexture()
  })
  localPlayer.addEventListener('error',()=>$('#os-local-error').textContent='este navegador no puede reproducir el formato del archivo. prueba mp4, webm, mp3 o wav.')
  $('#os-local-clear').addEventListener('click',()=>{clearLocal();drawTexture()})
  for(const name of ['brightness','volume','light'])$('#os-'+name).addEventListener('input',event=>{settings[name]=Number(event.target.value);applySettings()})
  for(const [id,delta] of [['os-temp-down',-1],['os-temp-up',1]])$('#'+id).addEventListener('click',()=>{settings.temperature=Math.max(16,Math.min(28,settings.temperature+delta));applySettings()})
  $('#os-audio').addEventListener('click',async()=>{try{await audio.toggle();update()}catch{$('#os-local-error').textContent='el navegador no pudo activar el sonido.'}})
  $('#os-reset-car').addEventListener('click',()=>{onReset();update()})
  $('#os-door-control').addEventListener('click',()=>{doorOpen=onDoors();update();drawTexture();setTimeout(()=>carPreview.draw(),950)})

  function drawTexture() {
    const texture=car.screenTexture,ctx=texture.image.getContext('2d'),state=sample()
    ctx.fillStyle='#0b1118';ctx.fillRect(0,0,512,288)
    ctx.fillStyle='#9baebc';ctx.font='13px monospace';ctx.fillText('roadster os / '+({map:'navigation',web:'browser',video:'youtube',media:'library',car:'vehicle'}[app]),20,27)
    ctx.fillStyle='#f2f5f6';ctx.font='68px sans-serif';ctx.fillText(String(Math.round(Math.abs(state.speed)*3.6)),22,110)
    ctx.font='12px monospace';ctx.fillStyle='#93a8b8';ctx.fillText('km/h',25,133)
    const path=document.querySelector('#drive-map-track')?.getAttribute('d')
    if(path){ctx.save();ctx.translate(255,42);ctx.scale(1.35,1.35);ctx.strokeStyle='#879ca8';ctx.lineWidth=2;ctx.stroke(new Path2D(path));ctx.fillStyle='#ff593b';ctx.beginPath();ctx.arc((state.x+300)/600*160,(state.z+240)/480*118,3,0,Math.PI*2);ctx.fill();ctx.restore()}
    ctx.fillStyle='#1f2a36';ctx.fillRect(0,222,512,66)
    for(const [i,label] of ['ruta','web','vídeo','media','coche'].entries()){ctx.fillStyle=['map','web','video','media','car'][i]===app?'#ff604b':'#c6d0d9';ctx.font='15px sans-serif';ctx.fillText(label,20+i*100,250)}
    ctx.fillStyle='#a9bcc9';ctx.font='11px monospace';ctx.fillText(settings.temperature+'°  /  tocar para explorar',20,276)
    texture.needsUpdate=true
    car.driverScreens?.forEach((texture,index)=>{
      const c=texture.image.getContext('2d');c.fillStyle='#050b10';c.fillRect(0,0,512,192);c.fillStyle='#e9f0f3';c.font='95px sans-serif';c.fillText(index?String(Math.round(Math.abs(state.speed)*3.6)):state.gear===-1?'r':'d',20,116)
      c.font='22px monospace';c.fillStyle='#8dabbc';c.fillText(index?'km/h':state.augment||'studio',220,112);c.fillStyle='#ff6349';c.fillRect(20,152,472*(state.air===undefined?1:state.air/4),5);texture.needsUpdate=true
    })
  }
  function update() {
    const state=sample(),stamp=performance.now()
    if(stamp-lastSample>500){history.push(Math.abs(state.speed)*3.6);if(history.length>60)history.shift();lastSample=stamp}
    {
      $('#os-clock').textContent=new Intl.DateTimeFormat('es',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())
      $('.os-park').textContent=state.active?(state.paused?'p · pausa':state.gear===-1?'r · reversa':'d · conducción'):'p · estudio'
      $('#os-speed').textContent=Math.round(Math.abs(state.speed)*3.6)
      $('#os-distance').replaceChildren(document.createTextNode((Math.abs(state.distance)/1000).toFixed(2)+' '));const unit=document.createElement('small');unit.textContent='km';$('#os-distance').append(unit)
      $('#os-surface').textContent=state.offroad?'grava':'asfalto'
      const provingGround=state.active&&state.area!=='circuit'
      const route=provingGround?'M8 22H152M8 47H152M8 72H152M8 97H152':document.querySelector('#drive-map-track').getAttribute('d')
      for(const id of ['os-map-route','os-map-route-border'])$('#'+id).setAttribute('d',route)
      $('#os-map-location').setAttribute('cx',provingGround?8+(state.x-600)/2200*144:(state.x+300)/600*160);$('#os-map-location').setAttribute('cy',provingGround?20+(state.z+75)/150*80:(state.z+240)/480*118)
      $('.os-map-tag').firstChild.textContent=provingGround?'proving ground':'test valley'
      $('.os-map-tag span').textContent=provingGround?'saltos / velocidad / exhibición':'/ circuito cerrado'
      $('#os-map-location').toggleAttribute('hidden',!state.active)
      $('#os-heading').textContent='rumbo '+String(Math.round(((state.heading*180/Math.PI)%360+360)%360)%360).padStart(3,'0')+'°'
      $('#os-lap').textContent=provingGround?`saltos ${state.jumps} / vehículos ${state.cleared}`:state.active?document.querySelector('#drive-lap').textContent:'estudio / sin conducción'
      for(const [id,value,unit] of [['acceleration',state.acceleration.toFixed(2),'m/s²'],['lateral',(state.lateral/9.81).toFixed(2),'g'],['steer',(state.steer*180/Math.PI).toFixed(1),'°'],['slip',Math.round(Math.min(1,state.slip)*100),'%']]){$('#os-'+id).replaceChildren(document.createTextNode(value+' '));const small=document.createElement('small');small.textContent=unit;$('#os-'+id).append(small)}
      $('#os-speed-history').setAttribute('d',history.map((speed,index)=>`${index?'L':'M'}${index/59*600},${96-Math.min(250,speed)/250*90}`).join(' '))
      $('#os-audio').setAttribute('aria-pressed',String(audio.enabled));$('#os-audio').setAttribute('aria-label',audio.enabled?'silenciar sonido del coche':'activar sonido del coche')
      doorOpen=car.doors[0].pivot.rotation.z>.5
      $('#os-door-control').querySelector('span').textContent=doorOpen?'cerrar puertas':'abrir puertas'
      $('#os-reset-car').disabled=!state.active
      $('#os-game-status').textContent=state.notice||'simulación de conducción / parámetros de juego'
      $('#os-air-status').textContent=state.active?`${state.augment} / aire ${Math.round(state.air/4*100)}% / ${state.grounded?'suelo':'vuelo'} / superados ${state.cleared}`:'estudio independiente'
      $('#os-surface').textContent=state.active?state.grounded?(state.offroad?'grava':'asfalto'):`${Math.max(0,state.y).toFixed(1)} m`:'estudio'
    }
    if(stamp-lastTexture>250&&!document.hidden){drawTexture();lastTexture=stamp}
  }
  const timer=setInterval(()=>{if(!document.hidden)update()},250)
  addEventListener('pagehide',event=>{if(!event.persisted)clearInterval(timer);destroyYouTube();clearLocal();stopBrowser()})
  // Keep the canvas screen in sync even when the full-size interface is closed.
  applySettings()
  return {element:dialog,open,close,update,drawTexture,showControls(){open();switchApp('car')},get isOpen(){return focused}}
}
