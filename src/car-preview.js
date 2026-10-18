import * as THREE from 'three'

// Render the actual mesh into a small, transparent display without a second WebGL context.
export function createCarPreview(renderer,car,environment) {
  const scene=new THREE.Scene();scene.environment=environment
  const model=car.root.clone(true);model.position.set(0,0,0);model.rotation.set(0,0,0);scene.add(model)
  model.traverse(object=>{
    if(object.isLine||object.isPoints)object.visible=false
    if(!object.isMesh)return
    if(object.material===car.plumeMaterial){object.visible=false;return}
    const copy=material=>material.clone()
    object.material=Array.isArray(object.material)?object.material.map(copy):copy(object.material)
  })
  scene.add(new THREE.HemisphereLight(0xdce9f5,0x101821,2))
  const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(-3,5,4);scene.add(light)
  const camera=new THREE.PerspectiveCamera(34,1.6,.1,40);camera.position.set(-4.2,2.3,4.2);camera.lookAt(0,.55,0)
  const target=new THREE.WebGLRenderTarget(480,300),pixels=new Uint8Array(480*300*4),oldColor=new THREE.Color()
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=300;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','vista del modelo 3d del roadster')
  function draw() {
    const previousTarget=renderer.getRenderTarget(),alpha=renderer.getClearAlpha(),exposure=renderer.toneMappingExposure
    renderer.getClearColor(oldColor)
    const source=[],clones=[];car.root.traverse(object=>source.push(object));model.traverse(object=>clones.push(object))
    for(let i=1;i<source.length;i++)if(source[i].type==='Group'){clones[i].rotation.copy(source[i].rotation);clones[i].position.copy(source[i].position)}
    renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.toneMappingExposure=1.2;renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,480,300,pixels)
    renderer.setRenderTarget(previousTarget);renderer.setClearColor(oldColor,alpha);renderer.toneMappingExposure=exposure
    const context=canvas.getContext('2d'),image=context.createImageData(480,300)
    for(let row=0;row<300;row++)image.data.set(pixels.subarray((299-row)*480*4,(300-row)*480*4),row*480*4)
    context.putImageData(image,0,0)
  }
  draw()
  return {canvas,draw}
}
