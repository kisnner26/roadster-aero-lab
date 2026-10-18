export const renderModes=['auto','quality','performance']
const profiles={auto:{dpr:1.75,pixels:2500000},quality:{dpr:2,pixels:4000000},performance:{dpr:1,pixels:1100000}}

export function renderRatio(width,height,dpr=1,mode='auto',scale=1) {
  const profile=profiles[mode]||profiles.auto
  const area=Math.max(1,width)*Math.max(1,height)
  return Math.min(Number.isFinite(dpr)&&dpr>0?dpr:1,profile.dpr,Math.sqrt(profile.pixels/area))*Math.max(.6,Math.min(1,scale))
}

// Long tasks and tab switches are not sustained GPU pressure; ignore those gaps.
export function createFrameBudget() {
  let previous=0,slow=0,fast=0,scale=1,average=0
  return {
    get scale(){return scale},get average(){return average},
    reset(){previous=0;slow=0;fast=0;scale=1;average=0},
    sample(stamp){
      const delta=previous?stamp-previous:0;previous=stamp
      if(delta<=0||delta>200){slow=0;fast=0;return false}
      average=average?average*.95+delta*.05:delta
      slow=average>25?slow+delta:0;fast=average<18?fast+delta:0
      if(slow>2000&&scale>.6){scale=Math.max(.6,scale-.1);slow=0;fast=0;return true}
      if(fast>6000&&scale<1){scale=Math.min(1,scale+.1);slow=0;fast=0;return true}
      return false
    },
  }
}

export function createRenderQuality(renderer,canvas) {
  const budget=createFrameBudget()
  let mode='auto',width=1,height=1,ratio=0,lastReport=0
  try{const saved=localStorage.getItem('roadster-render-mode');if(renderModes.includes(saved))mode=saved}catch{ /* preferences are optional */ }
  function resize(w=width,h=height) {
    width=Math.max(1,w);height=Math.max(1,h)
    const next=renderRatio(width,height,devicePixelRatio,mode,mode==='auto'?budget.scale:1)
    if(Math.abs(next-ratio)>.001){ratio=next;renderer.setPixelRatio(ratio)}
    renderer.setSize(width,height,false)
    canvas.dataset.renderMode=mode;canvas.dataset.renderRatio=ratio.toFixed(2)
  }
  return {
    resize,get mode(){return mode},get ratio(){return ratio},
    setMode(next){if(!renderModes.includes(next))return;mode=next;budget.reset();try{localStorage.setItem('roadster-render-mode',mode)}catch{ /* preferences are optional */ }resize()},
    frame(stamp){if(budget.sample(stamp)&&mode==='auto')resize()},
    capture(stamp=performance.now()){
      if(stamp-lastReport<1000)return
      lastReport=stamp
      canvas.dataset.drawCalls=String(renderer.info.render.calls)
      canvas.dataset.triangles=String(renderer.info.render.triangles)
      canvas.dataset.frameMs=budget.average.toFixed(1)
    },
  }
}
