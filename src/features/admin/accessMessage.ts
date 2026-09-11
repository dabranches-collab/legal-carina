export function makeAccessMessage(username:string,pin?:string) {
  const access=`Carina - Legal\n\nLink: ${window.location.origin}/\nUtilizador: ${username}`
  return pin?`${access}\nPIN temporário: ${pin}\n\nNo primeiro acesso será obrigatório escolher um novo PIN.`:`${access}\n\nUtilize o PIN actual. Se não o souber, contacte a administração para definir um novo PIN temporário.`
}
