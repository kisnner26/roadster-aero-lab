import test from 'node:test'
import assert from 'node:assert/strict'
import {createRoadster} from '../src/roadster.js'

const context={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},arc(){}}
const car=createRoadster({createCanvas:()=>({width:0,height:0,getContext:()=>context})})

test('las dos pieles exteriores de las puertas tienen normales hacia fuera',()=>{
  for(const {pivot,sign} of car.doors){
    const outer=pivot.children.find(object=>object.material===car.paint)
    const normals=outer.geometry.attributes.normal
    for(let i=0;i<normals.count;i++)assert.ok(normals.getZ(i)*sign>0)
  }
})
test('cristales y chorros no proyectan sombras opacas ni consumen pases ocultos',()=>{
  assert.equal(car.exhaust.visible,false)
  assert.equal(car.sections.visible,false)
  assert.ok(car.wireObjects.every(object=>!object.visible))
  car.root.traverse(object=>{if(object.isMesh&&(object.material===car.glass||object.material.isShaderMaterial))assert.equal(object.castShadow,false)})
})
