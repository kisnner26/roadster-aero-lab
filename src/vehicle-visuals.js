export function vehicleVisualTargets(state) {
  const speed=Math.abs(state.speed)
  const brake=Math.max(state.brake||0,state.grounded&&speed>1&&(state.throttle||0)<.01?.2:0)
  return {brakeLight:.75+brake*1.25,wingHeight:-.19+Math.min(.19,speed/60*.19)+(state.brake||0)*.055,wingPitch:-(state.brake||0)*.16,reverse:state.gear===-1}
}
