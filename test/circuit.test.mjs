import test from 'node:test'
import assert from 'node:assert/strict'
import {createCircuit} from '../src/circuit.js'

test('el minimapa comparte el trazado sin construir el entorno gráfico',()=>{
  const circuit=createCircuit()
  assert.equal(createCircuit(),circuit)
  assert.equal(circuit.points.length,1101)
  assert.equal(circuit.normals.length,circuit.points.length)
  assert.ok(circuit.length>1400)
  assert.ok(circuit.mapPath.startsWith('M')&&circuit.mapPath.endsWith('Z'))
  assert.ok(circuit.normals.every(normal=>Math.abs(normal.length()-1)<1e-10))
})
