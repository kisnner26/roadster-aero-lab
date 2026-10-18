export const stuntRamps=[{x:900,z:0,length:32,width:12,height:6},{x:1034,z:0,length:60,width:14,height:6,landing:true},{x:900,z:30,length:34,width:12,height:8},{x:1120,z:-30,length:24,width:12,height:18,curved:true}]
export const stuntVehicles=[...Array.from({length:5},(_,i)=>({id:i,x:960+i*10,z:0,length:4.7,width:2,height:1.45})),{id:5,x:975,z:30,length:16,width:2.7,height:4.1}]
export const inStuntArea=(x,z)=>x>500&&x<2900&&Math.abs(z)<130
export const stuntLoop={x:1120,z:-60,radius:18,width:12}

// Constrained arcade contact track. Suction allows low-speed inverted contact;
// this is not a finite-element model of Tesla's fan or suspension system.
export function stepExhibitionLoop(state,dt) {
  state.loopCooldown=Math.max(0,(state.loopCooldown||0)-dt)
  if(state.loopAngle===undefined||state.loopAngle===null){
    if(state.loopCooldown||!state.grounded||state.speed<5||Math.cos(state.heading)<.8||Math.abs(state.x-stuntLoop.x)>2||Math.abs(state.z-stuntLoop.z)>4)return false
    state.loopAngle=0
  }
  const angle=state.loopAngle
  state.speed=Math.max(0,state.speed-9.81*Math.sin(angle)*dt)
  // A car that stalls on the climb must come off the track instead of hanging there forever.
  if(state.speed<.3&&angle>.05&&angle<Math.PI){state.grounded=false;state.loopAngle=null;state.loopCooldown=3;state.vx=state.speed;state.vz=0;state.vy=0;state.pitch=0;state.jumps++;return true}
  state.x=stuntLoop.x+stuntLoop.radius*Math.sin(angle);state.z=stuntLoop.z
  state.y=.028+stuntLoop.radius*(1-Math.cos(angle));state.pitch=angle;state.roll=0;state.heading=0
  state.vx=state.speed*Math.cos(angle);state.vz=0;state.vy=state.speed*Math.sin(angle)
  if(!state.suction&&angle>Math.PI*.55&&angle<Math.PI*1.45&&state.speed**2/stuntLoop.radius<9.81){state.grounded=false;state.loopAngle=null;state.loopCooldown=3;state.jumps++;return true}
  state.grounded=true;state.loopAngle+=state.speed/stuntLoop.radius*dt
  if(state.loopAngle>=Math.PI*2){state.loopAngle=null;state.loopCooldown=3;state.x=stuntLoop.x+3;state.y=.028;state.pitch=0;state.vy=0;state.vx=state.speed}
  return true
}

export function stuntSurface(x,z,heading=0) {
  for(const ramp of stuntRamps){
    if(x<ramp.x||x>ramp.x+ramp.length||Math.abs(z-ramp.z)>ramp.width/2)continue
    const t=(x-ramp.x)/ramp.length,slope=ramp.height/ramp.length*(ramp.landing?-1:ramp.curved?2*t:1)
    return {height:.028+ramp.height*(ramp.landing?1-t:ramp.curved?t*t:t),slope:slope*Math.cos(heading)}
  }
  return {height:.028,slope:0}
}

export function collideStuntVehicles(state) {
  for(const car of stuntVehicles){
    if(Math.abs(state.x-car.x)>car.length/2+1.7||Math.abs(state.z-car.z)>car.width/2+.8)continue
    if(state.y>car.height+.15){state.cleared=Math.max(state.cleared,car.id+1);continue}
    // Recoverable capsule/box contact, with no claim of crash or deformation simulation.
    const side=state.x<car.x?-1:1;state.x=car.x+side*(car.length/2+1.8)
    state.speed*=.12;state.vx*=.12;state.vz*=.12;state.crashed=true
  }
}
