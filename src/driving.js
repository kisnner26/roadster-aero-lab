import * as THREE from 'three'
import {createDrivingWorld} from './driving-world.js'
import {createVehicleState,stepVehicle,vehicleConfig} from './vehicle-physics.js'

const $=selector=>document.querySelector(selector)
const heldKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'])

export function createDrivingMode({renderer,studio,car,audio,onExit,reducedMotion=false}) {
  const worldScene=new THREE.Scene();worldScene.environment=studio.environment
  const world=createDrivingWorld(worldScene)
  const camera=new THREE.PerspectiveCamera(74,1,.025,2200)
  const keys=new Set(),touch={throttle:0,brake:0,left:0,right:0}
  const cameraPosition=new THREE.Vector3(),lookAt=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),desiredTarget=new THREE.Vector3()
  let active=false,paused=false,exterior=false,raf=0,last=0,accumulator=0,state=createVehicleState(),lap=1,lastProgress=0,lapTime=0,dashTimer=0,viewReady=false
  let headYaw=0,headPitch=0,dragging=false,dragX=0,dragY=0,rideHeight=.028,hasDriven=false
  let lastControls=''
  $('#drive-map-track').setAttribute('d',world.mapPath)

  function clearInput() {
    keys.clear();Object.keys(touch).forEach(key=>touch[key]=0)
    document.querySelectorAll('.is-held').forEach(button=>button.classList.remove('is-held'))
    dragging=false
  }
  function reset() {
    clearInput()
    const p=world.curve.getPointAt(0),t=world.curve.getTangentAt(0),n=new THREE.Vector3(-t.z,0,t.x)
    state=createVehicleState(p.x+n.x*3,p.z+n.z*3,Math.atan2(t.z,t.x))
    lap=1;lapTime=0;lastProgress=0;headYaw=0;headPitch=0;accumulator=0;viewReady=false
    $('#drive-message').textContent='simulación de conducción / parámetros ilustrativos'
    draw(0)
  }
  function resize() {
    camera.aspect=$('#experience').clientWidth/$('#experience').clientHeight
    camera.updateProjectionMatrix()
    if(active)draw(0)
  }
  function cameraMode() {
    exterior=!exterior;viewReady=false
    $('#drive-view-label').textContent=exterior?'chase camera':'cockpit pov'
    $('#drive-camera').setAttribute('aria-label',exterior?'cambiar a cámara pov':'cambiar a cámara exterior')
    if(active)draw(0)
  }
  function reverse() {
    if(Math.abs(state.speed)>.5){$('#drive-message').textContent='frena hasta detenerte para cambiar de marcha';return}
    state.gear*=-1;$('#drive-message').textContent=state.gear===1?'avance seleccionado':'reversa seleccionada';draw(0)
  }
  function pause(value=!paused) {
    paused=value;clearInput();audio.update({speed:0,throttle:0,slip:0})
    $('#drive-pause').setAttribute('aria-pressed',String(paused))
    $('#drive-pause').replaceChildren(document.createTextNode(paused?'continuar':'pausa'))
    cancelAnimationFrame(raf);last=0;accumulator=0
    if(active&&!paused&&!document.hidden)raf=requestAnimationFrame(tick)
  }
  function drawDashboard() {
    const texture=car.screenTexture
    if(!texture)return
    const ctx=texture.image.getContext('2d'),speed=Math.round(Math.abs(state.speed)*3.6)
    ctx.fillStyle='#0b1118';ctx.fillRect(0,0,512,288)
    ctx.fillStyle='#c0cbd4';ctx.font='17px monospace';ctx.fillText('roadster / driving lab',24,35)
    ctx.fillStyle='#f2f5f6';ctx.font='100px sans-serif';ctx.fillText(String(speed),26,158)
    ctx.font='17px monospace';ctx.fillStyle='#93a8b8';ctx.fillText('km/h',28,190)
    ctx.fillStyle='#eaeef1';ctx.font='32px monospace';ctx.fillText(state.gear===1?'d':'r',443,80)
    ctx.strokeStyle='#9db4c1';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(315,201);ctx.lineTo(348,77);ctx.moveTo(437,201);ctx.lineTo(405,77);ctx.stroke()
    ctx.strokeStyle='#f1513b';ctx.lineWidth=2;ctx.strokeRect(364,157,27,45)
    ctx.fillStyle='#36424d';ctx.fillRect(26,240,460,4);ctx.fillStyle=state.brake?'#ff593f':'#d9e6ee';ctx.fillRect(26,240,460*Math.max(state.throttle,state.brake),4)
    ctx.font='13px monospace';ctx.fillStyle='#96adbd';ctx.fillText(state.offroad?'surface / gravel':'surface / asphalt',26,272)
    texture.needsUpdate=true
  }
  function draw(dt) {
    const nearest=world.nearest(state.x,state.z)
    world.update(state.x,state.z)
    const bump=reducedMotion?0:Math.sin(state.distance*2.3)*Math.min(.007,Math.abs(state.speed)*.00013)*(state.offroad?3:1)
    const surfaceHeight=nearest.distance<7.4?.028:nearest.distance<9?-.008:world.heightAt(state.x,state.z)+.006
    rideHeight=THREE.MathUtils.lerp(rideHeight,surfaceHeight,dt===0?1:1-Math.exp(-dt*14))
    car.root.position.set(state.x,rideHeight+bump,state.z)
    car.root.rotation.set(reducedMotion?0:-state.lateral*.004,Math.PI-state.heading,reducedMotion?0:-state.acceleration*.0025)
    car.wheels.visible=true
    car.wheelCenters.forEach(wheel=>{wheel.rotation.y=wheel.position.x<0?-state.steer:0;wheel.rotation.z=state.distance/vehicleConfig.wheelRadius})
    if(car.steering)car.steering.rotation.x=-state.steer*7
    car.wing.position.y=-.19+Math.min(.19,Math.abs(state.speed)/60*.19)+state.brake*.055
    car.root.updateMatrixWorld(true)
    const mobile=camera.aspect<.85
    if(exterior){desiredCamera.set(6.7,2.55,0);desiredTarget.set(-4,.64,0)}
    else {
      desiredCamera.set(.025,.99,.335)
      const yaw=headYaw,pitch=headPitch
      desiredTarget.set(.025-Math.cos(yaw)*8,.94+Math.sin(pitch)*8,.335+Math.sin(yaw)*8)
    }
    desiredCamera.applyMatrix4(car.root.matrixWorld);desiredTarget.applyMatrix4(car.root.matrixWorld)
    const factor=!viewReady||!exterior?1:1-Math.exp(-dt*7)
    cameraPosition.lerp(desiredCamera,factor);lookAt.lerp(desiredTarget,factor)
    camera.position.copy(cameraPosition);camera.lookAt(lookAt)
    camera.fov=(exterior?62:mobile?87:75)+(reducedMotion?0:Math.min(7,Math.abs(state.speed)*.1));camera.updateProjectionMatrix()
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
    if(dashTimer>.09||dt===0){drawDashboard();dashTimer=0}
    renderer.render(worldScene,camera)
  }
  function tick(stamp) {
    if(!active||paused||document.hidden)return
    const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;accumulator+=dt
    const input={throttle:Math.max(touch.throttle,keys.has('KeyW')||keys.has('ArrowUp')?1:0),brake:Math.max(touch.brake,keys.has('KeyS')||keys.has('ArrowDown')?1:0),steer:(touch.right||keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(touch.left||keys.has('KeyA')||keys.has('ArrowLeft')?1:0),handbrake:keys.has('Space')}
    while(accumulator>=1/120){stepVehicle(state,input,1/120,world.nearest(state.x,state.z).distance);world.collision(state);accumulator-=1/120;lapTime+=1/120}
    if(!dragging){headYaw*=Math.exp(-dt*3);headPitch*=Math.exp(-dt*3)}
    audio.update(state);draw(dt);raf=requestAnimationFrame(tick)
  }
  async function enter() {
    active=true;paused=false;exterior=false;last=0;accumulator=0
    worldScene.add(car.root);car.doors.forEach(({pivot})=>pivot.rotation.set(0,0,0));car.wireMaterials.forEach(material=>material.opacity=0);car.sectionMaterial.opacity=0;car.plumeMaterial.uniforms.uOpacity.value=0
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
    studio.add(car.root);car.root.position.set(0,0,0);car.root.rotation.set(0,0,0);car.wheelCenters.forEach(wheel=>wheel.rotation.set(0,0,0));if(car.steering)car.steering.rotation.set(0,0,0)
    $('#experience').dataset.mode='studio';$('#drive-hud').hidden=true;$('#drive-toggle').setAttribute('aria-pressed','false');$('#drive-toggle').setAttribute('aria-label','iniciar conducción en pov');$('#drive-toggle').textContent='conducir ↗'
    $('#viewport').removeAttribute('tabindex');$('#viewport').removeAttribute('aria-describedby');$('#drive-toggle').focus()
    renderer.setClearColor(0x080a0c);renderer.toneMappingExposure=1.15;onExit()
  }
  function keydown(event) {
    if(!active||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return
    if(event.code==='Escape'){event.preventDefault();exit();return}
    if(event.repeat&&!heldKeys.has(event.code))return
    if(heldKeys.has(event.code)){
      if(event.code==='Space'&&event.target.tagName==='BUTTON')return
      event.preventDefault();keys.add(event.code)
    }
    if(event.code==='KeyC')cameraMode()
    if(event.code==='KeyP')pause()
    if(event.code==='KeyT')reset()
    if(event.code==='KeyR')reverse()
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
  $('#viewport').addEventListener('pointermove',event=>{if(!active||!dragging)return;headYaw=THREE.MathUtils.clamp(headYaw+(event.clientX-dragX)*.004,-.85,.85);headPitch=THREE.MathUtils.clamp(headPitch-(event.clientY-dragY)*.003,-.2,.25);dragX=event.clientX;dragY=event.clientY})
  $('#viewport').addEventListener('pointerup',()=>dragging=false);$('#viewport').addEventListener('pointercancel',()=>dragging=false)
  lastControls=$('#drive-instructions').textContent
  $('#viewport').addEventListener('focus',()=>{if(active)$('#drive-instructions').textContent=lastControls})
  return {get active(){return active},enter,exit,resize}
}
