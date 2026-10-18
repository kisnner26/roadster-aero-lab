import test from 'node:test'
import assert from 'node:assert/strict'
import {createGamepadInput,steeringAxis} from '../src/gamepad-input.js'

const pad=()=>({mapping:'standard',connected:true,axes:[0],buttons:Array.from({length:8},()=>({value:0,pressed:false}))})

test('steering remaps the deadzone continuously and sanitizes invalid values',()=>{
  assert.equal(steeringAxis(.12),0)
  assert.ok(steeringAxis(.121)<.002)
  assert.ok(Math.abs(steeringAxis(.56)-.5)<1e-12)
  assert.equal(steeringAxis(-2),-1)
  assert.equal(steeringAxis(NaN),0)
})

test('finds a standard controller outside slot zero and reuses the sample',()=>{
  const input=createGamepadInput(),controller=pad(),pads=[null,null,controller]
  const first=input.read(pads)
  controller.buttons[7].value=.7;controller.axes[0]=1
  const next=input.read(pads)
  assert.equal(next,first);assert.equal(next.throttle,.7);assert.equal(next.steer,1)
})

test('held controls must be released before arming and after reset',()=>{
  const input=createGamepadInput(),controller=pad(),pads=[controller]
  controller.buttons[7].value=1
  assert.equal(input.read(pads).throttle,0)
  controller.buttons[7].value=0;input.read(pads)
  controller.buttons[7].value=1;assert.equal(input.read(pads).throttle,1)
  input.reset();assert.equal(input.read(pads).throttle,0)
})

test('disconnect clears all controls and reports loss before accepting another pad',()=>{
  const input=createGamepadInput(),controller=pad(),pads=[controller,pad()]
  input.read(pads);controller.buttons[0].pressed=true
  assert.equal(input.read(pads).boost,true)
  pads[0]=null
  assert.deepEqual(input.read(pads),{throttle:0,brake:0,steer:0,boost:false,lift:false,disconnected:true})
  assert.equal(input.read(pads).disconnected,false)
})

test('unknown mappings are ignored and malformed axes/buttons are safe',()=>{
  const input=createGamepadInput()
  assert.equal(input.read([{mapping:'',axes:[1]}]).steer,0)
  const controller={mapping:'standard',axes:[],buttons:[]}
  input.read([controller]);assert.equal(input.read([controller]).throttle,0)
  controller.buttons[7]={value:Infinity};controller.axes[0]=NaN
  assert.equal(input.read([controller]).throttle,0)
})
