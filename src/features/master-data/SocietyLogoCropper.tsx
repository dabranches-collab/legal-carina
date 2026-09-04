import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { cropSourceRect, logoFitScale, type CropInsets } from './logoCropMath'

GlobalWorkerOptions.workerSrc=pdfWorkerUrl

const PREVIEW_WIDTH=600,PREVIEW_HEIGHT=200,MAX_OUTPUT_SIDE=1200
const emptyCrop:CropInsets={left:0,right:0,top:0,bottom:0}

async function sourceFromFile(file:File){
  if(file.size>10*1024*1024)throw new Error('O ficheiro não pode exceder 10 MB.')
  if(file.type==='application/pdf'){
    const pdf=await getDocument({data:await file.arrayBuffer()}).promise,page=await pdf.getPage(1),viewport=page.getViewport({scale:2})
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height)
    const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível ler o PDF.')
    await page.render({canvas,canvasContext:context,viewport}).promise
    return canvas.toDataURL('image/png')
  }
  if(!['image/jpeg','image/png'].includes(file.type))throw new Error('Use uma imagem JPG/PNG ou um PDF.')
  return URL.createObjectURL(file)
}

export function SocietyLogoCropper({disabled,existingUrl,onChange,onRemove}:{disabled:boolean;existingUrl:string;onChange:(blob:Blob)=>void;onRemove:()=>void}){
  const canvasRef=useRef<HTMLCanvasElement>(null),previewRef=useRef<HTMLDivElement>(null),imageRef=useRef<HTMLImageElement|null>(null),inputRef=useRef<HTMLInputElement>(null),dragRef=useRef<{side:keyof CropInsets;pointerId:number}|null>(null)
  const [source,setSource]=useState(existingUrl),[crop,setCrop]=useState<CropInsets>(emptyCrop),[error,setError]=useState('')
  const [frame,setFrame]=useState({left:0,top:0,width:PREVIEW_WIDTH,height:PREVIEW_HEIGHT})
  useEffect(()=>setSource(existingUrl),[existingUrl])
  useEffect(()=>{if(!source){imageRef.current=null;return}const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{imageRef.current=image;setCrop({...emptyCrop});setError('')};image.onerror=()=>setError('Não foi possível apresentar o logótipo guardado.');image.src=source;return()=>{if(source.startsWith('blob:'))URL.revokeObjectURL(source)}},[source])

  useEffect(()=>{
    const canvas=canvasRef.current,image=imageRef.current;if(!canvas||!image)return
    const context=canvas.getContext('2d');if(!context)return
    const scale=logoFitScale(canvas.width,canvas.height,image.naturalWidth,image.naturalHeight)
    const width=image.naturalWidth*scale,height=image.naturalHeight*scale,left=(canvas.width-width)/2,top=(canvas.height-height)/2
    context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height)
    context.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,left,top,width,height);setFrame({left,top,width,height})
  },[crop,source])

  async function choose(file?:File){if(!file)return;setError('');try{setSource(await sourceFromFile(file))}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível ler o ficheiro.')}}
  function drop(event:DragEvent){event.preventDefault();if(!disabled)void choose(event.dataTransfer.files[0])}
  function update(side:keyof CropInsets,value:number){const opposite=side==='left'?'right':side==='right'?'left':side==='top'?'bottom':'top';setCrop(current=>({...current,[side]:Math.max(0,Math.min(value,94-current[opposite]))}))}
  function updateFromPointer(side:keyof CropInsets,clientX:number,clientY:number){
    const preview=previewRef.current;if(!preview)return
    const bounds=preview.getBoundingClientRect(),canvasX=(clientX-bounds.left)*PREVIEW_WIDTH/bounds.width,canvasY=(clientY-bounds.top)*PREVIEW_HEIGHT/bounds.height
    if(side==='left')update(side,(canvasX-frame.left)/frame.width*100)
    else if(side==='right')update(side,100-(canvasX-frame.left)/frame.width*100)
    else if(side==='top')update(side,(canvasY-frame.top)/frame.height*100)
    else update(side,100-(canvasY-frame.top)/frame.height*100)
  }
  function beginDrag(side:keyof CropInsets,event:PointerEvent<HTMLButtonElement>){event.preventDefault();dragRef.current={side,pointerId:event.pointerId};event.currentTarget.setPointerCapture(event.pointerId);updateFromPointer(side,event.clientX,event.clientY)}
  function moveDrag(event:PointerEvent<HTMLButtonElement>){const drag=dragRef.current;if(drag?.pointerId===event.pointerId)updateFromPointer(drag.side,event.clientX,event.clientY)}
  function endDrag(event:PointerEvent<HTMLButtonElement>){if(dragRef.current?.pointerId===event.pointerId)dragRef.current=null}
  function nudge(side:keyof CropInsets,event:KeyboardEvent<HTMLButtonElement>){
    const forward=event.key==='ArrowRight'||event.key==='ArrowDown',backward=event.key==='ArrowLeft'||event.key==='ArrowUp';if(!forward&&!backward)return
    event.preventDefault();const direction=forward?1:-1,oppositeDirection=side==='right'||side==='bottom'?-1:1;update(side,crop[side]+direction*oppositeDirection)
  }
  function trimWhiteMargins(){
    const image=imageRef.current;if(!image)return
    try{
      const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas')
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale))
      const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return
      context.drawImage(image,0,0,canvas.width,canvas.height);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data
      let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,visible=pixels[i+3]>12&&(pixels[i]<246||pixels[i+1]<246||pixels[i+2]<246);if(visible){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
      if(maxX<0){setError('Não foi encontrado conteúdo distinto do fundo branco.');return}
      setCrop({left:minX/canvas.width*100,right:(canvas.width-1-maxX)/canvas.width*100,top:minY/canvas.height*100,bottom:(canvas.height-1-maxY)/canvas.height*100});setError('')
    }catch{setError('Não foi possível detectar automaticamente as margens. Pode ajustá-las manualmente.')}
  }
  function apply(){
    const image=imageRef.current;if(!image)return
    const rect=cropSourceRect(image.naturalWidth,image.naturalHeight,crop),scale=Math.min(1,MAX_OUTPUT_SIDE/Math.max(rect.width,rect.height)),output=document.createElement('canvas')
    output.width=Math.max(1,Math.round(rect.width*scale));output.height=Math.max(1,Math.round(rect.height*scale))
    const context=output.getContext('2d');if(!context)return
    context.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,output.width,output.height)
    output.toBlob(blob=>{if(blob){onChange(blob);setSource(URL.createObjectURL(blob));setCrop({...emptyCrop})}},'image/png',.92)
  }
  function remove(){setSource('');setError('');onRemove()}
  const selection={left:`${(frame.left+frame.width*crop.left/100)/PREVIEW_WIDTH*100}%`,top:`${(frame.top+frame.height*crop.top/100)/PREVIEW_HEIGHT*100}%`,width:`${frame.width*(100-crop.left-crop.right)/100/PREVIEW_WIDTH*100}%`,height:`${frame.height*(100-crop.top-crop.bottom)/100/PREVIEW_HEIGHT*100}%`}
  const handle=(side:keyof CropInsets,label:string,position:string,bar:string)=><button type="button" aria-label={`Arrastar margem ${label}`} title={`Arrastar margem ${label}`} onPointerDown={event=>beginDrag(side,event)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={event=>nudge(side,event)} className={`pointer-events-auto absolute z-10 touch-none ${position}`}><span className={`block rounded-full border-2 border-white bg-primary shadow-md ${bar}`}/></button>
  return <fieldset className="mt-6" disabled={disabled}><legend className="font-semibold">Logótipo dos documentos</legend><p className="mt-1 text-xs text-text-secondary">Escolha uma imagem JPG/PNG ou um PDF. Arraste directamente as quatro margens da moldura e carregue em Cortar; nos PDF é usada apenas a primeira página.</p><div onDragOver={event=>event.preventDefault()} onDrop={drop} className="mt-3 rounded-xl border-2 border-dashed border-border bg-surface-subtle p-4"><input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={event=>void choose(event.target.files?.[0])} className="sr-only"/><button type="button" onClick={()=>inputRef.current?.click()} className="min-h-10 rounded-lg border border-border bg-surface px-3 font-semibold text-primary">Escolher ficheiro</button><span className="ml-3 text-sm text-text-secondary">ou arraste-o para esta caixa</span>{source&&<div className="mt-4"><div ref={previewRef} data-crop-frame className="relative aspect-[3/1] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-white"><canvas ref={canvasRef} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} className="absolute inset-0 size-full"/><div className="pointer-events-none absolute border-2 border-primary shadow-[0_0_0_999px_rgba(15,23,42,0.55)]" style={selection}>{handle('left','esquerda','-left-3 top-0 h-full w-6 cursor-ew-resize','absolute left-2 top-1/2 h-12 w-1 -translate-y-1/2')}{handle('right','direita','-right-3 top-0 h-full w-6 cursor-ew-resize','absolute right-2 top-1/2 h-12 w-1 -translate-y-1/2')}{handle('top','superior','left-0 -top-3 h-6 w-full cursor-ns-resize','absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2')}{handle('bottom','inferior','bottom-[-0.75rem] left-0 h-6 w-full cursor-ns-resize','absolute bottom-2 left-1/2 h-1 w-12 -translate-x-1/2')}</div></div><p className="mt-2 max-w-2xl text-xs text-text-secondary">Área seleccionada: esquerda {crop.left.toFixed(0)}%, direita {crop.right.toFixed(0)}%, topo {crop.top.toFixed(0)}%, base {crop.bottom.toFixed(0)}%.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={trimWhiteMargins} className="min-h-10 rounded-lg border border-border bg-surface px-3 font-semibold text-primary">Detectar margens brancas</button><button type="button" onClick={()=>setCrop({...emptyCrop})} className="min-h-10 rounded-lg border border-border bg-surface px-3 font-semibold">Repor moldura</button><button type="button" onClick={apply} className="min-h-10 rounded-lg bg-primary px-4 font-semibold text-surface">Cortar</button><button type="button" onClick={remove} className="min-h-10 rounded-lg border border-danger/40 px-3 font-semibold text-danger">Remover logótipo</button></div></div>}{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</div></fieldset>
}
