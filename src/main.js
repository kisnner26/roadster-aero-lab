import './styles.css'

const unitToggle = document.querySelector('.unit-toggle')
const unitOptions = [...document.querySelectorAll('.unit-option')]

unitToggle.addEventListener('click', () => {
  const imperial = unitToggle.getAttribute('aria-pressed') !== 'true'
  unitToggle.setAttribute('aria-pressed', String(imperial))
  unitOptions.forEach((option, index) => option.classList.toggle('is-active', index === Number(imperial)))
  document.querySelectorAll('[data-si]').forEach((element) => {
    element.textContent = element.dataset[imperial ? 'imperial' : 'si']
  })
})

const range = document.querySelector('#speed-control')
const output = document.querySelector('.flow-controls output strong')
const flowLab = document.querySelector('.flow-lab')
const regime = document.querySelector('.regime span:last-child')

function updateFlow() {
  const value = Number(range.value)
  const normalized = (value - 80) / 320
  output.textContent = value
  flowLab.style.setProperty('--flow-duration', `${Math.max(0.55, 2.8 - normalized * 2.1)}s`)
  regime.textContent = `régimen: ${value < 160 ? 'crucero' : value < 300 ? 'alta velocidad' : 'velocidad extrema'}`
}

range.addEventListener('input', updateFlow)
updateFlow()

const canvas = document.querySelector('#airflow-canvas')
const context = canvas.getContext('2d')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let particles = []
let animationFrame
let visible = true

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect()
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  particles = Array.from({ length: Math.min(72, Math.round(rect.width / 15)) }, (_, index) => ({
    x: Math.random() * rect.width,
    y: 34 + (index / 72) * rect.height * 0.72,
    speed: 0.7 + Math.random() * 0.8,
    length: 22 + Math.random() * 48,
  }))
}

function bodyOffset(x, width, y, height) {
  const center = width * 0.53
  const distance = Math.abs(x - center) / (width * 0.44)
  const envelope = Math.max(0, 1 - distance * distance)
  const lane = y / height
  if (lane > 0.28 && lane < 0.72) return -envelope * height * 0.16 * (1 - Math.abs(lane - 0.48))
  return 0
}

function drawAirflow() {
  if (!visible || reducedMotion.matches) return
  const rect = canvas.getBoundingClientRect()
  context.clearRect(0, 0, rect.width, rect.height)
  context.lineWidth = 1
  particles.forEach((particle) => {
    particle.x += particle.speed
    if (particle.x > rect.width + particle.length) particle.x = -particle.length
    const offset = bodyOffset(particle.x, rect.width, particle.y, rect.height)
    context.beginPath()
    context.moveTo(particle.x - particle.length, particle.y + offset)
    context.lineTo(particle.x, particle.y + offset)
    context.strokeStyle = `rgba(240, 91, 65, ${0.12 + particle.speed * 0.12})`
    context.stroke()
  })
  animationFrame = requestAnimationFrame(drawAirflow)
}

const observer = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting
  cancelAnimationFrame(animationFrame)
  if (visible) drawAirflow()
})

observer.observe(canvas)
window.addEventListener('resize', resizeCanvas)
reducedMotion.addEventListener('change', () => {
  cancelAnimationFrame(animationFrame)
  if (!reducedMotion.matches) drawAirflow()
})
resizeCanvas()
drawAirflow()
