import { useContext, type AnchorHTMLAttributes } from 'react'
import { AppLink } from '../../components/ui/AppLink'
import { WorkResultsContext } from './WorkResultsContext'

export function WorkResultsLink({href,label,children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string;label:string}){
 const results=useContext(WorkResultsContext)
 return <AppLink {...props} href={href} onClick={event=>{
  props.onClick?.(event)
  if(results&&!event.defaultPrevented&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();results.open(href,label,event.currentTarget)}
 }}>{children}</AppLink>
}
