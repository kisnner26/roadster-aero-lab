import {performance} from 'node:perf_hooks'
import {createCircuit} from '../src/circuit.js'
import {createTrackQuery} from '../src/track-query.js'

const {points,normals}=createCircuit(),indexed=createTrackQuery(points,normals)
const queries=Array.from({length:12000},(_,i)=>{
  const index=i*17%points.length,offset=Math.sin(i*19.31)*25
  return {x:points[index].x+normals[index].x*offset,z:points[index].z+normals[index].z*offset}
})
function linear(x,z) {
  let best=Infinity,index=0
  for(let i=0;i<points.length;i+=2){const distance=(points[i].x-x)**2+(points[i].z-z)**2;if(distance<best){best=distance;index=i}}
  return index
}
for(const {x,z} of queries)if(indexed(x,z).index!==linear(x,z))throw Error('el índice cambió el resultado de una consulta')
function measure(query) {
  const timings=[]
  for(let run=0;run<5;run++){
    const start=performance.now()
    for(const {x,z} of queries)query(x,z)
    timings.push(performance.now()-start)
  }
  return timings.sort((a,b)=>a-b)[2]
}
const linearMs=measure(linear),indexedMs=measure(indexed)
console.log(JSON.stringify({queries:queries.length,equalResults:true,linearMedianMs:Number(linearMs.toFixed(2)),indexedMedianMs:Number(indexedMs.toFixed(2)),speedup:Number((linearMs/indexedMs).toFixed(2))},null,2))
