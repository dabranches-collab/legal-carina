export type DateValue = Date | string | null | undefined

const pad = (value:number) => String(value).padStart(2,'0')
const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/

const validParts = (year:number,month:number,day:number) => {
  const date = new Date(Date.UTC(year,month-1,day))
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day
}

export function formatDate(value:DateValue,fallback='—'){
  if(value==null||value==='')return fallback
  if(typeof value==='string'){
    const match=value.match(isoDate)
    if(match){
      const year=Number(match[1]),month=Number(match[2]),day=Number(match[3])
      return validParts(year,month,day)?`${pad(day)}-${pad(month)}-${year}`:fallback
    }
  }
  const date=value instanceof Date?value:new Date(value)
  return Number.isNaN(date.valueOf())?fallback:`${pad(date.getDate())}-${pad(date.getMonth()+1)}-${date.getFullYear()}`
}

export function formatDateTime(value:DateValue,fallback='—'){
  if(value==null||value==='')return fallback
  const date=value instanceof Date?value:new Date(value)
  if(Number.isNaN(date.valueOf()))return fallback
  return `${formatDate(date,fallback)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function displayDateToIso(value:string){
  const match=value.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if(!match)return null
  const day=Number(match[1]),month=Number(match[2]),year=Number(match[3])
  return validParts(year,month,day)?`${year}-${pad(month)}-${pad(day)}`:null
}

export function maskDisplayDate(value:string){
  const digits=value.replace(/\D/g,'').slice(0,8)
  return [digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('-')
}

export function todayIso(){
  const value=new Date()
  return `${value.getFullYear()}-${pad(value.getMonth()+1)}-${pad(value.getDate())}`
}
