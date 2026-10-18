const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:0))

export function steeringAxis(value,deadzone=.12) {
  const axis=clamp(value,-1,1),magnitude=Math.abs(axis)
  return magnitude<=deadzone?0:Math.sign(axis)*(magnitude-deadzone)/(1-deadzone)
}

// Reuse the sample: polling must not allocate a new input object each frame.
export function createGamepadInput() {
  const sample={throttle:0,brake:0,steer:0,boost:false,lift:false,disconnected:false}
  let index=null,armed=false
  function reset(){armed=false}
  function read(pads=[]) {
    sample.throttle=0;sample.brake=0;sample.steer=0;sample.boost=false;sample.lift=false;sample.disconnected=false
    let pad=index===null?null:pads[index]
    if(index!==null&&(!pad||pad.connected===false)){
      index=null;armed=false;sample.disconnected=true;return sample
    }
    if(!pad){
      for(let i=0;i<pads.length;i++){
        if(pads[i]?.connected!==false&&pads[i]?.mapping==='standard'){pad=pads[i];index=i;armed=false;break}
      }
    }
    if(!pad)return sample
    const throttle=clamp(pad.buttons?.[7]?.value,0,1),brake=clamp(pad.buttons?.[6]?.value,0,1)
    const steer=steeringAxis(pad.axes?.[0]),boost=Boolean(pad.buttons?.[0]?.pressed),lift=Boolean(pad.buttons?.[1]?.pressed)
    // Require release after pause/reset/reconnect, never inherit a held trigger.
    if(!armed){armed=throttle<=.05&&brake<=.05&&steer===0&&!boost&&!lift;return sample}
    sample.throttle=throttle;sample.brake=brake;sample.steer=steer;sample.boost=boost;sample.lift=lift
    return sample
  }
  return {read,reset}
}
