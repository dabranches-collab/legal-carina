// Só repete erros que confirmam rollback na base; nunca repete uma falha de rede.
export async function retryWorkEntryWrite<T extends {error:{code?:string}|null}>(operation:()=>PromiseLike<T>):Promise<T>{
  let result=await operation()
  for(let attempt=0;attempt<3&&result.error&&['40001','40P01','55P03'].includes(result.error.code??'');attempt++){
    await new Promise(resolve=>setTimeout(resolve,60*2**attempt))
    result=await operation()
  }
  return result
}
