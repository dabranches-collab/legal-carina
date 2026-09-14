const key = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
export function professionalName(name: string): string {
  const names: Record<string, string> = {carina:'Carina Santos','carina santos':'Carina Santos',hugo:'Hugo Mendonça','hugo mendonca':'Hugo Mendonça',paula:'Paula Chaves','paula chaves':'Paula Chaves'}
  return names[key(name)] ?? name
}
export function isLegalteam(name: string): boolean { return key(name).replace(/\s/g, '') === 'legalteam' }
export type Referrer = 'carina' | 'hugo'
export const referrerNames: Record<Referrer, string> = {carina:'Carina Santos',hugo:'Hugo Mendonça'}
