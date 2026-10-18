const videoIdPattern=/^[a-zA-Z0-9_-]{11}$/

export function youtubeVideo(value) {
  const input=value.trim()
  if(videoIdPattern.test(input))return {id:input,start:0}
  let url
  try{url=new URL(input)}catch{throw new Error('pega un enlace de youtube o un identificador de vídeo válido.')}
  if(url.protocol!=='https:'||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname)||url.username||url.password)throw new Error('el enlace debe pertenecer a youtube y usar https.')
  const segments=url.pathname.split('/').filter(Boolean)
  const id=url.hostname==='youtu.be'?segments[0]:['shorts','embed','live'].includes(segments[0])?segments[1]:url.searchParams.get('v')
  if(!videoIdPattern.test(id||''))throw new Error('no se encontró un vídeo en ese enlace; usa un enlace de vídeo, no un canal.')
  const time=url.searchParams.get('t')||url.searchParams.get('start')||'0'
  const match=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time)
  const start=/^\d+$/.test(time)?Number(time):match?Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0):0
  return {id,start:Math.min(86400,start)}
}

export function webTarget(value) {
  const input=value.trim()
  if(!input)throw new Error('escribe una búsqueda o una dirección web.')
  if(input.length>2048)throw new Error('la dirección o búsqueda es demasiado larga.')
  const looksLikeUrl=/^[a-z][a-z\d+.-]*:/i.test(input)||/^[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/.test(input)
  if(!looksLikeUrl)return {kind:'search',url:`https://www.google.com/search?q=${encodeURIComponent(input)}`,label:input}
  let url
  try{url=new URL(/^[a-z][a-z\d+.-]*:/i.test(input)?input:`https://${input}`)}catch{throw new Error('esa dirección no es válida.')}
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('solo se admiten direcciones https sin credenciales.')
  const host=url.hostname.toLowerCase()
  if(!host.includes('.')||host.endsWith('.local')||host.endsWith('.localhost')||host.startsWith('[')||/^\d+(\.\d+){3}$/.test(host))throw new Error('usa una dirección pública, no una dirección de red local.')
  return {kind:'url',url:url.href,label:host}
}

export function readCabinSettings(storage) {
  const defaults={temperature:21,brightness:90,volume:65,light:50}
  try {
    const saved=JSON.parse(storage.getItem('roadster-cabin-v1'))||{}
    for(const [name,min,max] of [['temperature',16,28],['brightness',35,100],['volume',0,100],['light',0,100]]) {
      if(typeof saved[name]==='number'&&Number.isFinite(saved[name]))defaults[name]=Math.min(max,Math.max(min,saved[name]))
    }
  }catch{ /* storage can be unavailable in private or restricted contexts. */ }
  return defaults
}
