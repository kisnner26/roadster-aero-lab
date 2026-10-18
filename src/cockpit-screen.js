import * as THREE from 'three'
import {CSS3DObject,CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js'

export function screenFocusFov(aspect) {
  const fraction=.82*Math.min(1,aspect/(.365/.205))
  return THREE.MathUtils.radToDeg(2*Math.atan(.205/(2*.589*fraction)))
}

// DOM and WebGL share the same camera and the monitor's world transform.
// No video capture/proxy is involved: the official iframe is the physical screen.
export function createCockpitScreen(car,element,container) {
  const renderer=new CSS3DRenderer();renderer.domElement.className='cockpit-dom'
  renderer.domElement.style.pointerEvents='none';container.append(renderer.domElement)
  const object=new CSS3DObject(element);object.scale.set(.365/1024,.205/576,1);object.position.z=.0015;car.screenSurface.add(object)
  const position=new THREE.Vector3(),normal=new THREE.Vector3(),toward=new THREE.Vector3(),rotation=new THREE.Quaternion()
  let width=container.clientWidth,height=container.clientHeight,lastVisible,lastInteractive
  renderer.setSize(width,height)
  const observer=new ResizeObserver(entries=>{const {width:w,height:h}=entries[0].contentRect;if(w!==width||h!==height){width=w;height=h;renderer.setSize(width,height)}})
  observer.observe(container)
  function render(scene,camera,{interactive=false,allowed=true}={}) {
    // Focus/iframe navigation must not scroll a hidden-overflow projection layer.
    renderer.domElement.scrollLeft=0;renderer.domElement.scrollTop=0;container.scrollLeft=0;container.scrollTop=0
    camera.updateMatrixWorld();car.screenSurface.updateWorldMatrix(true,false)
    car.screenSurface.getWorldPosition(position);car.screenSurface.getWorldQuaternion(rotation)
    normal.set(0,0,1).applyQuaternion(rotation);toward.copy(camera.position).sub(position)
    const visible=allowed&&toward.length()<2.6&&normal.dot(toward.normalize())>.2
    if(visible!==lastVisible){renderer.domElement.hidden=!visible;renderer.domElement.setAttribute('aria-hidden',String(!visible));element.dataset.visible=String(visible);lastVisible=visible}
    const enabled=visible&&interactive
    if(enabled!==lastInteractive){element.inert=!enabled;element.style.pointerEvents=enabled?'auto':'none';element.dataset.focused=String(enabled);lastInteractive=enabled}
    if(visible)renderer.render(scene,camera)
  }
  return {render,hide(){renderer.domElement.hidden=true;element.inert=true;element.dataset.visible='false';lastVisible=false;lastInteractive=false},dispose(){observer.disconnect();object.removeFromParent();renderer.domElement.remove()}}
}
