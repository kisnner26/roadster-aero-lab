import {readFile} from 'node:fs/promises'
import {gzipSync} from 'node:zlib'

const dist=new URL('../dist/',import.meta.url)
const manifest=JSON.parse(await readFile(new URL('.vite/manifest.json',dist),'utf8'))
const budgets={index:[120000,45000],three:[650000,180000],gsap:[80000,32000],'three-driving':[20000,10000],'driving-world':[30000,14000]}
const failures=[],sizes=new Map()
async function size(path) {
  if(!sizes.has(path)){const contents=await readFile(new URL(path,dist));sizes.set(path,{bytes:contents.length,gzip:gzipSync(contents).length})}
  return sizes.get(path)
}
for(const [name,[rawLimit,gzipLimit]] of Object.entries(budgets)){
  const entry=Object.values(manifest).find(entry=>entry.name===name)
  if(!entry){failures.push(`falta el bloque ${name}`);continue}
  const measured=await size(entry.file)
  if(measured.bytes>rawLimit||measured.gzip>gzipLimit)failures.push(`${name} supera su presupuesto`)
}
const initial=new Set()
function collect(key) {
  if(initial.has(key))return
  const entry=manifest[key]
  if(!entry)throw Error(`importación ausente del manifiesto: ${key}`)
  initial.add(key)
  for(const dependency of entry.imports||[])collect(dependency)
}
if(!manifest['index.html']?.isEntry)failures.push('no hay una entrada html válida')
else collect('index.html')
let initialGzip=0
for(const key of initial){
  const entry=manifest[key];initialGzip+=(await size(entry.file)).gzip
  if(entry.name==='three-driving'||entry.name==='driving-world')failures.push(`${entry.name} dejó de ser diferido`)
  for(const css of entry.css||[]){const measured=await size(css);if(measured.bytes>45000||measured.gzip>11000)failures.push(`${css} supera el presupuesto css`)}
}
if(!manifest['src/driving-world.js']?.isDynamicEntry)failures.push('el mundo de conducción no es una entrada dinámica')
if(initialGzip>240000)failures.push('el javascript inicial supera 240000 bytes gzip')
console.log(JSON.stringify({initialJsGzipBytes:initialGzip,assets:Object.fromEntries(sizes),failures},null,2))
if(failures.length)process.exitCode=1
