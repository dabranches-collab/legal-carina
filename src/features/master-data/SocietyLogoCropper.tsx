import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { logoFitScale } from './logoCropMath'

GlobalWorkerOptions.workerSrc=pdfWorkerUrl

const OUTPUT_WIDTH=900,OUTPUT_HEIGHT=300
type Position={x:number;y:number}

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
  const canvasRef=useRef<HTMLCanvasElement>(null),imageRef=useRef<HTMLImageElement|null>(null),inputRef=useRef<HTMLInputElement>(null)
  const [source,setSource]=useState(existingUrl),[zoom,setZoom]=useState(1),[position,setPosition]=useState<Position>({x:0,y:0}),[dragging,setDragging]=useState<Position|null>(null),[error,setError]=useState('')
  useEffect(()=>setSource(existingUrl),[existingUrl])
  useEffect(()=>{if(!source){imageRef.current=null;return}const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{imageRef.current=image;const centred={x:0,y:0};setPosition(centred);setZoom(1);draw(centred,1)};image.onerror=()=>setError('Não foi possível apresentar o logótipo guardado.');image.src=source;return()=>{if(source.startsWith('blob:'))URL.revokeObjectURL(source)}},[source])
  function draw(nextPosition=position,nextZoom=zoom){const canvas=canvasRef.current,image=imageRef.current;if(!canvas||!image)return;const context=canvas.getContext('2d');if(!context)return;const base=logoFitScale(canvas.width,canvas.height,image.naturalWidth,image.naturalHeight),scale=base*nextZoom,width=image.naturalWidth*scale,height=image.naturalHeight*scale,x=(canvas.width-width)/2+nextPosition.x,y=(canvas.height-height)/2+nextPosition.y;context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,x,y,width,height)}
  useEffect(()=>draw(),[position,zoom])
  async function choose(file?:File){if(!file)return;setError('');try{setSource(await sourceFromFile(file))}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível ler o ficheiro.')}}
  function drop(event:DragEvent){event.preventDefault();if(!disabled)void choose(event.dataTransfer.files[0])}
  function pointerDown(event:PointerEvent<HTMLCanvasElement>){if(disabled||!source)return;event.currentTarget.setPointerCapture(event.pointerId);setDragging({x:event.clientX-position.x,y:event.clientY-position.y})}
  function pointerMove(event:PointerEvent<HTMLCanvasElement>){if(!dragging)return;setPosition({x:event.clientX-dragging.x,y:event.clientY-dragging.y})}
  function apply(){const preview=canvasRef.current;if(!preview)return;const output=document.createElement('canvas');output.width=OUTPUT_WIDTH;output.height=OUTPUT_HEIGHT;const context=output.getContext('2d');if(!context)return;context.fillStyle='#ffffff';context.fillRect(0,0,OUTPUT_WIDTH,OUTPUT_HEIGHT);context.drawImage(preview,0,0,OUTPUT_WIDTH,OUTPUT_HEIGHT);output.toBlob(blob=>{if(blob)onChange(blob)},'image/png',.92)}
  function remove(){setSource('');setError('');onRemove()}
  return <fieldset className="mt-6" disabled={disabled}><legend className="font-semibold">Logótipo dos documentos</legend><p className="mt-1 text-xs text-text-secondary">Arraste uma imagem JPG/PNG ou um PDF. Nos PDF é usada apenas a primeira página; o ficheiro original não é guardado.</p><div onDragOver={event=>event.preventDefault()} onDrop={drop} className="mt-3 rounded-xl border-2 border-dashed border-border bg-surface-subtle p-4"><input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={event=>void choose(event.target.files?.[0])} className="sr-only"/><button type="button" onClick={()=>inputRef.current?.click()} className="min-h-10 rounded-lg border border-border bg-surface px-3 font-semibold text-primary">Escolher ficheiro</button><span className="ml-3 text-sm text-text-secondary">ou arraste-o para esta caixa</span>{source&&<div className="mt-4"><canvas ref={canvasRef} width="600" height="200" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>setDragging(null)} onPointerCancel={()=>setDragging(null)} className="aspect-[3/1] w-full max-w-2xl touch-none rounded-lg border border-border bg-white object-contain cursor-move"/><label className="mt-3 block max-w-2xl text-sm font-semibold">Ampliação<input aria-label="Ampliação do logótipo" type="range" min="1" max="4" step="0.01" value={zoom} onChange={event=>setZoom(Number(event.target.value))} className="mt-1 w-full"/></label><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={apply} className="min-h-10 rounded-lg bg-primary px-3 font-semibold text-surface">Aplicar recorte</button><button type="button" onClick={remove} className="min-h-10 rounded-lg border border-danger/40 px-3 font-semibold text-danger">Remover logótipo</button></div></div>}{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</div></fieldset>
}
