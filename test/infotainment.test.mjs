import test from 'node:test'
import assert from 'node:assert/strict'
import {youtubeVideo,webTarget,readCabinSettings} from '../src/infotainment-utils.js'

test('youtube admite watch, shorts, enlaces cortos e instantes',()=>{
  assert.deepEqual(youtubeVideo('https://youtu.be/oCvC70oIS5w?t=1m24s'),{id:'oCvC70oIS5w',start:84})
  for(const url of ['https://www.youtube.com/watch?v=oCvC70oIS5w','https://youtube.com/shorts/oCvC70oIS5w','oCvC70oIS5w'])assert.equal(youtubeVideo(url).id,'oCvC70oIS5w')
})
test('youtube rechaza dominios falsos, protocolos y canales',()=>{
  for(const url of ['https://youtube.com.evil.test/watch?v=oCvC70oIS5w','javascript:alert(1)','https://youtube.com/@tesla','https://user:pass@youtube.com/watch?v=oCvC70oIS5w'])assert.throws(()=>youtubeVideo(url))
})
test('el navegador separa búsquedas de direcciones https',()=>{
  assert.equal(webTarget('tesla aerodinámica').url,'https://www.google.com/search?q=tesla%20aerodin%C3%A1mica')
  assert.equal(webTarget('example.com/path?a=1').url,'https://example.com/path?a=1')
  assert.equal(webTarget('https://www.tesla.com/roadster').kind,'url')
})
test('no admite scripts, credenciales, archivos ni redes locales',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///test','http://example.com','https://127.0.0.1','https://localhost','https://router.local','https://user:pass@example.com',''])assert.throws(()=>webTarget(url))
})
test('las preferencias resisten datos corruptos y rangos inválidos',()=>{
  assert.equal(readCabinSettings({getItem:()=>'{'}).temperature,21)
  assert.deepEqual(readCabinSettings({getItem:()=>'{"temperature":999,"volume":-5,"brightness":"no","light":0}'}),{temperature:28,volume:0,brightness:90,light:0})
  assert.equal(readCabinSettings({getItem:()=>{throw Error('blocked')}}).volume,65)
})
