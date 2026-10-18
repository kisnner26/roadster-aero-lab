import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

export function createParkedCars(car,vehicles) {
  const root=new THREE.Group(),buckets=new Map()
  car.root.updateWorldMatrix(true,true)
  const inverse=car.root.matrixWorld.clone().invert(),relative=new THREE.Matrix4()
  car.root.traverseVisible(object=>{
    if(!object.isMesh||object.material.isShaderMaterial)return
    const material=object.material
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone()
    relative.multiplyMatrices(inverse,object.matrixWorld);geometry.applyMatrix4(relative);geometry.clearGroups()
    if(!material.map)geometry.deleteAttribute('uv')
    if(!buckets.has(material))buckets.set(material,[])
    buckets.get(material).push(geometry)
  })
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI),scale=new THREE.Vector3(1,1,1)
  for(const [source,parts] of buckets){
    const geometry=mergeGeometries(parts,false)
    if(!geometry)throw Error('no se pudo agrupar la geometría de los coches estáticos')
    parts.forEach(part=>part.dispose())
    const material=source===car.brakeLight?source.clone():source
    const instances=new THREE.InstancedMesh(geometry,material,vehicles.length)
    vehicles.forEach((vehicle,i)=>{matrix.compose(position.set(vehicle.x,.03,vehicle.z),rotation,scale);instances.setMatrixAt(i,matrix)})
    instances.castShadow=!material.transparent;instances.receiveShadow=true;instances.matrixAutoUpdate=false
    instances.computeBoundingBox();instances.computeBoundingSphere();root.add(instances)
  }
  return root
}
