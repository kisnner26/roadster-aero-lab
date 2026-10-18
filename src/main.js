import './styles.css'
import './driving.css'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { createRoadster, referenceEnvelope } from './roadster.js'
import { createVehicleAudio } from './vehicle-audio.js'
import { createDrivingMode } from './driving.js'
import { createInfotainment } from './infotainment.js'
import { createCarPreview } from './car-preview.js'
import { createCockpitScreen,screenFocusFov } from './cockpit-screen.js'
import './cockpit-screen.css'

const $ = selector => document.querySelector(selector)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const canvas = $('#viewport')
const duration = 70
let renderer
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
} catch {
  $('#loader').classList.add('complete')
  $('#fallback').hidden = false
}
if (renderer) init()

function init() {
  let driving=null,infotainment=null,cockpitScreen=null,screenStudioFocus=false,resumeStudio=false
  const audio=createVehicleAudio(enabled=>{
    $('#sound').setAttribute('aria-pressed',String(enabled))
    $('#sound').setAttribute('aria-label',enabled?'silenciar sonido ambiental':'activar sonido ambiental')
    $('#sound-icon').setAttribute('d',enabled?'M4 10h4l5-4v12l-5-4H4zM17 8q5 4 0 8M20 5q8 7 0 14':'M4 10h4l5-4v12l-5-4H4zM17 9l5 6M22 9l-5 6')
    $('#drive-sound').setAttribute('aria-pressed',String(enabled));$('#drive-sound').textContent=enabled?'sonido on':'sonido off'
  })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.setClearColor(0x080a0c)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x080a0c, .024)
  const camera = new THREE.PerspectiveCamera(35, 1, .05, 150)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = new THREE.Scene()
  environment.background = new THREE.Color(0x11151c)
  const softboxMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })
  for(const [pos,size] of [[[0,5,0],[9,.1,1.2]],[[-5,2,0],[.1,3,7]],[[3,1,-5],[4,2,.1]]]) {
    const panel=new THREE.Mesh(new THREE.BoxGeometry(...size),softboxMaterial)
    panel.position.set(...pos);environment.add(panel)
  }
  const environmentTarget = pmrem.fromScene(environment, .04)
  scene.environment = environmentTarget.texture
  environment.traverse(object=>{if(object.isMesh)object.geometry.dispose()})
  softboxMaterial.dispose()
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xb7d0eb, 0x222531, 1.7))
  const key = new THREE.DirectionalLight(0xe4edff, 3)
  key.position.set(-3, 7, 4)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -5; key.shadow.camera.right = 5
  key.shadow.camera.top = 5; key.shadow.camera.bottom = -5
  key.shadow.normalBias = .025
  key.shadow.bias = -.0001
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x9cbddf, 2.5)
  rim.position.set(3, 2, -4)
  scene.add(rim)
  const frontFill = new THREE.DirectionalLight(0xffffff, 1.4)
  frontFill.position.set(-4, 1, -2)
  scene.add(frontFill)

  const car = createRoadster()
  scene.add(car.root)
  const cabinLight=new THREE.PointLight(0xe7f1ff,.85,2.1,1.7)
  cabinLight.position.set(.05,1.02,0);car.root.add(cabinLight)
  const solidMaterials = new Map()
  car.root.traverse(object => {
    if (!object.isMesh) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(material => {
      if(material===car.plumeMaterial||material===car.liftPlumeMaterial)return
      if (!solidMaterials.has(material)) solidMaterials.set(material, material.opacity)
      material.transparent = true
    })
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ color: 0x0c1015, transparent: true }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -.018
  ground.receiveShadow = true
  scene.add(ground)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12,12), new THREE.ShadowMaterial({opacity:.55,transparent:true}))
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.01;shadow.receiveShadow=true;scene.add(shadow)
  const grid = new THREE.GridHelper(32, 64, 0x38414b, 0x222a32)
  grid.material.transparent = true
  grid.material.opacity = .28
  grid.position.y = -.012
  scene.add(grid)
  const rings = new THREE.Group()
  const ringMaterial = new THREE.LineBasicMaterial({ color: 0x46515c, transparent: true, opacity: .4 })
  for (const radius of [2.8, 3, 5]) {
    const points = Array.from({ length: 193 }, (_, i) => new THREE.Vector3(Math.cos(i / 192 * Math.PI * 2) * radius, -.008, Math.sin(i / 192 * Math.PI * 2) * radius))
    rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ringMaterial))
  }
  scene.add(rings)

  const flow = createFlow()
  scene.add(flow.root)
  const space = createSpace()
  scene.add(space.root)
  const state = { time: 0 }
  const timeline = gsap.timeline({ paused: true }).to(state, { time: duration, duration, ease: 'none', onUpdate: () => renderAt(state.time) })
  window.__timelines = window.__timelines || {}
  window.__timelines['roadster-engineering'] = timeline
  addEventListener('hf-seek', event => timeline.seek(event.detail.time, false))
  // the interactive player and export adapter use this same absolute-time renderer.
  window.__roadster = { seek: time => seek(time), pause: () => setPlaying(false), get time() { return state.time } }

  let width = innerWidth, height = innerHeight, mobile = width < 600
  let activeChapter = -1, playing = !reducedMotion.matches, frame = 0, lastStamp = 0, pointerDown = false
  let userAzimuth = 0, userElevation = 0, dragX = 0, dragY = 0, doorOverride = null
  let doorTween=null
  const chapters = [
    { title: 'form.', kicker: '01 / reference reconstruction', subtitle: 'wedge / canopy / aero', mode: 'surface perspective', eyebrow: 'roadster / reference concept', label: 'reconstructed proportions', metrics: [['body length','1.000','l'],['wheelbase','0.600','l'],['closed height','0.262','l']], foot: 'image reference / not factory dimensions' },
    { title: 'structure.', kicker: '02 / proportional study', subtitle: 'surface / section / envelope', mode: 'section / wireframe', eyebrow: 'geometry / reconstructed', label: 'normalized envelope', metrics: [['body length','1.000','l'],['body width','0.440','l'],['closed height','0.262','l']], foot: 'closed configuration / normalized to length' },
    { title: 'flow.', kicker: '03 / aerodynamic study', subtitle: 'the invisible, made visible.', mode: 'streamline field', eyebrow: 'air / surface interaction', label: 'flow visualization', metrics: [['field','3d',''],['flow','→','x axis'],['model','qual.','']], foot: 'qualitative / non-cfd' },
    { title: 'cabin.', kicker: '04 / interior architecture', subtitle: 'yoke / interface / light', mode: 'interior perspective', eyebrow: 'cockpit / reference reconstruction', label: 'cabin architecture', metrics: [['steering','yoke',''],['display','central',''],['trim','light','']], foot: 'visual reconstruction from supplied interior' },
    { title: 'flight.', kicker: '05 / propulsion concept', subtitle: 'aero / thrust / altitude', mode: 'concept visualization', eyebrow: 'roadster / speculative propulsion', label: 'visual concept', metrics: [['rear nozzles','04',''],['diffuser','04','channels'],['study','visual','']], foot: 'speculative scene / not a flight simulation' },
  ]
  const cameraFrames = [
    [0,[-5.8,2.6,7.4],[-.2,.55,0]],
    [8,[-5.1,2.1,7.4],[-.2,.7,0]],
    [12,[-4.4,1.9,7.3],[-.2,.55,0]],
    [17,[.1,2.3,8.5],[-.1,.45,0]],
    [23,[.2,8.4,2.4],[-.1,.4,0]],
    [28,[-4.8,2.8,7.3],[-.1,.5,0]],
    [35,[4.7,2.1,7.3],[.3,.55,0]],
    [39,[7.4,1.3,.1],[.5,.5,0]],
    [42,[3.1,2.4,4.4],[0,.7,0]],
    [45,[.98,1.01,.03],[-.75,.75,0]],
    [52,[.92,1.015,-.08],[-.75,.76,.08]],
    [56,[4.8,2.2,7.8],[.2,.75,0]],
    [60,[6.4,2.6,7.4],[.2,1.1,0]],
    [67,[5.8,2.2,6.9],[.2,1.1,0]],
    [70,[-5.8,2.6,7.4],[-.2,.55,0]],
  ]
  const annotations = $('#dimension-lines')
  const annotationNodes = []
  for (let i = 0; i < 3; i++) {
    const group = document.createElementNS('http://www.w3.org/2000/svg','g')
    group.innerHTML = '<path/><line marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/><text></text>'
    annotations.append(group)
    annotationNodes.push({ group, path: group.querySelector('path'), line: group.querySelector('line'), text: group.querySelector('text') })
  }
  const position = new THREE.Vector3(), target = new THREE.Vector3(), projection = new THREE.Vector3()
  const smooth = (a, b, t) => THREE.MathUtils.smoothstep(t, a, b)

  function resize() {
    width = $('#experience').clientWidth; height = $('#experience').clientHeight; mobile = width < 600
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if(driving?.active){driving.resize();return}
    renderAt(state.time)
  }

  function updateChapter(index) {
    if (index === activeChapter) return
    if(doorTween){doorTween.kill();doorTween=null;doorOverride=null}
    activeChapter = index
    $('#experience').dataset.activeChapter=String(index)
    const data = chapters[index]
    $('#chapter-title').textContent = data.title
    $('#chapter-kicker').textContent = data.kicker
    $('#chapter-subtitle').textContent = data.subtitle
    $('#view-mode').textContent = data.mode
    $('#eyebrow').textContent = data.eyebrow
    $('#data-title').textContent = data.label
    $('#data-foot').textContent = data.foot
    data.metrics.forEach(([label, value, unit], i) => {
      const id = ['a','b','c'][i]
      $(`#metric-${id}-label`).textContent = label
      $(`#metric-${id}`).replaceChildren(document.createTextNode(value+' '))
      const small = document.createElement('small'); small.textContent = unit; $(`#metric-${id}`).append(small)
    })
    document.querySelectorAll('[data-chapter]').forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current','step')
      else button.removeAttribute('aria-current')
    })
    $('#scene-announcement').textContent = `capítulo ${index+1}: ${data.title}`
  }

  function project(x,y,z) {
    projection.set(x,y,z).applyMatrix4(car.root.matrixWorld).project(camera)
    return [(projection.x*.5+.5)*width,(-projection.y*.5+.5)*height]
  }
  function dimension(index,a,b,label,offset) {
    const p=project(...a),q=project(...b), node=annotationNodes[index]
    const dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1
    const ox=-dy/len*offset,oy=dx/len*offset
    const p2=[p[0]+ox,p[1]+oy],q2=[q[0]+ox,q[1]+oy]
    node.path.setAttribute('d',`M${p}L${p2}M${q}L${q2}`)
    node.line.setAttribute('x1',p2[0]);node.line.setAttribute('y1',p2[1]);node.line.setAttribute('x2',q2[0]);node.line.setAttribute('y2',q2[1])
    node.text.setAttribute('x',(p2[0]+q2[0])/2);node.text.setAttribute('y',(p2[1]+q2[1])/2-9)
    node.text.textContent=label
  }

  function renderAt(time) {
    if(driving?.active)return
    const t=THREE.MathUtils.clamp(time,0,duration)
    const chapter=Math.min(chapters.length-1,Math.floor(t/14))
    updateChapter(chapter)
    let k=0
    while(k<cameraFrames.length-2 && t>cameraFrames[k+1][0])k++
    const a=cameraFrames[k],b=cameraFrames[k+1],blend=smooth(a[0],b[0],t)
    position.fromArray(a[1]).lerp(new THREE.Vector3(...b[1]),blend)
    target.fromArray(a[2]).lerp(new THREE.Vector3(...b[2]),blend)
    const interior=smooth(42,45,t)*(1-smooth(52,55,t))
    car.wheels.visible=interior<.95
    camera.fov=THREE.MathUtils.lerp(35,73,interior)
    if(mobile) {
      position.sub(target).multiplyScalar(THREE.MathUtils.lerp(1.9,1,interior)).add(target)
      camera.setViewOffset(width,height,0,-height*.025,width,height)
    } else {
      position.sub(target).multiplyScalar(THREE.MathUtils.lerp(width>1000?.91:1.22,1,interior)).add(target)
      camera.setViewOffset(width,height,width*.015*(1-interior),-height*.025*(1-interior),width,height)
    }
    const offset=position.clone().sub(target)
    const spherical=new THREE.Spherical().setFromVector3(offset)
    spherical.theta+=userAzimuth
    spherical.phi=THREE.MathUtils.clamp(spherical.phi+userElevation,.15,Math.PI/2-.03)
    camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical))
    camera.lookAt(target)
    if(screenStudioFocus){camera.position.set(.24,.80,0);camera.lookAt(-.349,.795,0);camera.fov=screenFocusFov(camera.aspect);camera.clearViewOffset()}
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()

    const wireAmount=smooth(13,16,t)*(1-smooth(25,28,t))
    const flight=smooth(56,60,t)*(1-smooth(67,70,t))
    const flowAmount=smooth(27,30,t)*(1-smooth(40,43,t))
    const doorAmount=doorOverride===null?smooth(1,4,t)*(1-smooth(9,12,t)):doorOverride
    car.doors.forEach(({pivot,sign})=>{pivot.rotation.z=doorAmount*1.17;pivot.rotation.x=sign*doorAmount*.24;pivot.rotation.y=sign*doorAmount*.1})
    $('#doors').setAttribute('aria-pressed',String(doorAmount>.5))
    $('#doors').setAttribute('aria-label',doorAmount>.5?'cerrar puertas':'abrir puertas')
    car.wing.position.y=-.19+flowAmount*.19
    car.root.position.y=flight*.85
    car.root.rotation.set(flight*.06,flight*-.28,flight*-.1)
    car.root.updateMatrixWorld(true)
    solidMaterials.forEach((opacity,material)=>{ material.opacity=opacity*(1-wireAmount*.88);material.transparent=material.opacity<.999 })
    car.plumeMaterial.uniforms.uOpacity.value=flight*.22
    car.wireMaterials.forEach(material=>{material.opacity=wireAmount*.17})
    car.sectionMaterial.opacity=wireAmount*.66
    car.wireMaterials.forEach((material,i)=>{if(i>0)material.opacity=wireAmount*.45})
    ground.material.opacity=1-flight
    shadow.material.opacity=.55*(1-flight)
    ground.visible=flight<.995
    grid.material.opacity=.24*(1-flight)+wireAmount*.13
    ringMaterial.opacity=.25*(1-flight)
    flow.root.visible=flowAmount>.001
    flow.material.uniforms.uTime.value=t
    flow.material.uniforms.uOpacity.value=flowAmount*.95
    flow.pointMaterial.uniforms.uTime.value=t
    flow.pointMaterial.uniforms.uOpacity.value=flowAmount
    space.root.visible=flight>.001
    space.earth.material.uniforms.uOpacity.value=flight
    space.atmosphere.material.uniforms.uOpacity.value=flight
    space.stars.material.opacity=flight*.8
    space.earth.rotation.y=t*.013
    scene.fog.density=.024*(1-flight)
    const annotationOpacity=smooth(14,17,t)*(1-smooth(25,28,t))
    annotations.style.opacity=String(annotationOpacity)
    if(annotationOpacity>.001) {
      const half=referenceEnvelope.length/2
      dimension(0,[-half,.02,1.06],[half,.02,1.06],'1.000 l',mobile?20:38)
      dimension(1,[-1.34,.02,1.06],[1.36,.02,1.06],'0.600 l',mobile?42:78)
      dimension(2,[-2.36,.02,1.06],[-2.36,referenceEnvelope.height,1.06],'0.262 l',mobile?-18:-32)
    }
    const titleFade=1-smooth(1,4,t%14)*.7
    $('.title-block').style.opacity=String(titleFade*(1-interior))
    $('.telemetry').style.opacity=String(1-interior)
    $('.coordinate-label').style.opacity=String(1-interior)
    $('#timecode').textContent=`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`
    $('#scrubber-fill').style.transform=`scaleX(${t/duration})`
    $('#timeline').value=String(t)
    renderer.render(scene,camera)
    cockpitScreen?.render(scene,camera,{interactive:Boolean(infotainment?.isOpen),allowed:chapter===3||screenStudioFocus})
  }

  function seek(time) {
    timeline.seek(THREE.MathUtils.clamp(time,0,duration), false)
    renderAt(state.time)
  }
  function tick(stamp) {
    if(!playing || document.hidden)return
    const delta=lastStamp?Math.min((stamp-lastStamp)/1000,.06):0
    lastStamp=stamp
    seek(state.time+delta>=duration?0:state.time+delta)
    frame=requestAnimationFrame(tick)
  }
  function setPlaying(value) {
    playing=value
    $('#play').setAttribute('aria-pressed',String(!playing))
    $('#play').setAttribute('aria-label',playing?'pausar recorrido':'reproducir recorrido')
    $('#play-icon').setAttribute('d',playing?'M7 5v10M13 5v10':'M7 4l9 6-9 6z')
    cancelAnimationFrame(frame);lastStamp=0
    if(playing&&!document.hidden)frame=requestAnimationFrame(tick)
  }
  $('#play').addEventListener('click',()=>setPlaying(!playing))
  $('#timeline').addEventListener('input',event=>{setPlaying(false);seek(Number(event.target.value))})
  document.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>{
    doorTween?.kill();userAzimuth=0;userElevation=0;doorOverride=null;seek([5,18,35,47,62][Number(button.dataset.chapter)])
  }))
  $('.wordmark').addEventListener('click',event=>{event.preventDefault();if(driving?.active)driving.exit();doorTween?.kill();userAzimuth=0;userElevation=0;doorOverride=null;seek(0)})
  $('#doors').addEventListener('click',()=>{
    audio.door()
    doorTween?.kill()
    const control={amount:car.doors[0].pivot.rotation.z/1.17}
    doorOverride=control.amount
    doorTween=gsap.to(control,{amount:control.amount>.5?0:1,duration:reducedMotion.matches?0:.85,ease:'power2.inOut',onUpdate:()=>{doorOverride=control.amount;renderAt(state.time)}})
  })
  addEventListener('keydown',event=>{
    if(driving?.active)return
    if($('#sources').open || /INPUT|BUTTON|A/.test(document.activeElement.tagName))return
    if(event.code==='Space'){event.preventDefault();setPlaying(!playing)}
    if(event.key==='ArrowRight'){event.preventDefault();doorOverride=null;seek((activeChapter+1)%chapters.length*14+.1)}
    if(event.key==='ArrowLeft'){event.preventDefault();doorOverride=null;seek((activeChapter+chapters.length-1)%chapters.length*14+.1)}
  })
  canvas.addEventListener('pointerdown',event=>{if(driving?.active)return;pointerDown=true;dragX=event.clientX;dragY=event.clientY;canvas.setPointerCapture(event.pointerId);$('#gesture-hint').style.opacity='0'})
  canvas.addEventListener('pointermove',event=>{
    if(driving?.active||!pointerDown)return
    userAzimuth-=(event.clientX-dragX)*.005
    userElevation-=(event.clientY-dragY)*.003
    dragX=event.clientX;dragY=event.clientY
    if(!playing)renderAt(state.time)
  })
  const endDrag=()=>{pointerDown=false}
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag)
  let wheelStamp=0
  canvas.addEventListener('wheel',event=>{
    if(driving?.active)return
    if(Math.abs(event.deltaY)<25 || event.timeStamp-wheelStamp<1000)return
    wheelStamp=event.timeStamp;userAzimuth=0;userElevation=0
    doorOverride=null;seek(((activeChapter+(event.deltaY>0?1:chapters.length-1))%chapters.length)*14+.1)
  },{passive:true})
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);lastStamp=0;if(playing&&!document.hidden)frame=requestAnimationFrame(tick)})
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)setPlaying(false)})
  let wasPlaying=false
  $('#open-sources').addEventListener('click',()=>{wasPlaying=playing;setPlaying(false);$('#sources').showModal()})
  $('#close-sources').addEventListener('click',()=>$('#sources').close())
  $('#sources').addEventListener('click',event=>{if(event.target===$('#sources')){const r=$('#sources').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#sources').close()}})
  $('#sources').addEventListener('close',()=>{if(wasPlaying)setPlaying(true)})
  $('#sound').addEventListener('click',()=>audio.toggle())
  driving=createDrivingMode({renderer,studio:scene,car,audio,reducedMotion:reducedMotion.matches,onDashboard:()=>infotainment?.drawTexture(),onSceneRender:(scene,camera)=>cockpitScreen?.render(scene,camera,{interactive:Boolean(infotainment?.isOpen),allowed:driving.screenVisible}),isScreenOpen:()=>Boolean(infotainment?.isOpen),onExit:()=>{renderAt(state.time);setPlaying(resumeStudio)}})
  let screenResume=false
  const carPreview=createCarPreview(renderer,car,scene.environment)
  infotainment=createInfotainment({car,audio,cabinLight,carPreview,getTelemetry:()=>driving.active?driving.telemetry:null,
    onVisualChange:()=>{if(driving.active)driving.resize();else renderAt(state.time)},
    onOpen:()=>{screenResume=playing;setPlaying(false);doorTween?.kill();$('#experience').dataset.screenFocused='true';if(driving.active){driving.pause(true);driving.focusScreen(true)}else{screenStudioFocus=true;doorOverride=0;userAzimuth=0;userElevation=0;seek(47)}},
    onClose:()=>{$('#experience').dataset.screenFocused='false';if(driving.active)driving.focusScreen(false);else{screenStudioFocus=false;renderAt(state.time);setPlaying(screenResume)}},
    onReset:()=>{if(driving.active)driving.reset()},
    onDoors:()=>{
      if(!driving.active){$('#doors').click();return car.doors[0].pivot.rotation.z<.5}
      const opened=car.doors[0].pivot.rotation.z<.5
      car.doors.forEach(({pivot,sign})=>{pivot.rotation.z=opened?1.17:0;pivot.rotation.x=opened?sign*.24:0;pivot.rotation.y=opened?sign*.1:0});audio.door();driving.resize();return opened
    },
  })
  cockpitScreen=createCockpitScreen(car,infotainment.element,$('#experience'))
  $('#open-screen').removeAttribute('aria-haspopup');$('#open-screen').setAttribute('aria-controls','infotainment')
  $('#open-screen').addEventListener('click',()=>infotainment.open())
  addEventListener('keydown',event=>{if(event.code==='KeyE'&&!event.repeat&&!document.querySelector('dialog[open]')&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)){event.preventDefault();infotainment.open()}})
  addEventListener('keydown',event=>{if(event.code==='KeyH'&&!infotainment.isOpen&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)){event.preventDefault();infotainment.showControls()}})
  const screenRay=new THREE.Raycaster(),screenPointer=new THREE.Vector2()
  let screenPointerStart=null
  canvas.addEventListener('pointerdown',event=>screenPointerStart=[event.clientX,event.clientY])
  canvas.addEventListener('pointerup',event=>{
    if(!screenPointerStart||Math.hypot(event.clientX-screenPointerStart[0],event.clientY-screenPointerStart[1])>6)return
    screenPointerStart=null
    if(driving.active?!driving.screenVisible:activeChapter!==3)return
    const bounds=canvas.getBoundingClientRect();screenPointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1)
    screenRay.setFromCamera(screenPointer,driving.active?driving.camera:camera)
    if(screenRay.intersectObject(car.screenSurface).length)infotainment.open()
  })
  $('#drive-toggle').addEventListener('click',()=>{
    if(driving.active){driving.exit();return}
    resumeStudio=playing;setPlaying(false);doorTween?.kill();doorTween=null;doorOverride=null;seek(0);driving.enter()
  })
  new ResizeObserver(resize).observe($('#experience'))
  resize()
  renderer.compile(scene,camera)
  $('#loader').classList.add('complete')
  $('#loader').setAttribute('aria-hidden','true')
  setPlaying(playing)
}

function flowPoint(x,y,z) {
  const envelope=Math.exp(-Math.pow(x/1.8,4))
  const near=Math.exp(-Math.pow(z/1.25,4))
  const upper=y>.48
  const bend=upper ? Math.max(0,1.2-y)*envelope*near : -.16*envelope*near
  const side=Math.sign(z)*envelope*.23*Math.exp(-Math.abs(z))
  const wake=Math.max(0,x-1.5)*.08*Math.sin(x*4+z*3+y*5)
  return [x,y+bend+wake,z+side]
}

function createFlow() {
  const root=new THREE.Group(),positions=[],phases=[],lanes=[],pointPositions=[],pointData=[]
  for(let lane=0;lane<68;lane++) {
    const y=.16+(lane%10)*.18, z=(Math.floor(lane/10)-3)*.48
    for(let i=0;i<128;i++) {
      const x=-7+i/127*14
      positions.push(...flowPoint(x,y,z));phases.push(i/127);lanes.push(lane)
    }
    for(let k=0;k<4;k++){pointPositions.push(0,0,0);pointData.push(y,z,lane*.137+k*.25)}
  }
  const uniforms={uTime:{value:0},uOpacity:{value:0}}
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'attribute float phase; attribute float lane; varying float vPhase; varying float vLane; void main(){vPhase=phase;vLane=lane;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uTime;uniform float uOpacity;varying float vPhase;varying float vLane;void main(){float trail=pow(fract(vPhase*2.-uTime*.22+vLane*.13),10.);float edge=smoothstep(0.,.12,vPhase)*(1.-smoothstep(.8,1.,vPhase));vec3 col=mix(vec3(.35,.58,.7),vec3(1.,.26,.12),step(.88,fract(vLane*.19)));gl_FragColor=vec4(col,uOpacity*edge*(.08+trail*.9));}'})
  for(let lane=0;lane<68;lane++){
    const g=new THREE.BufferGeometry()
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions.slice(lane*128*3,(lane+1)*128*3),3))
    g.setAttribute('phase',new THREE.Float32BufferAttribute(phases.slice(lane*128,(lane+1)*128),1))
    g.setAttribute('lane',new THREE.Float32BufferAttribute(lanes.slice(lane*128,(lane+1)*128),1))
    root.add(new THREE.Line(g,material))
  }
  const pointGeometry=new THREE.BufferGeometry()
  pointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pointPositions,3))
  pointGeometry.setAttribute('aData',new THREE.Float32BufferAttribute(pointData,3))
  const pointMaterial=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 aData;uniform float uTime;varying float vFade;void main(){float p=fract(aData.z+uTime*.17);float x=p*14.-7.;float y=aData.x;float z=aData.y;float env=exp(-pow(x/1.8,4.));float near=exp(-pow(z/1.25,4.));y+=y>.48?max(0.,1.2-y)*env*near:-.16*env*near;z+=sign(z)*env*.23*exp(-abs(z));y+=max(0.,x-1.5)*.08*sin(x*4.+z*3.+y*5.);vec4 mv=modelViewMatrix*vec4(x,y,z,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(17./-mv.z,1.,4.);vFade=smoothstep(0.,.1,p)*(1.-smoothstep(.9,1.,p));}`,
    fragmentShader:'uniform float uOpacity;varying float vFade;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.7,.86,1.,(1.-d*2.)*uOpacity*vFade);}'})
  root.add(new THREE.Points(pointGeometry,pointMaterial))
  return {root,material,pointMaterial}
}

function createSpace() {
  const root=new THREE.Group(),points=[]
  const seed=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)}
  for(let i=0;i<1400;i++){
    const az=seed(i)*Math.PI*2,el=Math.acos(seed(i+1800)*2-1),r=35+seed(i+3600)*25
    points.push(Math.sin(el)*Math.cos(az)*r,Math.cos(el)*r,Math.sin(el)*Math.sin(az)*r)
  }
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3))
  const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xd9e7f3,size:.045,transparent:true,opacity:0,sizeAttenuation:true,depthWrite:false}))
  root.add(stars)
  const vertexShader='varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
  const earthMaterial=new THREE.ShaderMaterial({uniforms:{uOpacity:{value:0}},transparent:true,vertexShader,
    fragmentShader:`uniform float uOpacity;varying vec3 vNormal;varying vec3 vPosition;
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    void main(){vec3 p=normalize(vPosition);float n=noise(p*4.)*.55+noise(p*11.)*.3+noise(p*26.)*.15;float land=smoothstep(.51,.56,n);float clouds=smoothstep(.51,.72,noise(p*9.+3.)*.65+noise(p*24.)*.35);vec3 ocean=vec3(.008,.025,.055);vec3 continent=vec3(.027,.055,.064);vec3 col=mix(ocean,continent,land);col=mix(col,vec3(.25,.34,.4),clouds*.55);float light=max(dot(vNormal,normalize(vec3(-1.,1.,1.))),.025);float rim=pow(1.-clamp(dot(vNormal,vec3(0,0,1)),0.,1.),3.);col=col*light+vec3(.025,.14,.26)*rim;gl_FragColor=vec4(col,uOpacity);}`})
  const earth=new THREE.Mesh(new THREE.SphereGeometry(6,96,64),earthMaterial)
  earth.position.set(-1,-7.15,-6.7)
  root.add(earth)
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(6.075,64,48),new THREE.ShaderMaterial({uniforms:{uOpacity:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader,
    fragmentShader:'uniform float uOpacity;varying vec3 vNormal;void main(){float rim=pow(1.-clamp(dot(vNormal,vec3(0,0,1)),0.,1.),5.);gl_FragColor=vec4(.07,.3,.65,rim*uOpacity*.65);}' }))
  atmosphere.position.copy(earth.position);root.add(atmosphere)
  return {root,earth,atmosphere,stars}
}
