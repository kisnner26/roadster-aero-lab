export const vehicleConfig={wheelbase:2.7,wheelRadius:.355,maxSpeed:112,reverseLimit:4,grip:18.5,gravity:9.81,airCapacity:4}
export const augments=['performance','thrust','rocket']

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const approach=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt))

export function createVehicleState(x=0,z=0,heading=0) {
  return {x,z,heading,speed:0,vx:0,vz:0,steer:0,yawRate:0,distance:0,acceleration:0,lateral:0,slip:0,gear:1,offroad:false,throttle:0,brake:0,y:.028,vy:0,grounded:true,pitch:0,roll:0,pitchRate:0,rollRate:0,air:vehicleConfig.airCapacity,boost:0,lift:0,suction:true,augment:'rocket',gripLimit:vehicleConfig.grip,landing:0,jumps:0,cleared:0,crashed:false}
}

// illustrative bicycle model: limited tire grip, power falloff, drag and regenerative braking.
export function stepVehicle(state,input,dt,roadDistance=0) {
  dt=clamp(dt,0,1/30)
  const grounded=state.grounded
  state.offroad=roadDistance>7.1
  const speed=Math.abs(state.speed)
  const throttle=clamp(input.throttle||0,0,1),brake=clamp(input.brake||0,0,1)
  state.boost=input.boost&&state.air>0&&state.augment!=='performance'&&state.gear===1&&!brake?1:0
  state.lift=input.lift&&state.air>0&&state.augment==='rocket'?1:0
  state.assist=state.augment==='rocket'&&state.air>0&&Math.abs(input.steer||0)>.2&&speed>15?1:0
  const airUse=(Math.hypot(state.boost,state.lift)+state.assist*.12)*dt
  state.air=clamp(state.air-airUse,0,vehicleConfig.airCapacity)
  // Compressed-air replenishment is deliberately accelerated for this game.
  if(speed<.1&&grounded&&!airUse)state.air=Math.min(vehicleConfig.airCapacity,state.air+dt*.16)
  const steerLimit=.5/(1+speed/35)
  state.steer=approach(state.steer,clamp(input.steer||0,-1,1)*steerLimit,7,dt)
  const availableGrip=(vehicleConfig.grip*(state.suction?1:.67)*(1+Math.min(.28,speed*speed*.000035))+state.assist*3)*(state.offroad?.43:1)
  state.gripLimit=availableGrip
  const resistance=.12+.00045*speed*speed+(grounded&&state.offroad?1.2+speed*.065:0)
  const regen=grounded&&throttle<.01&&speed>.15?1.6:0
  const drive=grounded?Math.min(availableGrip,throttle*(1-brake)*(state.gear===1?17.9/(1+(speed/105)**2):3.2)):0
  const thrust=state.boost*(state.augment==='rocket'?30:15)
  const deceleration=(grounded?Math.min(availableGrip,brake*25+(input.handbrake?12:0)+regen):0)+resistance
  const previous=state.speed
  const direction=Math.sign(state.speed)||state.gear
  const next=state.speed+(drive*state.gear+thrust-deceleration*direction)*dt
  state.speed=previous&&Math.sign(next)!==Math.sign(previous)&&deceleration>=drive+thrust?0:next
  if(speed<.05&&drive+thrust<deceleration)state.speed=0
  state.speed=clamp(state.speed,-vehicleConfig.reverseLimit,vehicleConfig.maxSpeed)
  const grip=availableGrip*(input.handbrake?.52:1)
  const requested=grounded?state.speed/vehicleConfig.wheelbase*Math.tan(state.steer):0
  const maxYaw=grip/Math.max(Math.abs(state.speed),1)
  state.yawRate=grounded?clamp(approach(state.yawRate,clamp(requested,-maxYaw,maxYaw),input.handbrake?3.5:9,dt),-maxYaw,maxYaw):approach(state.yawRate,state.augment==='rocket'&&state.air>0?(input.steer||0)*.8:0,3,dt)
  state.heading+=state.yawRate*dt
  const targetX=Math.cos(state.heading)*state.speed,targetZ=Math.sin(state.heading)*state.speed
  const alignment=state.offroad?5:input.handbrake?2.2:24
  if(grounded){state.vx=approach(state.vx,targetX,alignment,dt);state.vz=approach(state.vz,targetZ,alignment,dt)}
  else {
    const drag=Math.exp(-dt*.00045*speed);state.vx*=drag;state.vz*=drag
    if(state.boost){state.vx+=Math.cos(state.heading)*Math.cos(state.pitch)*thrust*dt;state.vz+=Math.sin(state.heading)*Math.cos(state.pitch)*thrust*dt}
    const magnitude=Math.hypot(state.vx,state.vz)
    if(magnitude>vehicleConfig.maxSpeed){state.vx*=vehicleConfig.maxSpeed/magnitude;state.vz*=vehicleConfig.maxSpeed/magnitude}
    state.speed=Math.hypot(state.vx,state.vz)*direction
  }
  if(grounded&&state.speed===0&&brake>0){state.vx=0;state.vz=0}
  state.x+=state.vx*dt;state.z+=state.vz*dt
  state.distance+=state.speed*dt
  state.acceleration=(state.speed-previous)/Math.max(dt,.0001)
  state.lateral=grounded?state.speed*state.yawRate:0
  state.slip=clamp(Math.abs(requested)-maxYaw,0,1)+(input.handbrake&&speed>3?.6:0)
  state.throttle=throttle;state.brake=brake
  return state
}

// Ballistic flight and attitude controls are a game approximation, not certified flight physics.
export function stepVertical(state,input,dt,surface={height:.028,slope:0}) {
  const wasGrounded=state.grounded
  state.landing*=Math.exp(-dt*8)
  if(state.lift&&state.grounded){state.vy=6;state.grounded=false;state.jumps++}
  if(state.grounded){
    if(state.y>surface.height+.12&&state.vy>.1){state.grounded=false;state.jumps++}
    else{state.y=surface.height;state.vy=Math.max(0,state.speed*surface.slope);state.pitch=approach(state.pitch,Math.atan(surface.slope),20,dt);state.roll=approach(state.roll,0,10,dt)}
  }
  if(!state.grounded){
    state.vy+=((state.lift?14.5:0)+state.boost*30*Math.sin(state.pitch)-vehicleConfig.gravity)*dt;state.y+=state.vy*dt
    const attitude=state.augment==='rocket'&&state.air>0?1:0
    state.pitchRate=approach(state.pitchRate,(input.pitch||0)*1.4*attitude,4,dt);state.rollRate=approach(state.rollRate,(input.roll||0)*2.5*attitude,4,dt)
    state.pitch+=state.pitchRate*dt;state.roll+=state.rollRate*dt
    if(state.y<=surface.height&&state.vy<0){
      state.landing=Math.min(1,-state.vy/12);state.y=surface.height;state.vy=0;state.grounded=true;state.pitchRate=0;state.rollRate=0
      if(Math.abs(Math.atan2(Math.sin(state.roll),Math.cos(state.roll)))>1.1){state.speed*=.18;state.vx*=.18;state.vz*=.18;state.crashed=true}
      state.roll=0
    }
  }
  if(wasGrounded&&!state.grounded)state.crashed=false
  return state
}
