import test from 'node:test'
import assert from 'node:assert/strict'
import {renderRatio,createFrameBudget} from '../src/render-quality.js'

test('el render respeta la densidad nativa y el presupuesto de píxeles',()=>{
  assert.equal(renderRatio(1000,1000,1),1)
  assert.equal(renderRatio(1000,1000,3,'quality'),2)
  for(const [mode,budget] of [['auto',2500000],['quality',4000000],['performance',1100000]]){
    const ratio=renderRatio(3840,2160,3,mode)
    assert.ok(3840*2160*ratio**2<=budget+1)
  }
  assert.equal(renderRatio(100,100,NaN),1)
})
test('la resolución se adapta solo ante presión sostenida y se recupera despacio',()=>{
  const budget=createFrameBudget()
  for(let t=1;t<2500;t+=33)budget.sample(t)
  assert.ok(budget.scale<1)
  const reduced=budget.scale
  for(let t=2500;t<3300;t+=16.67)budget.sample(t)
  assert.equal(budget.scale,reduced)
  for(let t=3300;t<24000;t+=16.67)budget.sample(t)
  assert.equal(budget.scale,1)
})
test('cambiar de pestaña no reduce la resolución',()=>{
  const budget=createFrameBudget()
  for(let t=1;t<20000;t+=1000)budget.sample(t)
  assert.equal(budget.scale,1)
  budget.reset();assert.equal(budget.average,0)
})
