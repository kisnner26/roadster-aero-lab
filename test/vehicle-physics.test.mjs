import test from 'node:test'
import assert from 'node:assert/strict'
import {createVehicleState,stepVehicle,vehicleConfig} from '../src/vehicle-physics.js'

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
  assert.ok(Math.abs(state.lateral)<vehicleConfig.grip*1.06)
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
