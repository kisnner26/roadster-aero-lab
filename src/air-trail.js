import * as THREE from 'three'

const capacity=1400

// Compressed-gas particles live in world space so the trail stays behind the moving car.
export function createAirTrail(scene) {
  const positions=new Float32Array(capacity*3).fill(-1e5),velocities=new Float32Array(capacity*3)
  const ages=new Float32Array(capacity).fill(1),lives=new Float32Array(capacity).fill(1),seeds=Float32Array.from({length:capacity},Math.random)
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('age',new THREE.BufferAttribute(ages,1).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1))
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uScale:{value:600}},
    vertexShader:'attribute float age;attribute float seed;uniform float uScale;varying float vAge;varying float vSeed;void main(){vAge=age;vSeed=seed;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=age>=1.?0.:clamp((.1+age*.95+seed*.12)*uScale/max(-mv.z,.5),1.,96.);}',
    fragmentShader:'varying float vAge;varying float vSeed;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float soft=pow(1.-d,1.4);vec3 col=mix(vec3(.62,.82,1.),vec3(.52,.58,.66),smoothstep(.05,.7,vAge));gl_FragColor=vec4(col,pow(1.-vAge,1.7)*soft*.5);}'})
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points)
  let cursor=0
  const direction=new THREE.Vector3()
  function spawn(emitter) {
    const i=cursor;cursor=(cursor+1)%capacity
    const speed=emitter.speed*(.65+Math.random()*.7),spread=emitter.spread
    direction.set(emitter.direction.x+(Math.random()-.5)*spread,emitter.direction.y+(Math.random()-.5)*spread,emitter.direction.z+(Math.random()-.5)*spread).normalize()
    const o=i*3
    positions[o]=emitter.position.x+direction.x*Math.random()*.12;positions[o+1]=emitter.position.y+direction.y*Math.random()*.12;positions[o+2]=emitter.position.z+direction.z*Math.random()*.12
    velocities[o]=direction.x*speed+emitter.inherit.x;velocities[o+1]=direction.y*speed+emitter.inherit.y;velocities[o+2]=direction.z*speed+emitter.inherit.z
    ages[i]=0;lives[i]=.7+Math.random()*.9
  }
  return {
    points,
    update(dt,emitters,height=600) {
      material.uniforms.uScale.value=height
      for(const emitter of emitters){
        emitter.carry=(emitter.carry||0)+emitter.rate*dt
        while(emitter.carry>=1){spawn(emitter);emitter.carry-=1}
      }
      const drag=Math.exp(-dt*1.9)
      for(let i=0;i<capacity;i++){
        if(ages[i]>=1)continue
        ages[i]+=dt/lives[i]
        const o=i*3
        velocities[o]*=drag;velocities[o+1]=velocities[o+1]*drag+dt*.5;velocities[o+2]*=drag
        positions[o]+=velocities[o]*dt;positions[o+1]+=velocities[o+1]*dt;positions[o+2]+=velocities[o+2]*dt
      }
      geometry.attributes.position.needsUpdate=true;geometry.attributes.age.needsUpdate=true
    },
    clear(){ages.fill(1);geometry.attributes.age.needsUpdate=true},
    dispose(){scene.remove(points);geometry.dispose();material.dispose()},
  }
}
