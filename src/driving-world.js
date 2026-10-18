import * as THREE from 'three'
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js'
import {createStuntWorld} from './stunt-world.js'
import {inStuntArea,stuntSurface,collideStuntVehicles} from './stunt-physics.js'
import {createTrackQuery} from './track-query.js'

const seeded=i=>{const n=Math.sin(i*127.1+83.17)*43758.5453;return n-Math.floor(n)}

function asphaltTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256)
  for(let i=0;i<pixels.data.length;i+=4){const shade=38+seeded(i)*20;pixels.data[i]=shade;pixels.data[i+1]=shade+1;pixels.data[i+2]=shade+3;pixels.data[i+3]=255}
  ctx.putImageData(pixels,0,0)
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(4,90);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4
  return texture
}

function foliageTexture() {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,1024)
  ctx.strokeStyle='#3b3428';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(256,1005);ctx.lineTo(256,40);ctx.stroke()
  for(let branch=0;branch<48;branch++){
    const t=branch/48,y=75+t*815,span=16+Math.pow(t,1.05)*210
    for(const side of [-1,1]){
      ctx.strokeStyle='#253629';ctx.lineWidth=2+t*3;ctx.beginPath();ctx.moveTo(256,y);ctx.quadraticCurveTo(256+side*span*.45,y+20,256+side*span,y+60);ctx.stroke()
      for(let leaf=0;leaf<58;leaf++){
        const u=seeded(branch*700+leaf*3+(side+1)*80),spread=seeded(leaf*29+branch)*2-1
        const x=256+side*span*u+spread*18,ly=y+u*58+spread*(10+t*12),size=4+seeded(leaf+branch*200)*13
        ctx.fillStyle=['#1d3224','#29442e','#3b5336','#425b3c','#30482f'][Math.floor(seeded(leaf*13+branch*9)*5)]
        ctx.beginPath();ctx.ellipse(x,ly,size,size*.45,-side*.35,0,Math.PI*2);ctx.fill()
      }
    }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture
}

export function createDrivingWorld(scene,car) {
  scene.background=new THREE.Color(0xa4b5bd)
  scene.fog=new THREE.FogExp2(0xa4b5bd,.00145)
  const curve=new THREE.CatmullRomCurve3([[-235,0,-110],[-115,0,-205],[115,0,-185],[255,0,-65],[220,0,115],[65,0,210],[-145,0,155],[-270,0,25]].map(p=>new THREE.Vector3(...p)),true,'catmullrom',.35)
  const points=curve.getSpacedPoints(1100),length=curve.getLength(),normals=[]
  for(let i=0;i<points.length;i++){
    const tangent=curve.getTangentAt(i/(points.length-1))
    normals.push(new THREE.Vector3(-tangent.z,0,tangent.x).normalize())
  }
  const terrainGeometry=new THREE.PlaneGeometry(2400,2400,140,140);terrainGeometry.rotateX(-Math.PI/2)
  function heightAt(x,z) {
    if(inStuntArea(x,z))return -.09
    const rise=Math.max(0,Math.hypot(x,z)-355)
    const ridges=Math.sin(x*.013+Math.sin(z*.008)*1.3)+Math.cos(z*.014+x*.003)*.65
    const detail=Math.sin(x*.049+z*.02)*Math.cos(z*.038)*Math.min(9,rise*.035)
    const h=Math.pow(Math.max(0,ridges),1.6)*Math.min(92,rise*.29)+detail
    const blend=x>450&&x<3000?THREE.MathUtils.smoothstep(Math.abs(z),130,330):1
    return -.09+h*blend
  }
  const vertices=terrainGeometry.attributes.position,colors=[]
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),z=vertices.getZ(i),distance=Math.hypot(x,z)
    vertices.setY(i,heightAt(x,z))
    const variation=seeded(i)*.12
    const color=new THREE.Color().setRGB(.48+variation,.53+variation,.42+variation*.65)
    if(distance>500)color.lerp(new THREE.Color(0x5f6c6c),.25)
    colors.push(color.r,color.g,color.b)
  }
  terrainGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeometry.computeVertexNormals()
  const textures=new THREE.TextureLoader(),assetUrl=name=>`${import.meta.env.BASE_URL}assets/driving/${name}`
  const grass=textures.load(assetUrl('grass.jpg'));grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(200,200);grass.colorSpace=THREE.SRGBColorSpace;grass.anisotropy=4
  const terrain=new THREE.Mesh(terrainGeometry,new THREE.MeshStandardMaterial({map:grass,vertexColors:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain)

  function ribbon(offset,width,material,y=.02) {
    const positions=[],uvs=[],indices=[]
    points.forEach((p,i)=>{
      for(const side of [-1,1]){positions.push(p.x+normals[i].x*(offset+side*width/2),y,p.z+normals[i].z*(offset+side*width/2));uvs.push(side===-1?0:1,i/(points.length-1))}
      if(i<points.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
    })
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals()
    const object=new THREE.Mesh(geometry,material);object.receiveShadow=true;scene.add(object);return object
  }
  ribbon(0,18,new THREE.MeshStandardMaterial({color:0x79796e,roughness:1}),-.015)
  const roadMaterial=new THREE.MeshStandardMaterial({map:asphaltTexture(),roughness:.94,color:0xb2b6b9})
  textures.load(assetUrl('asphalt.jpg'),texture=>{texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,240);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;roadMaterial.map.dispose();roadMaterial.map=texture;roadMaterial.needsUpdate=true})
  textures.load(assetUrl('asphalt-normal.jpg'),texture=>{texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,240);texture.anisotropy=8;roadMaterial.normalMap=texture;roadMaterial.normalScale.set(.18,.18);roadMaterial.needsUpdate=true})
  ribbon(0,14,roadMaterial)
  createStuntWorld(scene,roadMaterial,car,terrain.material,heightAt)
  const marking=new THREE.MeshBasicMaterial({color:0xd3d4c6})
  ribbon(-6.35,.12,marking,.03);ribbon(6.35,.12,marking,.03)
  const dummy=new THREE.Object3D()
  const dashes=new THREE.InstancedMesh(new THREE.BoxGeometry(3.4,.012,.12),marking,Math.floor(length/10))
  for(let i=0;i<dashes.count;i++){
    const t=i/dashes.count,p=curve.getPointAt(t),tangent=curve.getTangentAt(t)
    dummy.position.set(p.x,.035,p.z);dummy.rotation.set(0,-Math.atan2(tangent.z,tangent.x),0);dummy.updateMatrix();dashes.setMatrixAt(i,dummy.matrix)
  }
  scene.add(dashes)
  const curbGeometry=new THREE.BoxGeometry(2.7,.08,.44),red=new THREE.MeshStandardMaterial({color:0x9f332c,roughness:.9}),white=new THREE.MeshStandardMaterial({color:0xd4d4c6,roughness:.9})
  for(const [material,parity] of [[red,0],[white,1]]){
    const curbs=new THREE.InstancedMesh(curbGeometry,material,Math.floor(length/3)*2)
    let count=0
    for(let i=parity;i<Math.floor(length/3);i+=2)for(const side of [-1,1]){
      const t=i/Math.floor(length/3),p=curve.getPointAt(t),tangent=curve.getTangentAt(t),n=new THREE.Vector3(-tangent.z,0,tangent.x)
      dummy.position.set(p.x+n.x*side*7.1,.035,p.z+n.z*side*7.1);dummy.rotation.set(0,-Math.atan2(tangent.z,tangent.x),0);dummy.updateMatrix();curbs.setMatrixAt(count++,dummy.matrix)
    }
    curbs.count=count;scene.add(curbs)
  }
  const guard=new THREE.MeshStandardMaterial({color:0x9da7a7,metalness:.6,roughness:.4})
  const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(5.2,.32,.09),guard,Math.floor(length/5.2)*2)
  let railCount=0
  for(let i=0;i<Math.floor(length/5.2);i++)for(const side of [-1,1]){
    if(i%31<5)continue
    const t=i/Math.floor(length/5.2),p=curve.getPointAt(t),tangent=curve.getTangentAt(t),n=new THREE.Vector3(-tangent.z,0,tangent.x)
    dummy.position.set(p.x+n.x*side*10.5,.65,p.z+n.z*side*10.5);dummy.rotation.set(0,-Math.atan2(tangent.z,tangent.x),0);dummy.updateMatrix();rails.setMatrixAt(railCount++,dummy.matrix)
  }
  rails.count=railCount;scene.add(rails)
  const treeCandidates=[]
  const trackQuery=createTrackQuery(points,normals)
  const stuntPoint=new THREE.Vector3(),stuntNormal=new THREE.Vector3(0,0,1)
  const nearest=(x,z)=>{
    if(inStuntArea(x,z))return {distance:Math.abs(z-Math.round(z/30)*30)<7?0:8,index:0,point:stuntPoint.set(x,0,z),normal:stuntNormal}
    return trackQuery(x,z)
  }
  for(let i=0;i<1350;i++){
    const x=(seeded(i+100)*2-1)*430,z=(seeded(i+2000)*2-1)*360
    if(nearest(x,z).distance<18||Math.hypot(x/90,z/66)<1.5)continue
    treeCandidates.push([x,z,4+seeded(i+4000)*8])
  }
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.15,.23,1,5),new THREE.MeshStandardMaterial({color:0x4c4436,roughness:1}),treeCandidates.length)
  const crowns=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({map:foliageTexture(),alphaTest:.4,side:THREE.DoubleSide,roughness:1,color:0xaab6a3}),treeCandidates.length*3)
  treeCandidates.forEach(([x,z,h],i)=>{
    const base=heightAt(x,z)
    dummy.rotation.set(0,seeded(i)*6.28,0);dummy.position.set(x,base+h*.18,z);dummy.scale.set(1,h*.36,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix)
    for(let j=0;j<3;j++){dummy.position.set(x,base+h*.5,z);dummy.rotation.y=seeded(i)*6.28+j*Math.PI/3;dummy.scale.set(h*.65,h,1);dummy.updateMatrix();crowns.setMatrixAt(i*3+j,dummy.matrix)}
  })
  dummy.scale.set(1,1,1);scene.add(trunks,crowns)
  const water=new THREE.Mesh(new THREE.CircleGeometry(1,100),new THREE.MeshStandardMaterial({color:0x496b7d,roughness:.28,metalness:.45}));water.rotation.x=-Math.PI/2;water.scale.set(83,59,1);water.position.set(0,-.045,0);scene.add(water)
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1800,32,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);float h=pow(max(d.y,0.),.42);vec3 c=mix(vec3(.66,.74,.77),vec3(.22,.39,.56),h);float sun=pow(max(dot(d,normalize(vec3(-.6,.36,-.5))),0.),260.);c+=vec3(1.,.78,.46)*sun*.65;gl_FragColor=vec4(c,1.);}' }));scene.add(sky)
  new HDRLoader().load(assetUrl('sky.hdr'),texture=>{texture.mapping=THREE.EquirectangularReflectionMapping;scene.background=texture;scene.environment=texture;scene.backgroundIntensity=.8;scene.environmentIntensity=.65;sky.visible=false},undefined,()=>{sky.visible=true})
  scene.add(new THREE.HemisphereLight(0xc6dcf1,0x646047,2.2))
  const sun=new THREE.DirectionalLight(0xffe1b1,3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-26;sun.shadow.camera.right=26;sun.shadow.camera.top=26;sun.shadow.camera.bottom=-26;sun.shadow.camera.near=.5;sun.shadow.camera.far=140;sun.shadow.normalBias=.035;scene.add(sun,sun.target)
  const mapPath=points.filter((_,i)=>i%8===0).map((p,i)=>`${i?'L':'M'}${(p.x+300)/600*160},${(p.z+240)/480*118}`).join(' ')+'Z'
  return {curve,points,normals,length,nearest,sun,mapPath,heightAt,surface(x,z,heading){if(inStuntArea(x,z))return stuntSurface(x,z,heading);const near=nearest(x,z);return {height:near.distance<7.4?.028:near.distance<9?-.008:heightAt(x,z)+.006,slope:0}},update(x,z){const h=heightAt(x,z);sun.position.set(x-35,h+70,z-30);sun.target.position.set(x,h,z);sky.position.set(x,0,z)},collision(state){
    if(inStuntArea(state.x,state.z)){collideStuntVehicles(state);return}
    if(state.y>2)return
    const distance=Math.hypot(state.x/84,state.z/60)
    if(distance<1){state.x/=distance||1;state.z/=distance||1;state.speed*=.15;state.vx*=.15;state.vz*=.15}
    const near=nearest(state.x,state.z)
    const railIndex=Math.floor(near.index/(points.length-1)*Math.floor(length/5.2))
    if(near.distance>9.45&&near.distance<10.9&&railIndex%31>=5){const dx=state.x-near.point.x,dz=state.z-near.point.z,scale=9.3/near.distance;state.x=near.point.x+dx*scale;state.z=near.point.z+dz*scale;state.speed*=.5;state.vx*=.5;state.vz*=.5}
    if(near.distance>14){
      const fx=Math.cos(state.heading),fz=Math.sin(state.heading)
      for(const [x,z] of treeCandidates){
        const dx=x-state.x,dz=z-state.z
        if(Math.abs(dx)>3||Math.abs(dz)>3)continue
        const along=THREE.MathUtils.clamp(dx*fx+dz*fz,-1.25,1.25),cx=state.x+fx*along,cz=state.z+fz*along
        const distance=Math.hypot(x-cx,z-cz)
        if(distance<1.1){const depth=(1.1-distance)/(distance||1);state.x-=(x-cx)*depth;state.z-=(z-cz)*depth;state.speed*=.15;state.vx*=.15;state.vz*=.15}
      }
    }
  }}
}
