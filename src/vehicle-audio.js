const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))

export function createVehicleAudio(onChange=()=>{},{createContext=()=>new AudioContext(),page=document}={}) {
  let context,master,motor,wind,road,skid,jet,enabled=false,driving=false,compressor,level=.65
  let requested=false,revision=0
  const tones=[]
  const targets=new WeakMap()
  function target(param,value,time,constant){
    if(targets.get(param)===value)return
    param.setTargetAtTime(value,time,constant);targets.set(param,value)
  }
  function noiseBuffer() {
    const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0)
    let seed=7391,smoothed=0
    for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;const white=seed/4294967296*2-1;smoothed=.84*smoothed+.16*white;data[i]=smoothed*2}
    return buffer
  }
  function layer(buffer,type,frequency,q=1) {
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain()
    source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=0
    source.connect(filter);filter.connect(gain);gain.connect(master);source.start()
    return {source,filter,gain}
  }
  function build() {
    context=createContext();master=context.createGain();master.gain.value=0
    compressor=context.createDynamicsCompressor();compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=5
    master.connect(compressor);compressor.connect(context.destination)
    motor=context.createGain();motor.gain.value=0;motor.connect(master)
    for(const [ratio,volume,type] of [[1,.45,'sine'],[2.01,.13,'triangle'],[4.03,.035,'sine'],[.5,.38,'sine']]){
      const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.value=55*ratio;gain.gain.value=volume
      oscillator.connect(gain);gain.connect(motor);oscillator.start();tones.push({oscillator,ratio})
    }
    const noise=noiseBuffer();wind=layer(noise,'lowpass',500);road=layer(noise,'bandpass',350,.6);skid=layer(noise,'bandpass',1150,2.5);jet=layer(noise,'highpass',1700,.5)
  }
  function volume() {
    if(context)master.gain.setTargetAtTime(enabled&&!page.hidden?level:0,context.currentTime,.15)
    onChange(enabled)
  }
  async function setEnabled(value) {
    const request=++revision
    requested=Boolean(value)
    if(!requested){enabled=false;volume();return}
    try{
      if(!context)build()
      await context.resume()
      if(request!==revision)return
      enabled=true
      if(!driving)update({speed:0,throttle:0,slip:0})
      volume()
    }catch(error){
      if(request===revision){requested=false;enabled=false;volume()}
      throw error
    }
  }
  function update(state) {
    if(!context)return
    const time=context.currentTime,speed=Math.abs(state.speed),load=state.throttle||0
    const frequency=42+speed*6.4+load*38
    tones.forEach(({oscillator,ratio})=>target(oscillator.frequency,frequency*ratio,time,.12))
    target(motor.gain,driving?.025+load*.085+speed*.0007:.012,time,.15)
    target(wind.filter.frequency,260+speed*22,time,.18)
    target(wind.gain.gain,driving?Math.pow(Math.min(1,speed/112),1.7)*.33:0,time,.2)
    target(jet.gain.gain,driving?Math.min(1,(state.boost||0)+(state.lift||0)+(state.assist||0)*.4)*.25:0,time,.07)
    target(road.filter.frequency,state.offroad?1150:240+speed*9,time,.1)
    target(road.gain.gain,driving?clamp(speed/50,0,1)* (state.offroad?.33:.12):0,time,.12)
    target(skid.gain.gain,driving?clamp(state.slip||0,0,1)*.18:0,time,.07)
  }
  function door() {
    if(!context||!enabled)return
    const t=context.currentTime,oscillator=context.createOscillator(),gain=context.createGain()
    oscillator.type='triangle';oscillator.frequency.setValueAtTime(190,t);oscillator.frequency.exponentialRampToValueAtTime(95,t+.7)
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.025,t+.08);gain.gain.exponentialRampToValueAtTime(.0001,t+.8)
    oscillator.connect(gain);gain.connect(master);oscillator.start(t);oscillator.stop(t+.85)
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}
  }
  page.addEventListener('visibilitychange',volume)
  return {get enabled(){return enabled},setEnabled,setVolume(value){level=clamp(value,0,1);volume()},toggle:()=>setEnabled(!requested),setDriving(value){driving=value;update({speed:0,throttle:0,slip:0})},update,door}
}
