import * as THREE from 'three'

let circuit
export function createCircuit() {
  if(circuit)return circuit
  const curve=new THREE.CatmullRomCurve3([[-235,0,-110],[-115,0,-205],[115,0,-185],[255,0,-65],[220,0,115],[65,0,210],[-145,0,155],[-270,0,25]].map(p=>new THREE.Vector3(...p)),true,'catmullrom',.35)
  const points=curve.getSpacedPoints(1100),length=curve.getLength()
  const normals=points.map((_,i)=>{const tangent=curve.getTangentAt(i/(points.length-1));return new THREE.Vector3(-tangent.z,0,tangent.x).normalize()})
  const mapPath=points.filter((_,i)=>i%8===0).map((p,i)=>`${i?'L':'M'}${(p.x+300)/600*160},${(p.z+240)/480*118}`).join(' ')+'Z'
  circuit={curve,points,normals,length,mapPath}
  return circuit
}
