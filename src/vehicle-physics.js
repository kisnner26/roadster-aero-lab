export const vehicleConfig={wheelbase:2.7,wheelRadius:.355,maxSpeed:69,reverseLimit:4,grip:9.3}

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const approach=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt))

export function createVehicleState(x=0,z=0,heading=0) {
  return {x,z,heading,speed:0,vx:0,vz:0,steer:0,yawRate:0,distance:0,acceleration:0,lateral:0,slip:0,gear:1,offroad:false,throttle:0,brake:0}
}

// illustrative bicycle model: limited tire grip, power falloff, drag and regenerative braking.
export function stepVehicle(state,input,dt,roadDistance=0) {
  dt=clamp(dt,0,1/30)
  state.offroad=roadDistance>7.1
  const speed=Math.abs(state.speed)
  const throttle=clamp(input.throttle||0,0,1),brake=clamp(input.brake||0,0,1)
  const steerLimit=.5/(1+speed/24)
  state.steer=approach(state.steer,clamp(input.steer||0,-1,1)*steerLimit,7,dt)
  const availableGrip=vehicleConfig.grip*(state.offroad?.55:1)
  const resistance=.12+.00045*speed*speed+(state.offroad?1.2+speed*.065:0)
  const regen=throttle<.01&&speed>.15?1.1:0
  const drive=Math.min(availableGrip,throttle*(state.gear===1?7.4/(1+speed/31):3.2))
  const deceleration=Math.min(availableGrip,brake*11.2+(input.handbrake?5.5:0)+regen)+resistance
  const previous=state.speed
  const direction=Math.sign(state.speed)||state.gear
  const next=state.speed+(drive*state.gear-deceleration*direction)*dt
  state.speed=previous&&Math.sign(next)!==Math.sign(previous)&&deceleration>=drive?0:next
  if(speed<.05&&drive<deceleration)state.speed=0
  state.speed=clamp(state.speed,-vehicleConfig.reverseLimit,vehicleConfig.maxSpeed)
  const grip=availableGrip*(input.handbrake?.52:1)
  const requested=state.speed/vehicleConfig.wheelbase*Math.tan(state.steer)
  const maxYaw=grip/Math.max(Math.abs(state.speed),1)
  state.yawRate=approach(state.yawRate,clamp(requested,-maxYaw,maxYaw),input.handbrake?3.5:9,dt)
  state.heading+=state.yawRate*dt
  const targetX=Math.cos(state.heading)*state.speed,targetZ=Math.sin(state.heading)*state.speed
  const alignment=state.offroad?5:input.handbrake?2.2:14
  state.vx=approach(state.vx,targetX,alignment,dt);state.vz=approach(state.vz,targetZ,alignment,dt)
  if(state.speed===0&&brake>0){state.vx=0;state.vz=0}
  state.x+=state.vx*dt;state.z+=state.vz*dt
  state.distance+=state.speed*dt
  state.acceleration=(state.speed-previous)/Math.max(dt,.0001)
  state.lateral=state.speed*state.yawRate
  state.slip=clamp(Math.abs(requested)-maxYaw,0,1)+(input.handbrake&&speed>3?.6:0)
  state.throttle=throttle;state.brake=brake
  return state
}
