const documentFormats:Record<string,{mime:string;kind:'pdf'|'jpeg'|'png'|'docx'|'xlsx'}>={
  pdf:{mime:'application/pdf',kind:'pdf'},jpg:{mime:'image/jpeg',kind:'jpeg'},jpeg:{mime:'image/jpeg',kind:'jpeg'},png:{mime:'image/png',kind:'png'},
  docx:{mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',kind:'docx'},
  xlsx:{mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',kind:'xlsx'},
}

export function validateClientDocument(name:string,bytes:Uint8Array){
  const extension=name.split('.').pop()?.toLowerCase()??'',format=documentFormats[extension]
  if(!format)return null
  const starts=(signature:number[])=>signature.every((byte,index)=>bytes[index]===byte)
  if(format.kind==='pdf'&&!starts([0x25,0x50,0x44,0x46,0x2d]))return null
  if(format.kind==='jpeg'&&!starts([0xff,0xd8,0xff]))return null
  if(format.kind==='png'&&!starts([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))return null
  if(format.kind==='docx'||format.kind==='xlsx'){
    if(!starts([0x50,0x4b]))return null
    const directoryText=new TextDecoder('latin1').decode(bytes)
    if(/vbaProject\.bin|macrosheets|xl\/macrosheets/i.test(directoryText))return null
    if(!directoryText.includes('[Content_Types].xml'))return null
    if(format.kind==='docx'&&!directoryText.includes('word/'))return null
    if(format.kind==='xlsx'&&!directoryText.includes('xl/'))return null
  }
  return format.mime
}
