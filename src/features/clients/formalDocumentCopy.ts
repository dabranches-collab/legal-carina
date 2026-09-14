export type FormalLanguage='pt'|'en'|'fr'

const ones={
 pt:['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','catorze','quinze','dezasseis','dezassete','dezoito','dezanove'],
 en:['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],
 fr:['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'],
} as const

function underThousand(value:number,language:FormalLanguage):string{
 if(value<20)return ones[language][value]
 if(language==='en'){
  const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'],hundreds=Math.floor(value/100),rest=value%100
  return [hundreds?`${ones.en[hundreds]} hundred`:'',rest?(hundreds?'and ':'')+(rest<20?ones.en[rest]:`${tens[Math.floor(rest/10)]}${rest%10?`-${ones.en[rest%10]}`:''}`):''].filter(Boolean).join(' ')
 }
 if(language==='fr'){
  const hundreds=Math.floor(value/100),rest=value%100
  let prefix=hundreds?(hundreds===1?'cent':`${ones.fr[hundreds]} cent`):''
  if(!rest)return `${prefix}${hundreds>1?'s':''}`
  const frenchTens=(n:number):string=>{if(n<20)return ones.fr[n];if(n<70){const roots=['','','vingt','trente','quarante','cinquante','soixante'];const ten=Math.floor(n/10),unit=n%10;return `${roots[ten]}${unit===1?' et un':unit?`-${ones.fr[unit]}`:''}`}if(n<80)return `soixante-${ones.fr[n-60]}`;if(n===80)return 'quatre-vingts';return `quatre-vingt-${ones.fr[n-80]}`}
  return [prefix,frenchTens(rest)].filter(Boolean).join(' ')
 }
 const tens=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'],hundreds=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'],hundred=Math.floor(value/100),rest=value%100
 if(value===100)return 'cem'
 const restText=rest?(rest<20?ones.pt[rest]:`${tens[Math.floor(rest/10)]}${rest%10?` e ${ones.pt[rest%10]}`:''}`):''
 return [hundred?hundreds[hundred]:'',restText].filter(Boolean).join(' e ')
}

function integerWords(value:number,language:FormalLanguage):string{
 const amount=Math.max(0,Math.floor(value));if(amount<1000)return underThousand(amount,language)
 const million=Math.floor(amount/1_000_000),thousand=Math.floor((amount%1_000_000)/1000),rest=amount%1000,parts:string[]=[]
 if(million)parts.push(language==='pt'?(million===1?'um milhão':`${underThousand(million,language)} milhões`):language==='en'?`${underThousand(million,language)} million`:`${million===1?'un':underThousand(million,language)} million${million>1?'s':''}`)
 if(thousand)parts.push(language==='pt'?(thousand===1?'mil':`${underThousand(thousand,language)} mil`):language==='en'?`${underThousand(thousand,language)} thousand`:`${thousand===1?'mille':`${underThousand(thousand,language)} mille`}`)
 if(rest)parts.push(underThousand(rest,language))
 return parts.join(language==='pt'?' e ':' ')
}

export function moneyInWords(value:number,language:FormalLanguage){
 const rounded=Math.round(value*100),euros=Math.floor(rounded/100),cents=rounded%100
 const euroLabel=language==='pt'?(euros===1?'euro':'euros'):language==='en'?(euros===1?'euro':'euros'):(euros===1?'euro':'euros')
 if(!cents)return `${integerWords(euros,language)} ${euroLabel}`
 const centLabel=language==='pt'?(cents===1?'cêntimo':'cêntimos'):language==='en'?(cents===1?'cent':'cents'):(cents===1?'centime':'centimes')
 const connector=language==='pt'?' e ':language==='en'?' and ':' et '
 return `${integerWords(euros,language)} ${euroLabel}${connector}${integerWords(cents,language)} ${centLabel}`
}

export const formalCopy={
 pt:{delivery:{email:'Por correio electrónico',post:'Por correio postal',hand:'Entrega em mão'},subject:'ASSUNTO: HONORÁRIOS',collectionSubject:'ASSUNTO: COBRANÇA',greeting:'Exmos. Senhores,',intro:(fees:string,feesWords:string,vat:string,vatWords:string,expenses:string,expensesWords:string,total:string,totalWords:string)=>`Por referência ao assunto em epígrafe, somos pela presente a solicitar que providenciem pelo pagamento dos honorários pelos serviços jurídicos infra descritos, no montante de ${fees} (${feesWords}), ao qual acresce IVA no valor de ${vat} (${vatWords})${expenses?`, bem como despesas no montante de ${expenses} (${expensesWords})`:''}, perfazendo a quantia total de ${total} (${totalWords}), mediante transferência para a conta bancária abaixo identificada:`,collectionIntro:(total:string,totalWords:string)=>`Verificando-se que os documentos abaixo identificados permanecem por liquidar, solicitamos que providenciem pelo pagamento do montante em dívida de ${total} (${totalWords}), mediante transferência para a conta bancária abaixo identificada:`,work:'Trabalho desenvolvido:',expenses:'Despesas',total:'Total',closing:['Sem mais de momento,','Subscrevemo-nos com os nossos melhores cumprimentos.'],account:'Titular',bank:'Banco',number:'Conta n.º',iban:'IBAN',swift:'BIC / SWIFT'},
 en:{delivery:{email:'By email',post:'By post',hand:'By hand'},subject:'SUBJECT: FEES',collectionSubject:'SUBJECT: PAYMENT REMINDER',greeting:'Dear Sirs,',intro:(fees:string,feesWords:string,vat:string,vatWords:string,expenses:string,expensesWords:string,total:string,totalWords:string)=>`With reference to the subject line above, we hereby request that you arrange for the payment of fees for the legal services described below, amounting to ${fees} (${feesWords}), to which VAT amounting to ${vat} (${vatWords}) is added${expenses?`, as well as expenses amounting to ${expenses} (${expensesWords})`:''}, making a total of ${total} (${totalWords}), by bank transfer to the account details set out below:`,collectionIntro:(total:string,totalWords:string)=>`As the documents identified below remain outstanding, we kindly request payment of the amount due of ${total} (${totalWords}) by bank transfer to the account details set out below:`,work:'Work carried out:',expenses:'Expenses',total:'Total',closing:['Without further matters at this time,','Yours faithfully,'],account:'Account holder',bank:'Bank',number:'Account',iban:'IBAN',swift:'BIC / SWIFT'},
 fr:{delivery:{email:'Par courrier électronique',post:'Par courrier postal',hand:'Remise en main propre'},subject:"OBJET : HONORAIRES",collectionSubject:'OBJET : RELANCE DE PAIEMENT',greeting:'Madame, Monsieur,',intro:(fees:string,feesWords:string,vat:string,vatWords:string,expenses:string,expensesWords:string,total:string,totalWords:string)=>`En référence à l’objet mentionné ci-dessus, nous vous prions de bien vouloir procéder au paiement des honoraires relatifs aux services juridiques décrits ci-dessous, d’un montant de ${fees} (${feesWords}), auquel s’ajoute la TVA d’un montant de ${vat} (${vatWords})${expenses?`, ainsi que des frais d’un montant de ${expenses} (${expensesWords})`:''}, soit un total de ${total} (${totalWords}), par virement bancaire sur le compte indiqué ci-dessous :`,collectionIntro:(total:string,totalWords:string)=>`Les documents identifiés ci-dessous demeurant impayés, nous vous prions de bien vouloir régler le montant dû de ${total} (${totalWords}) par virement bancaire sur le compte indiqué ci-dessous :`,work:'Prestations effectuées :',expenses:'Frais',total:'Total',closing:['Sans autre objet pour le moment,','Veuillez agréer nos salutations distinguées.'],account:'Titulaire',bank:'Banque',number:'Compte',iban:'IBAN',swift:'BIC / SWIFT'},
} as const
