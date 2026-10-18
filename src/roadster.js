import * as THREE from 'three'

const v = (x, y, z) => new THREE.Vector3(x, y, z)
const paint = new THREE.MeshPhysicalMaterial({ color: 0x9f050c, metalness: .26, roughness: .28, clearcoat: .42, clearcoatRoughness: .2, envMapIntensity: .65 })
const black = new THREE.MeshStandardMaterial({ color: 0x030405, metalness: .05, roughness: .7, envMapIntensity: .2 })
const rubber = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: .92 })
const silver = new THREE.MeshStandardMaterial({ color: 0xa5b0ba, metalness: .94, roughness: .23 })
const glass = new THREE.MeshPhysicalMaterial({ color: 0x162b38, metalness: .45, roughness: .12, transparent: true, opacity: .72, side: THREE.DoubleSide, clearcoat: 1 })
const lamp = new THREE.MeshBasicMaterial({ color: 0xd4eaff })
const tail = new THREE.MeshBasicMaterial({ color: 0xff1d10 })

function mesh(geometry, material, parent, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material)
  object.position.set(...position)
  object.castShadow = true
  object.receiveShadow = true
  parent.add(object)
  return object
}

function tube(points, radius, material, parent, segments = 40) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => v(...p))), segments, radius, 6, false), material, parent)
}

function surface(rows, material, parent, exclude = () => false) {
  const vertices = [], indices = [], cols = rows[0].length
  rows.forEach(row => row.forEach(point => vertices.push(...point)))
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < cols - 1; j++) {
    const a = i * cols + j, b = a + cols
    const points=[rows[i][j],rows[i+1][j],rows[i][j+1],rows[i+1][j+1]]
    if(points.some(exclude))continue
    indices.push(a, a + 1, b, b, a + 1, b + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return mesh(geometry, material, parent)
}

export function createRoadster() {
  const root = new THREE.Group(), shell = new THREE.Group(), details = new THREE.Group(), wheels = new THREE.Group()
  root.add(shell, details, wheels)
  // public exterior dimensions constrain the envelope; the surface itself is an interpretation.
  const stations = [
    [-1.973, .49, .38, .25], [-1.85, .72, .49, .23], [-1.6, .83, .61, .23],
    [-1.18, .855, .69, .22], [-.8, .81, .67, .2], [-.4, .78, .66, .19],
    [.1, .79, .67, .19], [.65, .84, .72, .21], [1.171, .87, .73, .24],
    [1.6, .83, .64, .26], [1.9, .76, .58, .28], [1.973, .71, .54, .29],
  ]
  const stationCurve = new THREE.CatmullRomCurve3(stations.map(s => v(s[0], s[1], s[2])))
  const rows = []
  for (let i = 0; i <= 240; i++) {
    const p = stationCurve.getPoint(i / 240), x = p.x, width = p.y, top = p.z, bottom = .23
    const row = []
    for (let j = 0; j <= 96; j++) {
      const angle = j / 96 * Math.PI * 2, sine = Math.sin(angle)
      const z = Math.sign(sine) * Math.pow(Math.abs(sine), .35) * width
      const y = bottom + (top - bottom) * (Math.cos(angle) + 1) / 2
      row.push([x, y, z])
    }
    rows.push(row)
  }
  const body = surface(rows, paint, shell, ([x,y,z]) => {
    const dx=Math.min(Math.abs(x+1.18),Math.abs(x-1.171))
    return Math.abs(z)>.64 && dx*dx+(y-.314)**2<.345**2
  })
  body.material.side = THREE.DoubleSide
  // sill rails, nose intake and diffuser.
  for (const sign of [-1, 1]) {
    for(const x of [-1.18,1.171]) {
      const arc=Array.from({length:33},(_,i)=>{const a=i/32*Math.PI;return [x+Math.cos(a)*.353,.314+Math.sin(a)*.353,sign*(x<0?.845:.86)]})
      tube(arc,.012,paint,shell)
    }
    tube([[-.83,.25,sign*.8],[0,.21,sign*.81],[.76,.27,sign*.84]], .026, paint, shell)
    tube([[-1.86,.43,sign*.71],[-1.42,.68,sign*.77],[-.91,.66,sign*.74],[-.58,.68,sign*.64]], .009, paint, shell)
    tube([[-.34,.67,sign*.77],[.42,.66,sign*.79],[.72,.68,sign*.78]], .006, black, details)
    tube([[.62,.69,sign*.8],[.77,.52,sign*.85],[.57,.35,sign*.8]], .008, black, details)
    const vent = mesh(new THREE.BoxGeometry(.22,.065,.013),black,details,[.63,.49,sign*.827]);vent.rotation.z=.3
    // swept headlamp lenses, following the front fender.
    const head = mesh(new THREE.SphereGeometry(1,32,16),black,details,[-1.65,.578,sign*.56]);head.scale.set(.24,.027,.13);head.rotation.z=.36
    for(let k=0;k<3;k++) {
      const led = mesh(new THREE.SphereGeometry(1,20,12),lamp,details,[-1.77+k*.075,.59+k*.016,sign*.57]);led.scale.set(.025,.014,.055)
    }
    tube([[-1.84,.44,sign*.66],[-1.9,.435,sign*.55]], .009, lamp, details)
    for(let k=0;k<2;k++) {
      const light = mesh(new THREE.CylinderGeometry(.052,.052,.018,32),tail,details,[1.935,.475,sign*(.49+k*.135)]);light.rotation.z=Math.PI/2
      const ring = mesh(new THREE.TorusGeometry(.055,.009,8,32),black,details,[1.948,.475,sign*(.49+k*.135)]);ring.rotation.y=Math.PI/2
    }
    const mirror = mesh(new THREE.SphereGeometry(1,24,12),paint,details,[-.42,.79,sign*.88]);mirror.scale.set(.12,.045,.065)
    tube([[-.38,.73,sign*.73],[-.42,.77,sign*.86]],.016,black,details)
  }
  const intake = mesh(new THREE.BoxGeometry(.022,.12,1.02),black,details,[-1.95,.32,0]);intake.rotation.z=-.15
  for(let k=0;k<3;k++)mesh(new THREE.BoxGeometry(.025,.004,.95),black,details,[-1.966,.29+k*.026,0])
  mesh(new THREE.BoxGeometry(.16,.09,1.1),black,details,[1.88,.29,0])
  for(let k=0;k<5;k++)mesh(new THREE.BoxGeometry(.23,.09,.012),black,details,[1.85,.24,-.46+k*.23])
  tube([[1.67,.654,-.74],[1.76,.645,0],[1.67,.654,.74]],.018,paint,shell)
  // open cockpit, swept windshield and structural surround.
  const cockpit = mesh(new THREE.SphereGeometry(1,48,24),black,details,[.16,.703,0]);cockpit.scale.set(.79,.09,.605)
  const windRows=[]
  for(let i=0;i<=14;i++) {
    const t=i/14,row=[]
    for(let j=0;j<=24;j++) {
      const u=j/24*2-1
      row.push([-.63+t*.49-.055*(1-u*u), .7+t*.427-.035*u*u, u*(.64-t*.12)])
    }
    windRows.push(row)
  }
  surface(windRows,glass,details)
  for(const sign of [-1,1]) tube([[-.63,.665,sign*.64],[-.4,.91,sign*.59],[-.14,1.092,sign*.52]],.021,paint,shell)
  tube([[-.14,1.092,-.52],[-.19,1.127,0],[-.14,1.092,.52]],.022,paint,shell)
  tube([[-.63,.665,-.64],[-.71,.7,0],[-.63,.665,.64]],.018,black,details)
  for(const sign of [-1,1]) {
    const seat = new THREE.Group();details.add(seat);seat.position.set(.3,.68,sign*.28)
    const back = mesh(new THREE.CapsuleGeometry(.14,.13,6,16),black,seat,[.17,.13,0]);back.scale.set(.55,1,1);back.rotation.z=.2
    const headrest = mesh(new THREE.SphereGeometry(.1,20,12),black,seat,[.19,.32,0]);headrest.scale.set(.65,.8,1);headrest.rotation.z=.16
    mesh(new THREE.BoxGeometry(.4,.055,.29),black,seat,[0,0,0])
    tube([[.55,.77,sign*.47],[.61,1.04,sign*.44],[.78,1.04,sign*.2],[.8,.77,sign*.15]],.026,silver,details)
    const belt = mesh(new THREE.BoxGeometry(.025,.27,.008),new THREE.MeshStandardMaterial({color:0x812126,roughness:.8}),seat,[.095,.11,.08]);belt.rotation.z=.16
  }
  const steering = mesh(new THREE.TorusGeometry(.115,.014,8,32),black,details,[-.25,.88,.28]);steering.rotation.y=Math.PI/2;steering.rotation.z=-.3
  mesh(new THREE.BoxGeometry(.16,.05,1),black,details,[-.43,.73,0])
  // forged rims, brake rotors, calipers and circumferential tire grooves.
  const wheelCenters=[]
  for(const x of [-1.18,1.171])for(const sign of [-1,1]) {
    const wheel = new THREE.Group();wheel.position.set(x,.314,sign*.788);wheels.add(wheel);wheelCenters.push(wheel)
    const tire = mesh(new THREE.CylinderGeometry(.314,.314,.207,64,1),rubber,wheel);tire.rotation.x=Math.PI/2
    for(const side of [-1,1]) {
      const sidewall = mesh(new THREE.TorusGeometry(.257,.054,12,64),rubber,wheel,[0,0,side*.093])
      sidewall.scale.z=.42
    }
    for(let k=0;k<4;k++)mesh(new THREE.TorusGeometry(.313,.002,4,64),black,wheel,[0,0,-.07+k*.046])
    const rim = mesh(new THREE.TorusGeometry(.222,.014,10,48),silver,wheel,[0,0,sign*.11])
    rim.scale.z=.65
    const rotor = mesh(new THREE.CylinderGeometry(.181,.181,.012,48),silver,wheel,[0,0,sign*.085]);rotor.rotation.x=Math.PI/2
    const hub = mesh(new THREE.CylinderGeometry(.047,.047,.027,24),silver,wheel,[0,0,sign*.125]);hub.rotation.x=Math.PI/2
    for(let k=0;k<10;k++) {
      const a=k/10*Math.PI*2
      const spoke=mesh(new THREE.BoxGeometry(.025,.183,.017),silver,wheel,[Math.sin(a)*.132,Math.cos(a)*.132,sign*.117]);spoke.rotation.z=-a+.15
    }
    mesh(new THREE.BoxGeometry(.065,.14,.055),paint,wheel,[.125,0,sign*.082])
  }
  const wire = new THREE.Group()
  root.add(wire)
  const wireMaterials=[]
  shell.traverse(object=>{
    if(!object.isMesh)return
    const material=new THREE.LineBasicMaterial({color:0xa8d0e0,transparent:true,opacity:0,depthTest:true})
    wireMaterials.push(material)
    const geometry=object===body?new THREE.WireframeGeometry(object.geometry):new THREE.EdgesGeometry(object.geometry,28)
    const lines=new THREE.LineSegments(geometry,material)
    lines.position.copy(object.position);lines.rotation.copy(object.rotation);lines.scale.copy(object.scale)
    wire.add(lines)
  })
  // low-density section curves keep the engineering mode legible over the triangular mesh.
  const sections=new THREE.Group();root.add(sections)
  const sectionMaterial=new THREE.LineBasicMaterial({color:0x76b4cf,transparent:true,opacity:0})
  for(let i=7;i<rows.length;i+=15)sections.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rows[i].map(p=>v(...p))),sectionMaterial))
  return {root,shell,details,wheels,wireMaterials,sectionMaterial,paint,glass,wheelCenters}
}

export function createFalcon() {
  const root=new THREE.Group(), white=new THREE.MeshStandardMaterial({color:0xcbd2d9,metalness:.45,roughness:.34}),dark=new THREE.MeshStandardMaterial({color:0x111923,metalness:.6,roughness:.4})
  // normalized here for composition; documented dimensions are shown in the data panel.
  for(const x of [-.42,0,.42]) {
    const height=x===0?4.65:3.7
    mesh(new THREE.CylinderGeometry(.145,.145,height,32),white,root,[x,height/2,0])
    mesh(new THREE.CylinderGeometry(.148,.148,.2,32),dark,root,[x,height-.45,0])
    mesh(new THREE.ConeGeometry(.145,.45,32),white,root,[x,height+.225,0])
    for(let n=0;n<9;n++){
      const a=n/9*Math.PI*2
      mesh(new THREE.CylinderGeometry(.028,.042,.13,10),dark,root,[x+Math.cos(a)*.09,-.065,Math.sin(a)*.09])
    }
    for(const z of [-1,1])for(const sign of [-1,1]) {
      const fin=mesh(new THREE.BoxGeometry(.012,.42,.04),dark,root,[x+sign*.16,.25,z*.11]);fin.rotation.z=sign*.35
    }
  }
  root.position.set(2.9,-.45,-1.8)
  return root
}
