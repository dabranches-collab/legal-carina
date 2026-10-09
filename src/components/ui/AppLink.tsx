import { workflowPreviewEnabled } from '../../types/workflowNavigation'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'

export function AppLink({href,onClick,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){
  const targetUrl=new URL(href,window.location.href)
  const preview=workflowPreviewEnabled(window.location.search,import.meta.env.DEV,import.meta.env.VITE_APP_ENV)
  const previewHref=preview&&targetUrl.origin===window.location.origin?(()=>{targetUrl.searchParams.set('workflow','preview');return targetUrl.pathname+targetUrl.search+targetUrl.hash})():href
  function navigate(event:MouseEvent<HTMLAnchorElement>){
    onClick?.(event)
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target==='_blank')return
    const target=new URL(previewHref,window.location.href)
    if(target.origin!==window.location.origin)return
    event.preventDefault()
    window.history.pushState({},'',target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  return <a href={previewHref} onClick={navigate} {...props}/>
}
