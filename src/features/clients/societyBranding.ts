import {isLegalteam} from '../../lib/professionalNames'

type SocietyIdentity={id?:string;name:string;logo_path:string|null}

const societyKey=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLocaleLowerCase('pt-PT')

export const issuerMatchesSociety=(issuer:SocietyIdentity|null|undefined,societyName:string)=>Boolean(issuer&&societyKey(issuer.name)===societyKey(societyName))

export function assertIssuerMatchesSociety(issuer:SocietyIdentity|null|undefined,societyName:string){
 if(!issuerMatchesSociety(issuer,societyName))throw new Error(`A identidade da sociedade emissora não corresponde a ${societyName}. O documento não foi gerado.`)
}

export function issuerLogoPath(issuer:SocietyIdentity|null|undefined,societyName:string){
 assertIssuerMatchesSociety(issuer,societyName)
 return issuer!.logo_path||(isLegalteam(issuer!.name)?'/brand/legalteam-logo.jpg':null)
}
