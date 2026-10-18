// Exact nearest-sample lookup, indexed once instead of scanning the circuit at 120 hz.
export function createTrackQuery(points,normals,{stride=2}={}) {
  if(!points.length||!Number.isInteger(stride)||stride<1)throw Error('índice de circuito inválido')
  const samples=[],count=Math.ceil(points.length/stride)
  const xs=new Float64Array(count),zs=new Float64Array(count),indices=new Uint32Array(count),axes=new Uint8Array(count),left=new Int32Array(count),right=new Int32Array(count)
  let nextNode=0
  let previousX,previousZ,previous,best,nearest
  for(let index=0;index<points.length;index+=stride){
    samples.push(index)
  }
  function build(entries,depth=0){
    if(!entries.length)return -1
    const axis=depth%2?'z':'x';entries.sort((a,b)=>points[a][axis]-points[b][axis]||a-b)
    const middle=Math.floor(entries.length/2),index=entries[middle],node=nextNode++
    xs[node]=points[index].x;zs[node]=points[index].z;indices[node]=index;axes[node]=depth%2
    left[node]=build(entries.slice(0,middle),depth+1);right[node]=build(entries.slice(middle+1),depth+1)
    return node
  }
  const tree=build(samples)
  function visit(node,x,z){
    if(node<0)return
    const dx=x-xs[node],dz=z-zs[node],distance=dx*dx+dz*dz
    if(distance<best||distance===best&&indices[node]<indices[nearest]){best=distance;nearest=node}
    const delta=axes[node]?dz:dx
    visit(delta<0?left[node]:right[node],x,z)
    if(delta*delta<=best)visit(delta<0?right[node]:left[node],x,z)
  }
  return (x,z)=>{
    if(x===previousX&&z===previousZ)return previous
    best=Infinity;nearest=tree;visit(tree,x,z)
    const index=indices[nearest]
    previousX=x;previousZ=z;previous={distance:Math.sqrt(best),index,point:points[index],normal:normals[index]}
    return previous
  }
}
