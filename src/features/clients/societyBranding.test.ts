import {describe,expect,it} from 'vitest'
import {assertIssuerMatchesSociety,issuerLogoPath,issuerMatchesSociety} from './societyBranding'

describe('identidade visual da sociedade emissora',()=>{
 it('aceita apenas a sociedade seleccionada, tolerando maiúsculas e espaços',()=>{
  expect(issuerMatchesSociety({name:'Carina Santos',logo_path:'carina.png'},'  CARINA   SANTOS ')).toBe(true)
  expect(issuerMatchesSociety({name:'LEGALTEAM',logo_path:null},'Carina Santos')).toBe(false)
 })

 it('nunca usa o logótipo LEGALTEAM numa sociedade diferente',()=>{
  expect(()=>issuerLogoPath({name:'LEGALTEAM',logo_path:null},'Carina Santos')).toThrow(/não corresponde/)
  expect(issuerLogoPath({name:'Carina Santos',logo_path:'carina.png'},'Carina Santos')).toBe('carina.png')
  expect(issuerLogoPath({name:'LEGALTEAM',logo_path:null},'LEGALTEAM')).toBe('/brand/legalteam-logo.jpg')
 })

 it('bloqueia a geração quando rodapé e sociedade não coincidem',()=>{
  expect(()=>assertIssuerMatchesSociety({name:'Carina Santos',logo_path:'carina.png'},'LEGALTEAM')).toThrow(/não foi gerado/)
 })
})
