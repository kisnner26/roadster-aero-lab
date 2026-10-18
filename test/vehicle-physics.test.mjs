import test from 'node:test'
import assert from 'node:assert/strict'
import {createVehicleState,stepVehicle,stepVertical,vehicleConfig} from '../src/vehicle-physics.js'
import {stuntSurface,collideStuntVehicles,stepExhibitionLoop,stuntLoop} from '../src/stunt-physics.js'

function run(state,input,seconds,surface=0) {
  for(let i=0;i<seconds*120;i++)stepVehicle(state,input,1/120,surface)
  return state
}

test('un coche detenido no rueda ni gira por sí solo',()=>{
  const state=run(createVehicleState(),{steer:1},10)
  assert.equal(state.speed,0);assert.equal(state.x,0);assert.equal(state.z,0);assert.equal(state.heading,0)
})
test('el acelerador aumenta velocidad y la resistencia limita la velocidad',()=>{
  const state=run(createVehicleState(),{throttle:1},8)
  assert.ok(state.speed>20);assert.ok(state.x>50)
  run(state,{throttle:1},120)
  assert.ok(state.speed<=vehicleConfig.maxSpeed);assert.ok(Number.isFinite(state.x))
})
test('frenar hasta parar no cambia a reversa, incluso pisando ambos pedales',()=>{
  const state=run(createVehicleState(),{throttle:1},8)
  run(state,{brake:1,throttle:1},15)
  assert.equal(state.speed,0);assert.equal(state.vx,0);assert.equal(state.vz,0)
})
test('la regeneración y la grava reducen la velocidad',()=>{
  const road=run(createVehicleState(),{throttle:1},6),grass={...road}
  const before=road.speed
  run(road,{},2);run(grass,{},2,9)
  assert.ok(road.speed<before);assert.ok(grass.speed<road.speed)
})
test('la dirección cambia el rumbo respetando el límite de agarre',()=>{
  const state=createVehicleState();state.speed=50;state.vx=50
  run(state,{throttle:1,steer:1},3)
  assert.ok(state.heading>0);assert.ok(state.z>0)
  assert.ok(Math.abs(state.lateral)<=state.gripLimit+1e-8)
})
test('la reversa tiene sentido opuesto y un límite de velocidad separado',()=>{
  const state=createVehicleState();state.gear=-1
  run(state,{throttle:1},15)
  assert.ok(state.x<0);assert.ok(state.speed<0);assert.ok(state.speed>=-vehicleConfig.reverseLimit)
})
test('la grava limita tanto la aceleración como la frenada',()=>{
  const road=run(createVehicleState(),{throttle:1},3),grass=run(createVehicleState(),{throttle:1},3,12)
  assert.ok(grass.speed<road.speed)
  const asphaltBrake=createVehicleState(),gravelBrake=createVehicleState()
  asphaltBrake.speed=gravelBrake.speed=20
  run(asphaltBrake,{brake:1},1);run(gravelBrake,{brake:1},1,12)
  assert.ok(gravelBrake.speed>asphaltBrake.speed)
})

test('la simulación acelera a 60 mph en los rangos objetivo de cada modo',()=>{
  const times={}
  for(const mode of ['performance','thrust','rocket']){
    const state=createVehicleState();state.augment=mode;let time=0
    while(state.speed<26.8224&&time<5){stepVehicle(state,{throttle:1,boost:true},1/120);time+=1/120}
    times[mode]=time
  }
  assert.ok(times.performance>1.4&&times.performance<1.7)
  assert.ok(times.thrust>.7&&times.thrust<1)
  assert.ok(times.rocket>.5&&times.rocket<.7)
})
test('el aire es finito y performance no habilita propulsores',()=>{
  const state=createVehicleState();run(state,{throttle:1,boost:true},7)
  assert.equal(state.air,0);assert.equal(state.boost,0)
  const basic=createVehicleState();basic.augment='performance';run(basic,{boost:true,lift:true},2)
  assert.equal(basic.boost,0);assert.equal(basic.lift,0);assert.equal(basic.air,vehicleConfig.airCapacity)
})
test('rocket despega y vuelve a tierra por gravedad al soltar elevación',()=>{
  const state=createVehicleState()
  for(let i=0;i<120;i++){stepVehicle(state,{lift:true},1/120);stepVertical(state,{},1/120)}
  assert.equal(state.grounded,false);assert.ok(state.y>5)
  for(let i=0;i<700;i++){stepVehicle(state,{},1/120);stepVertical(state,{},1/120)}
  assert.equal(state.grounded,true);assert.equal(state.y,.028);assert.equal(state.vy,0)
})
test('una rampa lanza el coche sin necesitar elevación',()=>{
  const state=createVehicleState(931,0,0);state.speed=50;state.vx=50;state.y=stuntSurface(931,0).height;state.vy=50*6/32
  for(let i=0;i<18;i++){stepVehicle(state,{},1/120);stepVertical(state,{},1/120,stuntSurface(state.x,state.z,state.heading))}
  assert.equal(state.grounded,false);assert.ok(state.y>6);assert.ok(state.vy>0)
})
test('la altura permite superar vehículos pero no atravesarlos',()=>{
  const low=createVehicleState(960,0,0);low.speed=25;collideStuntVehicles(low);assert.equal(low.crashed,true);assert.ok(low.speed<5)
  const high=createVehicleState(960,0,0);high.y=4;high.speed=25;collideStuntVehicles(high);assert.equal(high.crashed,false);assert.equal(high.speed,25)
})
test('el límite de velocidad también se respeta durante el vuelo',()=>{
  const state=createVehicleState();state.grounded=false;state.speed=110;state.vx=110
  run(state,{boost:true},3)
  assert.ok(Math.hypot(state.vx,state.vz)<=vehicleConfig.maxSpeed+1e-8)
})
test('la pasada completa supera cinco coches y aterriza sin colisión',()=>{
  const state=createVehicleState(800,0,0)
  for(let i=0;i<7.2*120;i++){stepVehicle(state,{throttle:1},1/120);stepVertical(state,{},1/120,stuntSurface(state.x,state.z,state.heading));collideStuntVehicles(state)}
  assert.equal(state.cleared,5);assert.equal(state.grounded,true);assert.equal(state.crashed,false);assert.ok(state.speed>40)
})
test('la rampa curva aumenta altura e inclinación progresivamente',()=>{
  const start=stuntSurface(1121,-30),end=stuntSurface(1143,-30)
  assert.ok(end.height>start.height+15);assert.ok(end.slope>start.slope)
})
test('desactivar succión reduce el agarre sin crear tracción infinita',()=>{
  const active=createVehicleState(),passive=createVehicleState();passive.suction=false
  run(active,{throttle:1,steer:.5},2);run(passive,{throttle:1,steer:.5},2)
  assert.ok(active.gripLimit>passive.gripLimit);assert.ok(Math.abs(active.lateral)<=active.gripLimit+1e-8)
})
test('la recta permite alcanzar el límite de juego sin excederlo',()=>{
  const state=run(createVehicleState(),{throttle:1},45)
  assert.ok(state.speed>111);assert.ok(state.speed<=vehicleConfig.maxSpeed)
})
test('el loop mantiene contacto invertido con succión y lo pierde sin ella a baja velocidad',()=>{
  const active=createVehicleState();active.loopAngle=Math.PI;active.speed=2
  stepExhibitionLoop(active,1/120);assert.equal(active.grounded,true);assert.ok(active.y>35)
  const passive=createVehicleState();passive.loopAngle=Math.PI;passive.speed=2;passive.suction=false
  stepExhibitionLoop(passive,1/120);assert.equal(passive.grounded,false);assert.equal(passive.loopAngle,null)
})

test('un coche que se detiene en la subida del loop sale de la pista en vez de quedar colgado', () => {
  const state = createVehicleState(stuntLoop.x, stuntLoop.z, 0)
  state.speed = 12
  state.suction = true
  for (let i = 0; i < 120 * 10; i++) if (!stepExhibitionLoop(state, 1 / 120)) break
  assert.equal(state.loopAngle ?? null, null)
  assert.equal(state.grounded, false)
})
