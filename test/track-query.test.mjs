import test from 'node:test'
import assert from 'node:assert/strict'
import {createTrackQuery} from '../src/track-query.js'

const points=Array.from({length:1101},(_,i)=>({x:Math.cos(i/1100*Math.PI*2)*260,z:Math.sin(i/1100*Math.PI*2)*190}))
const normals=points.map(point=>({x:point.x/260,z:point.z/190}))
const query=createTrackQuery(points,normals)
test('el índice devuelve la misma muestra que la búsqueda completa',()=>{
  for(let i=0;i<1800;i++){
    const x=Math.sin(i*19.31)*400,z=Math.cos(i*8.71)*330
    let best=Infinity,index=0
    for(let j=0;j<points.length;j+=2){const d=(points[j].x-x)**2+(points[j].z-z)**2;if(d<best){best=d;index=j}}
    assert.equal(query(x,z).index,index)
    assert.equal(query(x,z).distance,Math.sqrt(best))
    assert.equal(query(x,z).normal,normals[index])
  }
})
test('las consultas repetidas reutilizan el resultado sin alterar puntos',()=>{
  const first=query(0,0)
  assert.equal(query(0,0),first)
  assert.equal(query(points[100].x,points[100].z).distance,0)
  assert.equal(query(100000,-100000).index>=0,true)
  assert.throws(()=>createTrackQuery([],[]))
})
test('los empates conservan el primer índice del trazado',()=>{
  const tied=createTrackQuery([{x:-1,z:0},{x:99,z:99},{x:1,z:0}],[null,null,null])
  assert.equal(tied(0,0).index,0)
  assert.throws(()=>createTrackQuery(points,normals,{stride:.5}))
})
