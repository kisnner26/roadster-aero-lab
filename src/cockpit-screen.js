import * as THREE from 'three'
import {screenHomography} from './screen-projection.js'

export function screenFocusFov(aspect) {
  const fraction=.82*Math.min(1,aspect/(.365/.205))
  return THREE.MathUtils.radToDeg(2*Math.atan(.205/(2*.589*fraction)))
}

// Project the mesh corners in pixel space without a nested CSS camera. The
// official player stays a real DOM iframe; no video capture or proxy is involved.
export function createCockpitScreen(car,element,container) {
  const overlay=document.createElement('div');overlay.className='cockpit-dom'
  element.style.position='absolute';element.style.transformOrigin='0 0';element.style.left='0';element.style.top='0'
  overlay.append(element);container.append(overlay)
  const position=new THREE.Vector3(),normal=new THREE.Vector3(),toward=new THREE.Vector3(),rotation=new THREE.Quaternion()
  const corners=Array.from({length:4},()=>new THREE.Vector3())
  const local=[[-.365/2,.205/2],[.365/2,.205/2],[.365/2,-.205/2],[-.365/2,-.205/2]]
  let width=container.clientWidth,height=container.clientHeight,lastVisible,lastInteractive,lastTransform=''
  const observer=new ResizeObserver(entries=>{width=entries[0].contentRect.width;height=entries[0].contentRect.height})
  observer.observe(container)
  function render(scene,camera,{interactive=false,allowed=true}={}) {
    overlay.scrollLeft=0;overlay.scrollTop=0;container.scrollLeft=0;container.scrollTop=0
    camera.updateMatrixWorld();car.screenSurface.updateWorldMatrix(true,false)
    car.screenSurface.getWorldPosition(position);car.screenSurface.getWorldQuaternion(rotation)
    normal.set(0,0,1).applyQuaternion(rotation);toward.copy(camera.position).sub(position)
    let visible=allowed&&toward.length()<2.6&&normal.dot(toward.normalize())>.2
    if(visible){
      corners.forEach((corner,i)=>{corner.set(...local[i],.0015).applyMatrix4(car.screenSurface.matrixWorld).project(camera);corner.x=(corner.x*.5+.5)*width;corner.y=(-corner.y*.5+.5)*height})
      const matrix=screenHomography(corners)
      visible=Boolean(matrix)&&corners.every(corner=>corner.z>=-1&&corner.z<=1)
      if(visible){const transform=`matrix3d(${matrix.join(',')})`;if(transform!==lastTransform){element.style.transform=transform;lastTransform=transform}}
    }
    if(visible!==lastVisible){overlay.hidden=!visible;overlay.setAttribute('aria-hidden',String(!visible));element.dataset.visible=String(visible);lastVisible=visible}
    const enabled=visible&&interactive
    if(enabled!==lastInteractive){element.inert=!enabled;element.style.pointerEvents=enabled?'auto':'none';element.dataset.focused=String(enabled);lastInteractive=enabled}
  }
  return {render,hide(){overlay.hidden=true;element.inert=true;element.dataset.visible='false';lastVisible=false;lastInteractive=false},dispose(){observer.disconnect();overlay.remove()}}
}
