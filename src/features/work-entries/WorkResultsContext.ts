import { createContext } from 'react'

export const WorkResultsContext=createContext<{
 open:(href:string,label:string,source:HTMLElement)=>void
 close:()=>void
}|null>(null)
