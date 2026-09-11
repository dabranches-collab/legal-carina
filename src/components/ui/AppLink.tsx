import type { AnchorHTMLAttributes, MouseEvent } from 'react'

export function AppLink({href,onClick,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){
  function navigate(event:MouseEvent<HTMLAnchorElement>){
    onClick?.(event)
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target==='_blank')return
    const target=new URL(href,window.location.href)
    if(target.origin!==window.location.origin)return
    event.preventDefault()
    window.history.pushState({},'',target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  return <a href={href} onClick={navigate} {...props}/>
}
