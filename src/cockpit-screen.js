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
  let width=0,height=0
  function render(scene,camera,{interactive=false,allowed=true}={}) {
    if(width!==container.clientWidth||height!==container.clientHeight){width=container.clientWidth;height=container.clientHeight;renderer.setSize(width,height)}
    camera.updateMatrixWorld();car.screenSurface.updateWorldMatrix(true,false)
    car.screenSurface.getWorldPosition(position);car.screenSurface.getWorldQuaternion(rotation)
    normal.set(0,0,1).applyQuaternion(rotation);toward.copy(camera.position).sub(position)
    const visible=allowed&&toward.length()<2.6&&normal.dot(toward.normalize())>.2
    renderer.domElement.hidden=!visible;renderer.domElement.setAttribute('aria-hidden',String(!visible))
    element.inert=!visible||!interactive;element.style.pointerEvents=visible&&interactive?'auto':'none'
    element.dataset.focused=String(interactive)
    if(visible)renderer.render(scene,camera)
  }
  return {render,hide(){renderer.domElement.hidden=true;element.inert=true}}
}
