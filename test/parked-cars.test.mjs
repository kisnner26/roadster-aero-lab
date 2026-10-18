import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createParkedCars} from '../src/parked-cars.js'

test('los coches estáticos agrupan piezas por material sin alterar el modelo móvil',()=>{
  const root=new THREE.Group(),material=new THREE.MeshBasicMaterial(),geometry=new THREE.BoxGeometry(1,1,1)
  const a=new THREE.Mesh(geometry,material),b=new THREE.Mesh(geometry,material);b.position.x=2;root.add(a,b)
  const hidden=new THREE.Group();hidden.visible=false;hidden.add(new THREE.Mesh(geometry,material));root.add(hidden)
  const instances=createParkedCars({root,brakeLight:material},[{x:10,z:0},{x:20,z:5}])
  assert.equal(instances.children.length,1)
  assert.equal(instances.children[0].count,2)
  assert.equal(instances.children[0].geometry.attributes.position.count,72)
  assert.notEqual(instances.children[0].material,material)
  assert.equal(geometry.attributes.position.count,24)
  assert.equal(b.position.x,2)
  const matrix=new THREE.Matrix4();instances.children[0].getMatrixAt(1,matrix)
  assert.equal(matrix.elements[12],20);assert.equal(matrix.elements[14],5)
})
