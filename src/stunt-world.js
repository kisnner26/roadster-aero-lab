import * as THREE from 'three'
import {stuntRamps,stuntVehicles,stuntLoop} from './stunt-physics.js'
import {createBoxBatch} from './static-boxes.js'

export function createStuntWorld(scene,roadMaterial,car,terrainMaterial,heightAt) {
  const root=new THREE.Group();scene.add(root)
  const landscape=new THREE.PlaneGeometry(4600,2200,150,80);landscape.rotateX(-Math.PI/2)
  const vertices=landscape.attributes.position
  const colors=[]
  for(let i=0;i<vertices.count;i++){const x=vertices.getX(i)+1800,z=vertices.getZ(i);vertices.setXYZ(i,x,heightAt(x,z)-.01,z)}
  for(let i=0;i<vertices.count;i++)colors.push(.5,.54,.43)
  landscape.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  landscape.computeVertexNormals();const ground=new THREE.Mesh(landscape,terrainMaterial);ground.receiveShadow=true;root.add(ground)
  const asphalt=roadMaterial.clone();asphalt.map=roadMaterial.map.clone();asphalt.map.repeat.set(3,90);asphalt.map.needsUpdate=true
  const concrete=new THREE.MeshStandardMaterial({color:0x87918e,roughness:.9}),black=new THREE.MeshStandardMaterial({color:0x10171c,roughness:.7}),white=new THREE.MeshStandardMaterial({color:0xd3d9d9,metalness:.45,roughness:.3}),glass=new THREE.MeshStandardMaterial({color:0x16202a,metalness:.5,roughness:.2}),red=new THREE.MeshBasicMaterial({color:0xef332e})
  const boxes=createBoxBatch(root)
  const box=(size,position,material,parent=root,castShadow=true)=>boxes.add(size,position,material,parent,castShadow)
  box([2400,.1,240],[1700,-.065,0],concrete,root,false)
  const road=new THREE.Mesh(new THREE.PlaneGeometry(2200,148),asphalt);road.rotation.x=-Math.PI/2;road.position.set(1700,.02,8);road.receiveShadow=true;root.add(road)
  for(let i=0;i<110;i++)for(const z of [-29,15,51])box([9,.012,.14],[620+i*20,.037,z],white,root,false)
  for(const ramp of stuntRamps){
    const geometry=new THREE.BufferGeometry(),positions=[],indices=[]
    for(let i=0;i<=32;i++){const t=i/32,height=ramp.height*(ramp.landing?1-t:ramp.curved?t*t:t);for(const side of [-1,1])positions.push(ramp.x+t*ramp.length,.025+height,ramp.z+side*ramp.width/2);if(i<32){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}}
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
    const surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x333e46,roughness:.7,side:THREE.DoubleSide}));surface.receiveShadow=true;root.add(surface)
    for(const side of [-1,1]){
      const points=Array.from({length:33},(_,i)=>{const t=i/32;return new THREE.Vector3(ramp.x+t*ramp.length,.1+ramp.height*(ramp.landing?1-t:ramp.curved?t*t:t),ramp.z+side*ramp.width/2)})
      root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.07,5,false),red))
    }
    for(let i=2;i<ramp.length;i+=4){const t=i/ramp.length,h=ramp.height*(ramp.landing?1-t:ramp.curved?t*t:t);box([.15,h,ramp.width-.4],[ramp.x+i,h/2,ramp.z],black)}
  }
  const parkedCars=stuntVehicles.filter(vehicle=>vehicle.id!==5)
  car.root.updateWorldMatrix(true,true)
  car.root.traverse(object=>{
    if(!object.isMesh||object.material===car.plumeMaterial||object.material===car.liftPlumeMaterial)return
    if(!object.visible||object.parent===car.reverseLights)return
    const material=object.material===car.brakeLight?object.material.clone():object.material
    const instances=new THREE.InstancedMesh(object.geometry,material,parkedCars.length),transform=new THREE.Matrix4(),pose=new THREE.Matrix4(),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI)
    parkedCars.forEach((vehicle,i)=>{pose.compose(new THREE.Vector3(vehicle.x,.03,vehicle.z),rotation,new THREE.Vector3(1,1,1));transform.multiplyMatrices(pose,object.matrixWorld);instances.setMatrixAt(i,transform)})
    instances.castShadow=true;instances.receiveShadow=true;root.add(instances)
  })
  for(const vehicle of stuntVehicles.filter(vehicle=>vehicle.id===5)){
    const group=new THREE.Group();group.position.set(vehicle.x,.03,vehicle.z);root.add(group)
    const truck=vehicle.id===5
    box([vehicle.length,vehicle.height*.52,vehicle.width],[0,vehicle.height*.36,0],white,group)
    box([truck?vehicle.length*.55:vehicle.length*.48,vehicle.height*.38,vehicle.width*.83],[truck?-2:0,vehicle.height*.78,0],glass,group)
    if(truck)box([11,3.6,2.7],[2.6,2,0],white,group)
    for(const x of [-vehicle.length*.32,vehicle.length*.32])for(const side of [-1,1]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(truck?.55:.34,truck?.55:.34,.26,20),black);wheel.rotation.x=Math.PI/2;wheel.position.set(x,truck?.55:.34,side*vehicle.width*.5);group.add(wheel)
    }
    box([.03,.06,vehicle.width*.84],[vehicle.length/2+.02,vehicle.height*.5,0],red,group)
  }
  function sign(text,x,z) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256
    const c=canvas.getContext('2d');c.fillStyle='#0d151b';c.fillRect(0,0,1024,256);c.fillStyle='#d9e1e5';c.font='500 62px monospace';c.fillText(text,45,110);c.fillStyle='#ff6348';c.font='28px monospace';c.fillText('closed course / simulation',45,185)
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(16,4),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,4,z);mesh.rotation.y=-Math.PI/2;root.add(mesh)
    for(const side of [-1,1])box([.16,4,.16],[x,2,z+side*7],black)
  }
  sign('01 / five-car jump',850,-18);sign('02 / semi clearance',850,48);sign('03 / top speed',1200,-48)
  sign('04 / curved launch',1060,-48)
  const loopPositions=[],loopIndices=[]
  for(let i=0;i<=180;i++){
    const a=i/180*Math.PI*2
    for(const side of [-1,1])loopPositions.push(stuntLoop.x+stuntLoop.radius*Math.sin(a),.025+stuntLoop.radius*(1-Math.cos(a)),stuntLoop.z+side*stuntLoop.width/2)
    if(i<180){const n=i*2;loopIndices.push(n,n+1,n+2,n+1,n+3,n+2)}
  }
  const loopGeometry=new THREE.BufferGeometry();loopGeometry.setAttribute('position',new THREE.Float32BufferAttribute(loopPositions,3));loopGeometry.setIndex(loopIndices);loopGeometry.computeVertexNormals()
  root.add(new THREE.Mesh(loopGeometry,new THREE.MeshStandardMaterial({color:0x26323d,roughness:.65,side:THREE.DoubleSide})))
  for(const side of [-1,1]){
    const points=Array.from({length:181},(_,i)=>{const a=i/180*Math.PI*2;return new THREE.Vector3(stuntLoop.x+stuntLoop.radius*Math.sin(a),.08+stuntLoop.radius*(1-Math.cos(a)),stuntLoop.z+side*stuntLoop.width/2)})
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),180,.12,6,false),white))
  }
  sign('05 / suction loop',1050,-82)
  boxes.flush()
  return {root,asphalt}
}
