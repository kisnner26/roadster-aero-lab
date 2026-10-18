import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createBoxBatch} from '../src/static-boxes.js'

test('las cajas estáticas comparten geometría y agrupan material y sombras',()=>{
  const root=new THREE.Group(),material=new THREE.MeshBasicMaterial(),batch=createBoxBatch(root)
  for(let i=0;i<330;i++)batch.add([9,.012,.14],[i*20,0,0],material,root,false)
  batch.add([1,2,3],[0,0,0],material)
  const meshes=batch.flush()
  assert.equal(meshes.length,2);assert.equal(meshes[0].count,330)
  assert.equal(meshes[0].geometry,meshes[1].geometry)
  assert.equal(meshes[0].castShadow,false);assert.equal(meshes[1].castShadow,true)
  assert.ok(meshes[0].boundingSphere.radius>0)
})
test('la agrupación conserva posición escala y rotación de grupos anidados',()=>{
  const root=new THREE.Group();root.position.set(10,3,4)
  const parent=new THREE.Group();parent.position.set(2,0,0);parent.rotation.y=Math.PI/2;root.add(parent)
  const batch=createBoxBatch(root),material=new THREE.MeshBasicMaterial()
  batch.add([2,3,4],[1,0,0],material,parent)
  const [mesh]=batch.flush(),matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix)
  const expected=new THREE.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),parent.matrixWorld).multiply(new THREE.Matrix4().compose(new THREE.Vector3(1,0,0),new THREE.Quaternion(),new THREE.Vector3(2,3,4)))
  matrix.elements.forEach((value,i)=>assert.ok(Math.abs(value-expected.elements[i])<1e-6))
  assert.deepEqual(batch.flush(),[])
})
