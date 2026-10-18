import * as THREE from 'three'

// Bake static boxes by material while preserving their parent-space transforms.
export function createBoxBatch(root) {
  const buckets=new Map(),geometry=new THREE.BoxGeometry(1,1,1)
  const position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion()
  return {
    add(size,location,material,parent=root,castShadow=true){
      const key=`${material.id}/${castShadow}`
      if(!buckets.has(key))buckets.set(key,{material,castShadow,entries:[]})
      const matrix=new THREE.Matrix4().compose(position.fromArray(location),rotation,scale.fromArray(size))
      buckets.get(key).entries.push({parent,matrix})
    },
    flush(){
      root.updateWorldMatrix(true,true)
      const inverse=root.matrixWorld.clone().invert(),matrix=new THREE.Matrix4(),meshes=[]
      for(const {material,castShadow,entries} of buckets.values()){
        const mesh=new THREE.InstancedMesh(geometry,material,entries.length)
        entries.forEach((entry,i)=>{matrix.copy(inverse).multiply(entry.parent.matrixWorld).multiply(entry.matrix);mesh.setMatrixAt(i,matrix)})
        mesh.castShadow=castShadow;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false
        mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh)
      }
      buckets.clear()
      return meshes
    },
  }
}
