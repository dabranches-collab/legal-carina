import {useEffect,useRef,useState} from 'react'

type CameraState='idle'|'opening'|'active'

export function ExpenseCamera({onCapture}:{onCapture:(file:File)=>void}){
 const [state,setState]=useState<CameraState>('idle')
 const [ready,setReady]=useState(false)
 const [error,setError]=useState('')
 const videoRef=useRef<HTMLVideoElement>(null)
 const streamRef=useRef<MediaStream|null>(null)
 const requestRef=useRef(0)

 function stopCamera(){
  requestRef.current+=1
  streamRef.current?.getTracks().forEach(track=>track.stop())
  streamRef.current=null
  if(videoRef.current)videoRef.current.srcObject=null
  setReady(false)
  setState('idle')
 }

 useEffect(()=>()=>{
  requestRef.current+=1
  streamRef.current?.getTracks().forEach(track=>track.stop())
 },[])

 useEffect(()=>{
  if(state!=='active'||!videoRef.current||!streamRef.current)return
  videoRef.current.srcObject=streamRef.current
  void videoRef.current.play().catch(()=>setError('Não foi possível mostrar a câmara. Verifique as permissões do iPhone.'))
 },[state])

 async function openCamera(){
  setError('')
  if(!navigator.mediaDevices?.getUserMedia){
   setError('A câmara não está disponível neste browser. Abra a aplicação por HTTPS no iPhone ou escolha um ficheiro.')
   return
  }
  const request=++requestRef.current
  setState('opening')
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}})
   if(requestRef.current!==request){stream.getTracks().forEach(track=>track.stop());return}
   streamRef.current=stream
   setState('active')
  }catch{
   if(requestRef.current!==request)return
   setState('idle')
   setError('Não foi possível abrir a câmara. Verifique a permissão de acesso no iPhone.')
  }
 }

 function capture(){
  const video=videoRef.current
  if(!video||!video.videoWidth||!video.videoHeight)return
  const canvas=document.createElement('canvas')
  const scale=Math.min(1,2000/Math.max(video.videoWidth,video.videoHeight))
  canvas.width=Math.round(video.videoWidth*scale)
  canvas.height=Math.round(video.videoHeight*scale)
  const context=canvas.getContext('2d')
  if(!context){setError('Não foi possível captar a fotografia. Tente novamente.');return}
  context.drawImage(video,0,0,canvas.width,canvas.height)
  canvas.toBlob(blob=>{
   if(!blob){setError('Não foi possível captar a fotografia. Tente novamente.');return}
   onCapture(new File([blob],`despesa-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`,{type:'image/jpeg'}))
   stopCamera()
  },'image/jpeg',0.88)
 }

 return <div className="grid gap-2">
  {state==='idle'?<button type="button" onClick={()=>void openCamera()} className="control min-h-11 w-full px-3 text-left font-semibold">Tirar fotografia</button>:<div className="grid gap-2 rounded-lg border border-border p-2">
   <video ref={videoRef} autoPlay muted playsInline onLoadedMetadata={()=>setReady(true)} className="aspect-[3/4] max-h-[50dvh] w-full rounded-lg bg-black object-contain" aria-label="Pré-visualização da câmara"/>
   {state==='opening'&&<p role="status" className="text-sm">A abrir a câmara…</p>}
   <div className="grid grid-cols-2 gap-2"><button type="button" onClick={stopCamera} className="control min-h-11 px-3">Cancelar fotografia</button><button type="button" onClick={capture} disabled={!ready} className="record-save min-h-11 rounded-lg border px-3 font-semibold">Capturar fotografia</button></div>
  </div>}
  {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
 </div>
}
