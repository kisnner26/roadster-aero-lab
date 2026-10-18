import test from 'node:test'
import assert from 'node:assert/strict'
import {vehicleVisualTargets} from '../src/vehicle-visuals.js'

test('la frenada y la regeneración encienden luces sin depender del acelerador',()=>{
  const idle=vehicleVisualTargets({speed:0,brake:0,throttle:0,grounded:true,gear:1})
  const regen=vehicleVisualTargets({speed:30,brake:0,throttle:0,grounded:true,gear:1})
  const braking=vehicleVisualTargets({speed:30,brake:1,throttle:1,grounded:true,gear:1})
  assert.ok(idle.brakeLight<regen.brakeLight&&regen.brakeLight<braking.brakeLight)
  assert.equal(braking.wingPitch,-.16)
  assert.equal(vehicleVisualTargets({speed:0,gear:-1}).reverse,true)
})
test('el alerón alcanza un límite finito y no varía con el signo de velocidad',()=>{
  assert.equal(vehicleVisualTargets({speed:400,brake:0}).wingHeight,0)
  assert.equal(vehicleVisualTargets({speed:-60}).wingHeight,vehicleVisualTargets({speed:60}).wingHeight)
})
