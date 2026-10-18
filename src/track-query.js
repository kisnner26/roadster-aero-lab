// Exact nearest-sample lookup, indexed once instead of scanning the circuit at 120 hz.
export function createTrackQuery(points,normals,{stride=2,cellSize=32}={}) {
  if(!points.length||stride<1||cellSize<=0)throw Error('índice de circuito inválido')
  const cells=new Map(),samples=[]
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,previousX,previousZ,previous
  for(let index=0;index<points.length;index+=stride){
    const point=points[index],x=Math.floor(point.x/cellSize),z=Math.floor(point.z/cellSize),key=`${x},${z}`
    const sample={point,normal:normals[index],index};samples.push(sample)
    if(!cells.has(key))cells.set(key,[])
    cells.get(key).push(sample)
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z)
  }
  return (x,z)=>{
    if(x===previousX&&z===previousZ)return previous
    let best=Infinity,nearest=samples[0]
    function visit(sample){const distance=(sample.point.x-x)**2+(sample.point.z-z)**2;if(distance<best||distance===best&&sample.index<nearest.index){best=distance;nearest=sample}}
    const cx=Math.floor(x/cellSize),cz=Math.floor(z/cellSize)
    if(cx<minX||cx>maxX||cz<minZ||cz>maxZ){for(const sample of samples)visit(sample)}
    else {
      const limit=Math.max(cx-minX,maxX-cx,cz-minZ,maxZ-cz)
      for(let radius=0;radius<=limit;radius++){
        for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
          if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue
          for(const sample of cells.get(`${cx+dx},${cz+dz}`)||[])visit(sample)
        }
        const edge=Math.min(x-(cx-radius)*cellSize,(cx+radius+1)*cellSize-x,z-(cz-radius)*cellSize,(cz+radius+1)*cellSize-z)
        if(best<edge*edge)break
      }
    }
    previousX=x;previousZ=z;previous={distance:Math.sqrt(best),...nearest}
    return previous
  }
}
