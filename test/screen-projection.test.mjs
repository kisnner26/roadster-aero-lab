import test from 'node:test'
import assert from 'node:assert/strict'
import {screenHomography} from '../src/screen-projection.js'

test('la superficie dom coincide con las cuatro esquinas del monitor en perspectiva',()=>{
  for(const points of [
    [{x:10,y:20},{x:1034,y:20},{x:1034,y:596},{x:10,y:596}],
    [{x:103,y:80},{x:880,y:105},{x:940,y:610},{x:55,y:580}],
  ]){
    const m=screenHomography(points)
    for(const [i,[x,y]] of [[0,[0,0]],[1,[1024,0]],[2,[1024,576]],[3,[0,576]]]){
      const w=m[3]*x+m[7]*y+m[15]
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/w-points[i].x)<1e-7)
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/w-points[i].y)<1e-7)
    }
  }
})
test('una pantalla degenerada se oculta en lugar de producir una matriz inválida',()=>{
  assert.equal(screenHomography(Array(4).fill({x:0,y:0})),null)
})
