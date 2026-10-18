import * as THREE from 'three'
import {createDrivingWorld} from './driving-world.js'
import {createVehicleState,stepVehicle,stepVertical,vehicleConfig,augments} from './vehicle-physics.js'
import {screenFocusFov} from './cockpit-screen.js'
import {stepExhibitionLoop,stuntLoop} from './stunt-physics.js'

const $=selector=>document.querySelector(selector)
const heldKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyX','KeyI','KeyK','KeyJ','KeyL'])

export function createDrivingMode({renderer,studio,car,audio,onExit,onFrame=()=>{},onDashboard=()=>{},onSceneRender=()=>{},isScreenOpen=()=>false,reducedMotion=false}) {
  const worldScene=new THREE.Scene();worldScene.environment=studio.environment
  const world=createDrivingWorld(worldScene,car)
  const camera=new THREE.PerspectiveCamera(74,1,.025,6000)
  const keys=new Set(),touch={throttle:0,brake:0,left:0,right:0}
  const cameraPosition=new THREE.Vector3(),lookAt=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),desiredTarget=new THREE.Vector3()
  let active=false,paused=false,exterior=false,raf=0,last=0,accumulator=0,state=createVehicleState(),lap=1,lastProgress=0,lapTime=0,dashTimer=0,viewReady=false
  let headYaw=0,headPitch=0,dragging=false,dragX=0,dragY=0,hasDriven=false,screenFocus=false,previousExterior=false,area='circuit',notice=''
  let lastControls=''
  $('#drive-map-track').setAttribute('d',world.mapPath)

  function clearInput() {
    keys.clear();Object.keys(touch).forEach(key=>touch[key]=0)
    document.querySelectorAll('.is-held').forEach(button=>button.classList.remove('is-held'))
    dragging=false
  }
  function reset(nextArea=area) {
    area=typeof nextArea==='string'?nextArea:area
    clearInput()
    const p=world.curve.getPointAt(0),t=world.curve.getTangentAt(0),n=new THREE.Vector3(-t.z,0,t.x)
    const augment=state.augment
    state=area==='loop'?createVehicleState(1030,-60,0):area==='semi'?createVehicleState(800,30,0):area==='stunts'?createVehicleState(800,0,0):createVehicleState(p.x+n.x*3,p.z+n.z*3,Math.atan2(t.z,t.x))
    state.augment=augment
    lap=1;lapTime=0;lastProgress=0;headYaw=0;headPitch=0;accumulator=0;viewReady=false
    $('#drive-message').textContent='simulación de conducción / parámetros ilustrativos'
    draw(0)
  }
  function resize() {
    camera.aspect=$('#experience').clientWidth/$('#experience').clientHeight
    camera.updateProjectionMatrix()
    if(active)draw(0)
  }
  function cameraMode(value=!exterior) {
    exterior=typeof value==='boolean'?value:!exterior;viewReady=false
    $('#drive-view-label').textContent=exterior?'chase camera':'cockpit pov'
    $('#drive-camera').setAttribute('aria-label',exterior?'cambiar a cámara pov':'cambiar a cámara exterior')
    if(active)draw(0)
  }
  function reverse() {
    if(Math.abs(state.speed)>.5){$('#drive-message').textContent='frena hasta detenerte para cambiar de marcha';return}
    state.gear*=-1;$('#drive-message').textContent=state.gear===1?'avance seleccionado':'reversa seleccionada';draw(0)
  }
  function pause(value=!paused) {
    if(!value&&car.doors.some(({pivot})=>pivot.rotation.z>.5)){$('#drive-message').textContent='cierra las puertas desde la pantalla antes de continuar';return}
    paused=value;clearInput();audio.update({speed:0,throttle:0,slip:0})
    $('#drive-pause').setAttribute('aria-pressed',String(paused))
    $('#drive-pause').replaceChildren(document.createTextNode(paused?'continuar':'pausa'))
    cancelAnimationFrame(raf);last=0;accumulator=0
    if(active&&!paused&&!document.hidden)raf=requestAnimationFrame(tick)
  }
  function draw(dt) {
    const nearest=world.nearest(state.x,state.z)
    world.update(state.x,state.z)
    const bump=reducedMotion?0:Math.sin(state.distance*2.3)*Math.min(.007,Math.abs(state.speed)*.00013)*(state.offroad?3:1)
    car.root.position.set(state.x,state.y+(state.grounded?bump:0),state.z)
    car.root.rotation.set(reducedMotion?0:-state.lateral*.003,Math.PI-state.heading,reducedMotion?0:-state.acceleration*.0015)
    car.root.rotateZ(-state.pitch);car.root.rotateX(state.roll)
    car.plumeMaterial.uniforms.uOpacity.value=state.boost*.48
    car.exhaust.visible=Boolean(state.boost||state.lift)
    if(car.liftPlumeMaterial)car.liftPlumeMaterial.uniforms.uOpacity.value=state.lift*.4
    car.wheels.visible=true
    if(car.seats){car.seats[0].visible=state.augment!=='rocket';car.seats[1].visible=true}
    car.wheelCenters.forEach(wheel=>{wheel.rotation.y=wheel.position.x<0?-state.steer:0;wheel.rotation.z=state.distance/vehicleConfig.wheelRadius})
    if(car.steering)car.steering.rotation.x=-state.steer*7
    car.wing.position.y=-.19+Math.min(.19,Math.abs(state.speed)/60*.19)+state.brake*.055
    car.root.updateMatrixWorld(true)
    const mobile=camera.aspect<.85
    if(screenFocus){desiredCamera.set(.24,.80,0);desiredTarget.set(-.349,.795,0)}
    else if(exterior){
      // Chase follows heading, not the body's airborne roll, so jumps remain readable.
      const f=new THREE.Vector3(Math.cos(state.heading),0,Math.sin(state.heading)),orbit=state.heading+headYaw
      desiredCamera.set(state.x-Math.cos(orbit)*8,state.y+3.1+headPitch*7,state.z-Math.sin(orbit)*8);desiredTarget.set(state.x+f.x*5*(1-Math.min(1,Math.abs(headYaw))),state.y+.6,state.z+f.z*5*(1-Math.min(1,Math.abs(headYaw))))
      if(state.loopAngle!==undefined&&state.loopAngle!==null){desiredCamera.set(stuntLoop.x-28,20,stuntLoop.z+44);desiredTarget.set(state.x,state.y+.6,state.z)}
    }
    else {
      desiredCamera.set(.025,.99,.335)
      const yaw=headYaw,pitch=headPitch
      desiredTarget.set(.025-Math.cos(yaw)*8,.94+Math.sin(pitch)*8,.335+Math.sin(yaw)*8)
    }
    if(!exterior||screenFocus){desiredCamera.applyMatrix4(car.root.matrixWorld);desiredTarget.applyMatrix4(car.root.matrixWorld)}
    const factor=!viewReady||!exterior||screenFocus?1:1-Math.exp(-dt*8)
    cameraPosition.lerp(desiredCamera,factor);lookAt.lerp(desiredTarget,factor)
    camera.up.set(0,1,0)
    if(!exterior||screenFocus)camera.up.applyQuaternion(car.root.quaternion)
    camera.position.copy(cameraPosition);camera.lookAt(lookAt)
    camera.fov=screenFocus?screenFocusFov(camera.aspect):(exterior?62:mobile?87:75)+(reducedMotion?0:Math.min(7,Math.abs(state.speed)*.07));camera.updateProjectionMatrix()
    viewReady=true
    $('#drive-speed').textContent=String(Math.round(Math.abs(state.speed)*3.6))
    $('#drive-gear-indicator').textContent=state.gear===1?'d':'r'
    $('#drive-surface').textContent=state.offroad?'fuera de pista / agarre reducido':state.brake?'frenado / recuperación de energía':state.throttle?'tracción eléctrica':Math.abs(state.speed)>1?'frenado regenerativo':'listo / modo eléctrico'
    $('#drive-power').style.transform=`scaleX(${Math.max(state.throttle,state.brake)})`
    $('#drive-power').style.background=state.brake?'#ff593f':'#e9f3f7'
    $('#drive-map-car').setAttribute('cx',String((state.x+300)/600*160));$('#drive-map-car').setAttribute('cy',String((state.z+240)/480*118))
    const progress=nearest.index/(world.points.length-1)
    if(lastProgress>.9&&progress<.1&&state.gear===1&&lapTime>10){lap++;lapTime=0}
    lastProgress=progress
    $('#drive-lap').textContent=`vuelta ${String(lap).padStart(2,'0')} / ${Math.floor(lapTime/60)}:${Math.floor(lapTime%60).toString().padStart(2,'0')}`
    $('#drive-instructions').style.opacity=Math.abs(state.speed)>4?'0':'1'
    dashTimer+=dt
    if(dashTimer>.09||dt===0){onDashboard();dashTimer=0}
    renderer.render(worldScene,camera)
    onSceneRender(worldScene,camera)
  }
  function tick(stamp) {
    if(!active||paused||document.hidden)return
    onFrame(stamp)
    const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;accumulator+=dt
    const pad=navigator.getGamepads?.()[0]
    const input={throttle:Math.max(touch.throttle,keys.has('KeyW')||keys.has('ArrowUp')?1:0,pad?.buttons[7]?.value||0),brake:Math.max(touch.brake,keys.has('KeyS')||keys.has('ArrowDown')?1:0,pad?.buttons[6]?.value||0),steer:(touch.right||keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(touch.left||keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+(Math.abs(pad?.axes[0]||0)>.12?pad.axes[0]:0),handbrake:keys.has('KeyX'),boost:keys.has('ShiftLeft')||keys.has('ShiftRight')||pad?.buttons[0]?.pressed,lift:keys.has('Space')||pad?.buttons[1]?.pressed,pitch:(keys.has('KeyI')?1:0)-(keys.has('KeyK')?1:0),roll:(keys.has('KeyL')?1:0)-(keys.has('KeyJ')?1:0)}
    while(accumulator>=1/120){stepVehicle(state,input,1/120,world.nearest(state.x,state.z).distance);if(!stepExhibitionLoop(state,1/120))stepVertical(state,input,1/120,world.surface(state.x,state.z,state.heading));world.collision(state);accumulator-=1/120;lapTime+=1/120}
    if(state.y< -10||!Number.isFinite(state.x))reset()
    if(!dragging){headYaw*=Math.exp(-dt*3);headPitch*=Math.exp(-dt*3)}
    audio.update(state);draw(dt);raf=requestAnimationFrame(tick)
  }
  async function enter() {
    active=true;paused=false;exterior=false;screenFocus=false;last=0;accumulator=0
    worldScene.add(car.root);car.doors.forEach(({pivot})=>pivot.rotation.set(0,0,0));car.wireMaterials.forEach(material=>material.opacity=0);car.sectionMaterial.opacity=0;car.plumeMaterial.uniforms.uOpacity.value=0
    car.sections.visible=false;car.wireObjects.forEach(object=>object.visible=false)
    $('#experience').dataset.mode='drive';$('#drive-hud').hidden=false
    $('#drive-toggle').setAttribute('aria-pressed','true');$('#drive-toggle').setAttribute('aria-label','salir del modo de conducción');$('#drive-toggle').textContent='salir de pov'
    $('#viewport').setAttribute('tabindex','0');$('#viewport').setAttribute('aria-describedby','drive-instructions');$('#viewport').focus()
    renderer.setClearColor(0xa4b5bd);renderer.toneMappingExposure=.95
    resize();reset();audio.setDriving(true)
    try{if(!hasDriven)await audio.setEnabled(true)}catch{$('#drive-message').textContent='pulsa sonido para activar el audio'}
    hasDriven=true
    $('#drive-pause').setAttribute('aria-pressed','false');$('#drive-pause').textContent='pausa'
    raf=requestAnimationFrame(tick)
  }
  function exit() {
    if(!active)return
    active=false;cancelAnimationFrame(raf);clearInput();audio.setDriving(false)
    studio.add(car.root);car.root.position.set(0,0,0);car.root.rotation.set(0,0,0);car.wheelCenters.forEach(wheel=>wheel.rotation.set(0,0,0));if(car.steering)car.steering.rotation.set(0,0,0);car.seats?.forEach(seat=>seat.visible=true);if(car.liftPlumeMaterial)car.liftPlumeMaterial.uniforms.uOpacity.value=0
    $('#experience').dataset.mode='studio';$('#drive-hud').hidden=true;$('#drive-toggle').setAttribute('aria-pressed','false');$('#drive-toggle').setAttribute('aria-label','iniciar conducción en pov');$('#drive-toggle').textContent='conducir ↗'
    $('#viewport').removeAttribute('tabindex');$('#viewport').removeAttribute('aria-describedby');$('#drive-toggle').focus()
    renderer.setClearColor(0x080a0c);renderer.toneMappingExposure=1.15;onExit()
  }
  function keydown(event) {
    if(!active||isScreenOpen()||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return
    if(event.code==='Escape'){event.preventDefault();exit();return}
    if(event.repeat&&!heldKeys.has(event.code))return
    if(heldKeys.has(event.code)){
      if(event.code==='Space'&&event.target.tagName==='BUTTON')return
      event.preventDefault();keys.add(event.code)
    }
    if(event.code==='KeyC')cameraMode()
    if(event.code==='Digit1')cameraMode(false)
    if(event.code==='Digit3')cameraMode(true)
    if(event.code==='KeyP')pause()
    if(event.code==='KeyT')reset()
    if(event.code==='KeyR')reverse()
    if(event.code==='KeyM')audio.toggle()
    if(event.code==='KeyN'){reset('stunts');notice='pista de saltos / shift: empuje / espacio: elevación'}
    if(event.code==='KeyG'){reset('loop');notice='loop de exhibición / q: succión / w: avanzar'}
    if(event.code==='KeyV'){reset('semi');notice='salto sobre camión / shift: empuje / espacio: elevación'}
    if(event.code==='KeyB'){reset('circuit');notice='circuito / h: controles en la pantalla'}
    if(event.code==='KeyQ'){state.suction=!state.suction;notice=state.suction?'succión activa':'succión desactivada'}
    if(event.code==='KeyF'){state.augment=augments[(augments.indexOf(state.augment)+1)%augments.length];notice=state.augment+' / configuración de simulación';state.boost=0;state.lift=0}
  }
  addEventListener('keydown',keydown);addEventListener('keyup',event=>keys.delete(event.code));addEventListener('blur',()=>{if(active)pause(true)})
  document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)pause(true)})
  $('#drive-camera').addEventListener('click',cameraMode);$('#drive-pause').addEventListener('click',()=>pause());$('#drive-reset').addEventListener('click',reset);$('#drive-gear').addEventListener('click',reverse)
  $('#drive-sound').addEventListener('click',()=>audio.toggle())
  const touchBindings=[['drive-throttle','throttle'],['drive-brake','brake'],['drive-left','left'],['drive-right','right']]
  touchBindings.forEach(([id,name])=>{
    const button=$('#'+id)
    button.addEventListener('pointerdown',event=>{if(!active||paused)return;event.preventDefault();touch[name]=1;button.classList.add('is-held');button.setPointerCapture(event.pointerId)})
    const release=()=>{touch[name]=0;button.classList.remove('is-held')}
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release)
    button.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter'){event.preventDefault();touch[name]=1;button.classList.add('is-held')}})
    button.addEventListener('keyup',event=>{if(event.code==='Space'||event.code==='Enter')release()});button.addEventListener('blur',release)
  })
  $('#viewport').addEventListener('pointerdown',event=>{if(!active)return;dragging=true;dragX=event.clientX;dragY=event.clientY;$('#viewport').setPointerCapture(event.pointerId)})
  $('#viewport').addEventListener('pointermove',event=>{if(!active||!dragging)return;const limit=exterior?Math.PI:.85;headYaw=THREE.MathUtils.clamp(headYaw+(event.clientX-dragX)*.004,-limit,limit);headPitch=THREE.MathUtils.clamp(headPitch-(event.clientY-dragY)*.003,-.2,.25);dragX=event.clientX;dragY=event.clientY;if(paused)draw(0)})
  $('#viewport').addEventListener('pointerup',()=>dragging=false);$('#viewport').addEventListener('pointercancel',()=>dragging=false)
  lastControls=$('#drive-instructions').textContent
  $('#viewport').addEventListener('focus',()=>{if(active)$('#drive-instructions').textContent=lastControls})
  return {get active(){return active},get camera(){return camera},get screenVisible(){return !exterior||screenFocus},get telemetry(){return {...state,active,paused,notice,area}},focusScreen(value){if(value){previousExterior=exterior;screenFocus=true}else{screenFocus=false;exterior=previousExterior}viewReady=false;draw(0)},pause,reset,enter,exit,resize}
}
