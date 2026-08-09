type Cutout = 'Dynamic Island' | 'notch'
type Model = { name:string; width:number; height:number; physical:string; cutout:Cutout; safeTop:number }

const models: Model[] = [
  { name:'iPhone 17', width:402, height:874, physical:'2622×1206', cutout:'Dynamic Island', safeTop:59 },
  { name:'iPhone Air', width:420, height:912, physical:'2736×1260', cutout:'Dynamic Island', safeTop:59 },
  { name:'iPhone 17 Pro', width:402, height:874, physical:'2622×1206', cutout:'Dynamic Island', safeTop:59 },
  { name:'iPhone 17 Pro Max', width:440, height:956, physical:'2868×1320', cutout:'Dynamic Island', safeTop:59 },
  { name:'iPhone 17e', width:390, height:844, physical:'2532×1170', cutout:'notch', safeTop:47 },
  { name:'iPhone 16', width:393, height:852, physical:'2556×1179', cutout:'Dynamic Island', safeTop:59 },
  { name:'iPhone 16 Plus', width:430, height:932, physical:'2796×1290', cutout:'Dynamic Island', safeTop:59 },
  { name:'iPhone 16 Pro', width:402, height:874, physical:'2622×1206', cutout:'Dynamic Island', safeTop:62 },
  { name:'iPhone 16 Pro Max', width:440, height:956, physical:'2868×1320', cutout:'Dynamic Island', safeTop:62 },
  { name:'iPhone 16e', width:390, height:844, physical:'2532×1170', cutout:'notch', safeTop:47 },
  { name:'iPhone 13 mini', width:375, height:812, physical:'2340×1080', cutout:'notch', safeTop:47 },
]

const get = <T extends HTMLElement>(id:string) => document.getElementById(id) as T
const nav=get<HTMLElement>('models'), phone=get<HTMLElement>('phone'), space=get<HTMLElement>('phone-space'), frame=get<HTMLIFrameElement>('app-preview')
let selected=0, landscape=false, dark=false, standalone=true

for (const [index, model] of models.entries()) {
  const button=document.createElement('button')
  button.type='button'; button.textContent=model.name; button.setAttribute('aria-pressed', String(index===selected))
  button.addEventListener('click',()=>{selected=index; render()})
  nav.append(button)
}

function render() {
  const model=models[selected]
  const width=landscape ? model.height : model.width
  const height=landscape ? model.width : model.height
  phone.style.setProperty('--device-width', `${width}px`)
  phone.style.setProperty('--device-height', `${height}px`)
  phone.style.setProperty('--device-radius', `${Math.round(Math.min(width,height)*0.13)}px`)
  phone.classList.toggle('notch',model.cutout==='notch')
  phone.classList.toggle('island',model.cutout==='Dynamic Island')
  phone.classList.toggle('landscape',landscape)
  get('model-name').textContent=model.name
  get('viewport').textContent=`Viewport CSS: ${model.width}×${model.height}`
  get('physical').textContent=`Físico (referência): ${model.physical}`
  get('cutout').textContent=`Recorte: ${model.cutout}`
  get('safe-top').textContent=`Safe top aplicado: ${model.safeTop}px`
  nav.querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-pressed',String(index===selected)))
  get('display-mode').textContent=standalone?'PWA standalone':'Safari normal'
  get('display-mode').setAttribute('aria-pressed',String(standalone))
  get('theme-mode').textContent=dark?'Modo escuro':'Modo claro'
  get('theme-mode').setAttribute('aria-pressed',String(dark))
  get('orientation').textContent=landscape?'Horizontal':'Vertical'
  get('orientation').setAttribute('aria-pressed',String(landscape))
  const params=new URLSearchParams({'qa-iphone':'1','safe-top':String(landscape?0:model.safeTop),'safe-right':String(landscape?model.safeTop:0),'safe-bottom':landscape?'21':'34','safe-left':String(landscape?model.safeTop:0),'display-mode':standalone?'standalone':'browser','theme':dark?'dark':'light'})
  frame.src=`/?${params}`
  requestAnimationFrame(scalePhone)
}

function scalePhone() {
  const width=parseFloat(getComputedStyle(phone).getPropertyValue('--device-width'))+24
  const height=parseFloat(getComputedStyle(phone).getPropertyValue('--device-height'))+24
  const availableWidth=Math.max(320,document.documentElement.clientWidth-32)
  const scale=Math.min(1,availableWidth/width,760/height)
  phone.style.transform=`scale(${scale})`
  space.style.width=`${width*scale}px`; space.style.height=`${height*scale}px`
}

get('display-mode').addEventListener('click',()=>{standalone=!standalone;render()})
get('theme-mode').addEventListener('click',()=>{dark=!dark;render()})
get('orientation').addEventListener('click',()=>{landscape=!landscape;render()})
window.addEventListener('resize',scalePhone)
render()
