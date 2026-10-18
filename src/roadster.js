import * as THREE from 'three'

const v=(x,y,z)=>new THREE.Vector3(x,y,z)
const paint=new THREE.MeshPhysicalMaterial({color:0xeceae3,metalness:.38,roughness:.3,clearcoat:.8,clearcoatRoughness:.2,envMapIntensity:.9,side:THREE.DoubleSide})
const carbon=new THREE.MeshStandardMaterial({color:0x080b0f,metalness:.3,roughness:.38,side:THREE.DoubleSide})
const rubber=new THREE.MeshStandardMaterial({color:0x0e1013,roughness:.9})
const alloy=new THREE.MeshStandardMaterial({color:0xd7dadd,metalness:.68,roughness:.26,envMapIntensity:1.1})
const glass=new THREE.MeshPhysicalMaterial({color:0x30230f,metalness:.55,roughness:.06,clearcoat:1,envMapIntensity:1.5,side:THREE.FrontSide,transparent:true,opacity:.9,depthWrite:false})
const titanium=new THREE.MeshStandardMaterial({color:0x6a7077,metalness:.75,roughness:.3,side:THREE.DoubleSide})
const upholstery=new THREE.MeshStandardMaterial({color:0xcbd1d5,roughness:.75,side:THREE.DoubleSide})
const led=new THREE.MeshBasicMaterial({color:0xd2ebff})
const redLed=new THREE.MeshBasicMaterial({color:0xff161b})
const darkMetal=new THREE.MeshStandardMaterial({color:0x343c45,metalness:.85,roughness:.35})
const headliner=new THREE.MeshStandardMaterial({color:0x14171c,roughness:.98,metalness:0,envMapIntensity:.05,side:THREE.DoubleSide})

function mesh(geometry,material,parent,position=[0,0,0]) {
  const object=new THREE.Mesh(geometry,material)
  object.position.set(...position);object.castShadow=!material.isShaderMaterial&&material!==glass;object.receiveShadow=true;parent.add(object)
  return object
}
function line(points,radius,material,parent) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>v(...p))),Math.max(8,points.length*5),radius,6,false),material,parent)
}
function panel(points,material,parent) {
  const geometry=new THREE.BufferGeometry(),positions=[],indices=[]
  points.forEach(point=>positions.push(...point))
  for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1)
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  return mesh(geometry,material,parent)
}
function box(size,material,parent,position) { return mesh(new THREE.BoxGeometry(...size),material,parent,position) }
function cylinder(radius,length,material,parent,position) {
  const object=mesh(new THREE.CylinderGeometry(radius,radius,length,48),material,parent,position)
  object.rotation.x=Math.PI/2
  return object
}
function canopy(parent) {
  const curve=new THREE.CatmullRomCurve3([[-.94,.735,.68],[-.33,1.155,.6],[.06,1.18,.58],[.56,1.175,.56],[1.49,.8,.68]].map(p=>v(...p)),false,'catmullrom',.15)
  const positions=[],indices=[],cols=24,rows=90
  for(let i=0;i<=rows;i++){
    const p=curve.getPoint(i/rows)
    for(let j=0;j<=cols;j++){const u=j/cols*2-1;positions.push(p.x-.015*(1-u*u),p.y-.035*u*u,p.z*u)}
  }
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  mesh(geometry,glass,parent)
}

// proportions reconstructed from the supplied renders, not tesla manufacturing geometry.
export const referenceEnvelope={length:4.5,width:1.98,height:1.18,wheelbase:2.70}

export function createRoadster({createCanvas=()=>document.createElement('canvas')}={}) {
  const root=new THREE.Group(),shell=new THREE.Group(),details=new THREE.Group(),wheels=new THREE.Group()
  root.add(shell,details,wheels)
  const wheelX=[-1.34,1.36],wheelRadius=.355
  const profiles=[
    [-2.25,.81,.51],[-2.12,.91,.55],[-1.7,.96,.65],[-1.34,.985,.71],
    [-.86,.94,.72],[-.25,.90,.71],[.45,.92,.73],[1.01,.98,.77],
    [1.36,1.0,.79],[1.9,.94,.77],[2.25,.86,.74],
  ]
  const longitudinal=new THREE.CatmullRomCurve3(profiles.map(p=>v(...p)),false,'catmullrom',.2)
  const loops=[]
  for(let i=0;i<=480;i++) {
    const p=longitudinal.getPoint(i/480),x=p.x,w=p.y,h=p.z
    const fender=Math.exp(-Math.pow((x+1.34)/.5,4))*.10+Math.exp(-Math.pow((x-1.36)/.55,4))*.065
    loops.push([[x,h,0],[x,h-.025+fender*.7,w*.72],[x,h-.05+fender,w],[x,.37,w],[x,.22,w*.91],[x,.19,0],[x,.22,-w*.91],[x,.37,-w],[x,h-.05+fender,-w],[x,h-.025+fender*.7,-w*.72],[x,h,0]])
  }
  const inArch=([x,y,z])=>Math.abs(z)>.71&&Math.min(...wheelX.map(cx=>(x-cx)**2))+(y-wheelRadius)**2<.375**2
  const inDoor=([x,y,z])=>x>-.75&&x<.88&&Math.abs(z)>.71&&y>.24
  const inCockpit=([x,y,z])=>x>-.73&&x<.9&&Math.abs(z)<.8&&y>.55
  // separate strips preserve the folded metal creases rather than smoothing every edge.
  for(let edge=0;edge<10;edge++) {
    const positions=[],indices=[],steps=24
    for(let i=0;i<loops.length;i++)for(let j=0;j<=steps;j++){
      const a=loops[i][edge],b=loops[i][edge+1],t=j/steps
      positions.push(a[0],a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t)
    }
    for(let i=0;i<loops.length-1;i++)for(let j=0;j<steps;j++){
      const a=i*(steps+1)+j,b=a+steps+1
      const quad=[a,a+1,b,b+1].map(n=>positions.slice(n*3,n*3+3))
      if(quad.some(inArch)||quad.some(inDoor)||quad.some(inCockpit))continue
      indices.push(a,a+1,b,b,a+1,b+1)
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
    mesh(geometry,[3,4,5,6].includes(edge)?carbon:paint,shell)
  }
  // front: a straight light blade, broad unbroken hood and triangular fender shoulders.
  panel([[-2.257,.475,-.84],[-2.257,.475,.84],[-2.22,.295,.87],[-2.22,.295,-.87]],carbon,details)
  box([.014,.044,1.71],carbon,details,[-2.275,.49,0])
  box([.018,.012,1.66],led,details,[-2.288,.494,0])
  panel([[-2.30,.23,-.91],[-2.30,.23,.91],[-2.1,.21,.96],[-2.1,.21,-.96]],carbon,details)
  for(const sign of [-1,1]) {
    line([[-2.12,.555,sign*.69],[-1.62,.666,sign*.61],[-.86,.723,sign*.65]],.0035,carbon,details)
    line([[-.77,.25,sign*.91],[.1,.225,sign*.94],[.95,.26,sign*.99]],.018,carbon,details)
    const mirror=mesh(new THREE.SphereGeometry(1,24,12),carbon,details,[-.65,.79,sign*1.025]);mirror.scale.set(.105,.035,.049)
    line([[-.64,.75,sign*.87],[-.65,.78,sign*1.01]],.009,carbon,details)
    for(const x of wheelX) {
      const points=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI;return[x+Math.cos(a)*.383,wheelRadius+Math.sin(a)*.383,sign*(x<0?.984:1.002)]})
      line(points,.009,paint,shell)
    }
  }
  // the cabin is an enclosed dark canopy with a continuous roof/rear-glass silhouette.
  canopy(details)
  panel([[-.25,1.13,-.55],[-.25,1.13,.55],[.58,1.14,.54],[.58,1.14,-.54]],headliner,details)
  for(const sign of [-1,1]) {
    line([[-.94,.7,sign*.68],[-.33,1.12,sign*.6],[.06,1.145,sign*.58],[.56,1.14,sign*.56],[1.49,.765,sign*.68]],.012,paint,shell)
    panel([[.83,.75,sign*.91],[1.52,.78,sign*.83],[.58,1.14,sign*.56]],paint,shell)
    line([[.65,1.13,sign*.59],[1.52,.79,sign*.7]],.006,carbon,details)
  }
  line([[-.86,.73,-.65],[-.91,.75,0],[-.86,.73,.65]],.012,carbon,details)
  // doors pivot at the leading edge; glazing, inner trim and outer skin move as one assembly.
  const doors=[]
  for(const sign of [-1,1]) {
    const pivot=new THREE.Group();pivot.position.set(-.75,.69,sign*.87);shell.add(pivot)
    const local=points=>points.map(([x,y,z])=>[x+.75,y-.69,z-sign*.87])
    const outerDoor=local([[-.75,.68,sign*.945],[.88,.72,sign*.965],[.88,.31,sign*.93],[-.75,.27,sign*.91]])
    panel(sign>0?outerDoor.reverse():outerDoor,paint,pivot)
    panel(local([[-.72,.65,sign*.91],[.86,.69,sign*.93],[.86,.35,sign*.905],[-.72,.31,sign*.875]]),carbon,pivot)
    panel(local([[-.73,.725,sign*.91],[-.23,1.144,sign*.585],[.56,1.153,sign*.565],[.88,.78,sign*.94]]).reverse(),glass,pivot)
    line(local([[-.73,.725,sign*.91],[-.23,1.144,sign*.585],[.56,1.153,sign*.565],[.88,.78,sign*.94]]),.009,carbon,pivot)
    line(local([[-.72,.67,sign*.925],[.8,.69,sign*.945]]),.004,redLed,pivot)
    panel(local([[-.65,.52,sign*.90],[.63,.54,sign*.92],[.73,.59,sign*.92],[-.51,.59,sign*.90]]),upholstery,pivot)
    box([.14,.013,.012],carbon,pivot,local([[.68,.68,sign*.971]])[0])
    doors.push({pivot,sign})
  }
  // rear: full-width tail light, four metal nozzles and a recessed four-channel diffuser.
  const brakeLight=new THREE.MeshBasicMaterial({color:0xff161b,toneMapped:false})
  panel([[2.255,.725,-.91],[2.255,.725,.91],[2.255,.32,.94],[2.255,.32,-.94]],paint,shell)
  box([.04,.09,1.8],carbon,details,[2.275,.68,0])
  box([.046,.017,1.75],brakeLight,details,[2.3,.699,0])
  box([.046,.013,1.75],brakeLight,details,[2.3,.653,0])
  const reverseLights=new THREE.Group();reverseLights.visible=false;details.add(reverseLights)
  for(const sign of [-1,1])box([.035,.018,.1],led,reverseLights,[2.3,.53,sign*.29])
  box([.025,.145,.34],upholstery,details,[2.285,.53,0])
  box([.03,.014,.19],darkMetal,details,[2.305,.53,0])
  box([.19,.34,1.54],carbon,details,[2.23,.275,0])
  const exhaust=new THREE.Group();exhaust.visible=false;root.add(exhaust)
  // Cold-gas thruster: white vapour jet with a bright throat, turbulent fringe and faint shock diamonds.
  const plumeMaterial=new THREE.ShaderMaterial({uniforms:{uOpacity:{value:0},uTime:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    vertexShader:'varying vec2 vUv;varying float vFacing;void main(){vUv=uv;vFacing=abs(normalize(normalMatrix*normal).z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uOpacity;uniform float uTime;varying vec2 vUv;varying float vFacing;void main(){float t=clamp(vUv.y,0.,1.);float turbulence=.5+.5*sin(vUv.x*62.8+t*22.-uTime*38.)*sin(vUv.x*37.7-t*13.+uTime*27.);float diamonds=pow(.5+.5*sin(t*46.-uTime*9.),4.)*exp(-t*2.6);float body=pow(clamp(vFacing,0.,1.),1.15)*pow(1.-t,1.5)*smoothstep(0.,.03,t)*(.5+.5*turbulence);float core=exp(-t*6.5)*pow(clamp(vFacing,0.,1.),2.);vec3 hot=vec3(1.);vec3 cool=vec3(.45,.7,1.);vec3 fringe=vec3(.6,.74,1.);vec3 col=mix(cool,hot,core);col=mix(col,fringe,smoothstep(.45,1.,t)*.55);col+=vec3(.9)*diamonds*.3;gl_FragColor=vec4(col,(body+core*.9+diamonds*.5*body)*uOpacity);}'})
  const plumeGeometry=length=>new THREE.LatheGeometry(Array.from({length:24},(_,k)=>{const y=k/23;return new THREE.Vector2(.05+.045*Math.pow(y,.55)-.04*Math.pow(y,3),y*length)}),28)
  for(const z of [-.6,-.2,.2,.6]) {
    const rim=mesh(new THREE.TorusGeometry(.068,.008,10,40),alloy,details,[2.36,.455,z]);rim.rotation.y=Math.PI/2
    const inner=mesh(new THREE.CylinderGeometry(.059,.05,.13,32,1,true),darkMetal,details,[2.32,.455,z]);inner.rotation.z=Math.PI/2
    const hole=mesh(new THREE.CircleGeometry(.052,32),carbon,details,[2.28,.455,z]);hole.rotation.y=Math.PI/2
    const fan=mesh(new THREE.TorusGeometry(.107,.011,8,32),darkMetal,details,[2.34,.24,z]);fan.rotation.y=Math.PI/2
    for(let blade=0;blade<7;blade++) {
      const a=blade/7*Math.PI*2
      const bladeMesh=box([.015,.028,.079],darkMetal,details,[2.34,.24+Math.sin(a)*.052,z+Math.cos(a)*.052]);bladeMesh.rotation.x=-a+.4
    }
    const plume=mesh(plumeGeometry(1.7),plumeMaterial,exhaust,[2.3,.455,z]);plume.rotation.z=-Math.PI/2;plume.castShadow=false
  }
  for(const z of [-.8,-.4,0,.4,.8])box([.32,.27,.014],carbon,details,[2.24,.21,z])
  const liftPlumeMaterial=plumeMaterial.clone();liftPlumeMaterial.uniforms.uOpacity.value=0
  for(const x of [-1.1,1.1])for(const z of [-.73,.73]){
    const nozzle=mesh(new THREE.TorusGeometry(.045,.006,8,24),darkMetal,details,[x,.22,z]);nozzle.rotation.x=Math.PI/2
    {const plume=mesh(plumeGeometry(1.2),liftPlumeMaterial,exhaust,[x,.2,z]);plume.rotation.z=Math.PI;plume.castShadow=false}
  }
  for(const sign of [-1,1]){const nozzle=mesh(new THREE.TorusGeometry(.035,.005,8,24),darkMetal,details,[.9,.52,sign*.957]);if(sign<0)nozzle.rotation.y=Math.PI}
  for(const sign of [-1,1])for(const x of [-.7,.93]){const pod=mesh(new THREE.CylinderGeometry(.022,.03,.07,16),darkMetal,details,[x,.2,sign*.95]);mesh(new THREE.CircleGeometry(.017,16),carbon,details,[x,.163,sign*.95]).rotation.x=Math.PI/2;pod.castShadow=false}
  // active aero: a high, narrow wing with vertical endplates.
  const wing=new THREE.Group();root.add(wing)
  for(const sign of [-1,1]) {
    box([.05,.24,.023],carbon,wing,[1.91,.93,sign*.68])
    panel([[1.73,1.085,sign*1.02],[2.15,1.07,sign*1.02],[2.22,.75,sign*1.05],[2.09,.77,sign*1.05]],paint,wing)
  }
  const wingBlade=box([.34,.034,2.03],carbon,wing,[1.94,1.07,0]);wingBlade.rotation.z=-.035
  line([[2.10,1.075,-1],[2.10,1.075,0],[2.10,1.075,1]],.006,paint,wing)
  // interior: light sculpted seats, a rectangular yoke and a landscape center display.
  box([1.72,.05,1.55],carbon,details,[.16,.34,0])
  box([.05,.38,1.46],carbon,details,[-.78,.49,0])
  box([.18,.02,.12],carbon,details,[.08,1.14,0])
  box([.38,.075,1.43],carbon,details,[-.57,.70,0])
  panel([[-.7,.735,-.7],[-.7,.735,.7],[-.42,.70,.7],[-.42,.70,-.7]],upholstery,details)
  box([.84,.16,.17],upholstery,details,[.03,.44,0])
  const screen=box([.025,.235,.39],carbon,details,[-.37,.79,0]);screen.rotation.z=-.12
  box([.027,.002,.32],redLed,details,[-.352,.708,0])
  const screenTexture=createScreenTexture(createCanvas)
  const screenSurface=mesh(new THREE.PlaneGeometry(.365,.205),new THREE.MeshBasicMaterial({map:screenTexture}),details,[-.349,.795,0]);screenSurface.rotation.y=Math.PI/2
  const driverScreens=[]
  for(const z of [-.4,.4]){
    box([.025,.075,.2],carbon,details,[-.67,.79,z])
    const canvas=createCanvas();canvas.width=512;canvas.height=192
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;driverScreens.push(texture)
    const face=mesh(new THREE.PlaneGeometry(.185,.065),new THREE.MeshBasicMaterial({map:texture}),details,[-.654,.794,z]);face.rotation.y=Math.PI/2
  }
  const yokePoints=[[-.44,.84,.18],[-.44,.87,.2],[-.44,.87,.46],[-.44,.84,.49],[-.44,.72,.49],[-.44,.70,.46],[-.44,.70,.2],[-.44,.72,.18],[-.44,.84,.18]]
  const steering=new THREE.Group();steering.position.set(-.44,.785,.335);details.add(steering)
  line(yokePoints.map(([x,y,z])=>[x+.44,y-.785,z-.335]),.017,upholstery,steering)
  box([.036,.105,.15],carbon,steering,[.005,0,0])
  const seats=[]
  for(const sign of [-1,1]) {
    const seat=new THREE.Group();seat.position.set(.25,.39,sign*.39);details.add(seat)
    seats.push(seat)
    const base=mesh(new THREE.CapsuleGeometry(.18,.22,8,20),upholstery,seat,[-.02,.06,0]);base.rotation.z=Math.PI/2;base.scale.set(1,.65,1)
    const back=mesh(new THREE.CapsuleGeometry(.17,.22,8,20),upholstery,seat,[.25,.30,0]);back.scale.set(.5,1,1);back.rotation.z=-.12
    const insert=mesh(new THREE.CapsuleGeometry(.12,.15,6,16),carbon,seat,[.155,.29,0]);insert.scale.set(.14,1,1)
    const head=mesh(new THREE.SphereGeometry(.13,24,16),upholstery,seat,[.27,.53,0]);head.scale.set(.6,.85,1)
    line([[.18,.18,-.15],[.21,.38,-.15],[.24,.47,-.1]],.006,carbon,seat)
  }
  line([[-.72,.735,-.69],[-.72,.735,0],[-.72,.735,.69]],.003,redLed,details)
  // turbine-inspired five swept spokes and actual recessed brake discs.
  const wheelCenters=[]
  for(const x of wheelX)for(const sign of [-1,1]) {
    const wheel=new THREE.Group();wheel.position.set(x,wheelRadius,sign*.914);wheels.add(wheel);wheelCenters.push(wheel)
    cylinder(wheelRadius,.235,rubber,wheel,[0,0,0])
    for(const side of [-1,1]) {
      const sidewall=mesh(new THREE.TorusGeometry(.303,.05,12,72),rubber,wheel,[0,0,side*.106]);sidewall.scale.z=.38
    }
    cylinder(.252,.018,carbon,wheel,[0,0,sign*.12])
    cylinder(.204,.014,darkMetal,wheel,[0,0,sign*.13])
    const rim=mesh(new THREE.TorusGeometry(.272,.012,10,72),titanium,wheel,[0,0,sign*.137]);rim.scale.z=.6
    for(let i=0;i<10;i++) {
      const a=i/10*Math.PI*2,transform=([px,py])=>[Math.cos(a)*px-Math.sin(a)*py,Math.sin(a)*px+Math.cos(a)*py,sign*.148]
      panel([[.045,-.012],[.14,-.034],[.268,-.016],[.268,.012],[.14,-.004],[.045,.016]].map(transform),titanium,wheel)
    }
    cylinder(.048,.025,alloy,wheel,[0,0,sign*.158])
    box([.07,.14,.045],darkMetal,wheel,[.15,0,sign*.134])
    for(let t=0;t<4;t++)mesh(new THREE.TorusGeometry(wheelRadius,.002,4,72),carbon,wheel,[0,0,-.08+t*.052])
  }
  const wireMaterials=[],wireObjects=[]
  const shellMeshes=[]
  shell.traverse(object=>{if(object.isMesh)shellMeshes.push(object)})
  shellMeshes.forEach(object=>{
    const material=new THREE.LineBasicMaterial({color:0x9dbfce,transparent:true,opacity:0})
    wireMaterials.push(material)
    const lines=new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry,12),material)
    lines.visible=false;wireObjects.push(lines)
    object.add(lines)
  })
  const sections=new THREE.Group();sections.visible=false;root.add(sections)
  const sectionMaterial=new THREE.LineBasicMaterial({color:0x85b9d2,transparent:true,opacity:0})
  for(let i=6;i<loops.length;i+=14)sections.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(loops[i].map(p=>v(...p))),sectionMaterial))
  return {root,shell,details,wheels,wireMaterials,wireObjects,sections,exhaust,brakeLight,reverseLights,sectionMaterial,paint,glass,wheelCenters,doors,wing,plumeMaterial,liftPlumeMaterial,steering,screenTexture,screenSurface,driverScreens,seats}
}

function createScreenTexture(createCanvas) {
  const canvas=createCanvas();canvas.width=512;canvas.height=288
  const ctx=canvas.getContext('2d');ctx.fillStyle='#080e15';ctx.fillRect(0,0,512,288)
  ctx.fillStyle='#dce5eb';ctx.font='24px monospace';ctx.fillText('roadster',24,40)
  ctx.fillStyle='#7f919e';ctx.font='12px monospace';ctx.fillText('concept / system overview',24,65)
  ctx.strokeStyle='#526773';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,175);ctx.lineTo(95,145);ctx.lineTo(185,136);ctx.lineTo(220,109);ctx.lineTo(320,109);ctx.lineTo(360,142);ctx.lineTo(435,151);ctx.lineTo(448,178);ctx.closePath();ctx.stroke()
  for(const x of [135,372]){ctx.beginPath();ctx.arc(x,175,25,0,Math.PI*2);ctx.stroke()}
  ctx.strokeStyle='#e63a37';ctx.beginPath();ctx.moveTo(26,239);ctx.lineTo(486,239);ctx.stroke()
  ctx.fillStyle='#b7c4cc';ctx.fillText('surface',28,270);ctx.fillText('aero',222,270);ctx.fillText('cabin',415,270)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture
}
