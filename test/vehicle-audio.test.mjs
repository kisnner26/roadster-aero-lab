import test from 'node:test'
import assert from 'node:assert/strict'
import {createVehicleAudio} from '../src/vehicle-audio.js'

function fixture(){
  const pending=[],targets=[]
  const param=()=>({value:0,setTargetAtTime(value){targets.push(value)}})
  const node=()=>({gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),connect(){},start(){}})
  const page={hidden:false,addEventListener(type,callback){this[type]=callback}}
  const context={currentTime:0,sampleRate:8,destination:{},createGain:node,createDynamicsCompressor:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,
    createBuffer(){return {getChannelData:()=>new Float32Array(16)}},
    resume(){return new Promise((resolve,reject)=>pending.push({resolve,reject}))}}
  const changes=[],audio=createVehicleAudio(value=>changes.push(value),{createContext:()=>context,page})
  return {audio,pending,targets,changes,page}
}

test('audio only reports enabled after the context resumes',async()=>{
  const {audio,pending}=fixture(),enable=audio.setEnabled(true)
  assert.equal(audio.enabled,false)
  pending[0].resolve();await enable
  assert.equal(audio.enabled,true)
})

test('muting during resume cannot be undone by an older request',async()=>{
  const {audio,pending,targets}=fixture(),enable=audio.setEnabled(true)
  await audio.setEnabled(false);pending[0].resolve();await enable
  assert.equal(audio.enabled,false);assert.equal(targets.at(-1),0)
})

test('a failed context resume resets the button and permits a retry',async()=>{
  const {audio,pending,changes}=fixture(),enable=audio.setEnabled(true)
  pending[0].reject(new Error('blocked'))
  await assert.rejects(enable,/blocked/)
  assert.equal(audio.enabled,false);assert.equal(changes.at(-1),false)
  const retry=audio.toggle();pending[1].resolve();await retry
  assert.equal(audio.enabled,true)
})

test('rapid toggles retain the latest intent even with out-of-order resumes',async()=>{
  const {audio,pending}=fixture(),first=audio.toggle()
  await audio.toggle()
  const last=audio.toggle()
  pending[1].resolve();await last
  pending[0].reject(new Error('stale'));await first
  assert.equal(audio.enabled,true)
})

test('visibility mutes the master without changing the sound preference',async()=>{
  const {audio,pending,page,targets}=fixture(),enable=audio.setEnabled(true)
  pending[0].resolve();await enable
  page.hidden=true;page.visibilitychange()
  assert.equal(targets.at(-1),0);assert.equal(audio.enabled,true)
  page.hidden=false;page.visibilitychange()
  assert.equal(targets.at(-1),.65)
})
