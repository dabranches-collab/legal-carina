import {test,expect} from '@playwright/test'
import {createQaAllocationData} from '../src/lib/qaAllocationData'
test.skip(process.env.WORKFLOW_ISOLATED_E2E!=='1','Requer playwright.workflow.config.ts para bloquear serviços reais.')
let forbidden:string[]
test.beforeEach(async({context,request})=>{
 for(const path of ['/supabase-api/auth/v1/user','/supabase-functions/v1/test','/api/document-translation']){const response=await request.get(path);expect(response.status()).toBe(403);expect(await response.text()).toBe('Blocked by isolated setup')}
 forbidden=[];const fixture=createQaAllocationData()
 await context.addInitScript(()=>localStorage.setItem('carina-release-notes-seen','0.16.0'))
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url())
  if(url.origin==='http://127.0.0.1:54321'&&url.pathname.startsWith('/rest/v1/')){
   const rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],table=url.pathname.split('/').at(-1)??'',args=request.method()==='POST'?request.postDataJSON():{}
   let result=fixture(rpc,table,args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
   if(rpc==='get_attention_work_entries'){
    const base=fixture('search_work_entries',table,args,url,'POST',false) as {items:Array<{client_id:string;is_invoiced:boolean;is_paid:boolean}>;total:number}
    const items=base.items.filter(item=>(!args.p_client_id||item.client_id===args.p_client_id)&&(args.p_kind==='uninvoiced'?!item.is_invoiced:args.p_kind==='unpaid'?item.is_invoiced&&!item.is_paid:false))
    result={...base,items,total:items.length}
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
  }
  if(url.origin==='http://127.0.0.1:5173'&&!/^\/(supabase-api|supabase-functions|api\/document-translation)/.test(url.pathname))return route.continue()
  forbidden.push(url.origin+url.pathname);return route.abort('blockedbyclient')
 })
 await context.routeWebSocket(/.*/,socket=>socket.close())
})
test.afterEach(()=>expect(forbidden,'Nenhum serviço real ou pedido sem mock').toEqual([]))
async function openFromList(page:import('@playwright/test').Page){
 if((page.viewportSize()?.width??1440)<900){await page.getByRole('button',{name:'Caixas',exact:true}).click();await page.getByRole('list',{name:'Lista de Particulares em caixas'}).getByRole('button',{name:'Ficha',exact:true}).first().click()}
 else await page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}).first().dblclick()
}
async function open(page:import('@playwright/test').Page,preview=true){await page.goto('/?qa-iphone=1&qa-role=admin&view=clients&clientType=individual&clientMode=list'+(preview?'&workflow=preview':''));await openFromList(page);return page.getByRole('dialog',{name:'Cliente Demonstração Alfa',exact:true})}
test('cinco grupos reutilizam dados, registos, contratos e documentos',async({page},info)=>{
 const dialog=await open(page),nav=dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'})
 await expect(nav.getByRole('button')).toHaveCount(5);await expect(dialog.getByRole('region',{name:'Resumo da ficha'})).toBeVisible()
 await nav.getByRole('button',{name:'Dados',exact:true}).click();await expect(dialog.getByLabel('Nome',{exact:true})).toBeVisible()
 const pages=dialog.getByRole('navigation',{name:'Páginas da ficha do cliente'})
 await expect(pages.getByRole('button')).toHaveCount(3);await pages.getByRole('button',{name:'Contactos',exact:true}).click();await expect(dialog.getByLabel('Nome',{exact:true})).not.toBeVisible()
 await nav.getByRole('button',{name:'Trabalho',exact:true}).click();await expect(dialog.getByRole('table',{name:'Registos de trabalho'})).toBeVisible()
 await nav.getByRole('button',{name:'Contratos',exact:true}).click();await expect(pages.getByRole('button')).toHaveCount(2);await pages.getByRole('button',{name:'Preço fixo',exact:true}).click()
 await nav.getByRole('button',{name:'Financeiro e documentos',exact:true}).click();await expect(pages.getByRole('button')).toHaveCount(5)
 for(const name of ['Documentos','Credenciais','Facturas','Notas de Honorários','Provisões']){await pages.getByRole('button',{name,exact:true}).click();await expect(pages.getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page')}
 await nav.getByRole('button',{name:'Resumo',exact:true}).click();await expect(dialog.getByRole('region',{name:'Resumo da ficha'})).toBeVisible();await expect(dialog.getByText('Provisões para honorários',{exact:true})).not.toBeVisible()
 await nav.getByRole('button',{name:'Financeiro e documentos',exact:true}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:`output/workflow-integration/${info.project.name}-finance-light.png`})
 await dialog.locator('[data-close-record]').first().click()
 await page.getByRole('button',{name:'Activar modo escuro',exact:true}).click()
 await openFromList(page)
 await nav.getByRole('button',{name:'Financeiro e documentos',exact:true}).click()
 await expect(nav).toBeVisible();await page.screenshot({path:`output/workflow-integration/${info.project.name}-finance-dark.png`})
})
test('URL conserva grupo, página e lista de origem',async({page})=>{
 const dialog=await open(page);await dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'}).getByRole('button',{name:'Financeiro e documentos',exact:true}).click();await dialog.getByRole('button',{name:'Documentos',exact:true}).click()
 await expect.poll(()=>new URL(page.url()).searchParams.get('clientGroup')).toBe('finance');await page.reload();await expect(dialog.getByRole('button',{name:'Documentos',exact:true})).toHaveAttribute('aria-current','page')
 await dialog.locator('[data-close-record]').first().click();await expect(dialog).toHaveCount(0);expect(new URL(page.url()).searchParams.get('workflow')).toBe('preview');expect(new URL(page.url()).searchParams.has('clientGroup')).toBe(false)
})
test('sem preview conserva a ficha habitual',async({page})=>{
 const dialog=await open(page,false);await expect(dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'})).toHaveCount(0);await expect(dialog.getByRole('navigation',{name:'Páginas da ficha do cliente'}).getByRole('button')).toHaveCount(10);await expect(dialog.getByLabel('Nome',{exact:true})).toBeVisible()
})

test('filtro de trabalho restaura após contratos e recarregamento',async({page})=>{
 const dialog=await open(page),nav=dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'})
 await nav.getByRole('button',{name:'Contratos',exact:true}).click();await dialog.getByRole('button',{name:'Preço fixo',exact:true}).click();await nav.getByRole('button',{name:'Trabalho',exact:true}).click()
 await dialog.getByRole('button',{name:/Não facturados/}).click();await expect(dialog.getByRole('table',{name:'Registos de trabalho'})).toBeVisible()
 await expect.poll(()=>new URL(page.url()).searchParams.get('recordFilter')).toBe('uninvoiced');await page.reload()
 await expect(nav.getByRole('button',{name:'Trabalho',exact:true})).toHaveAttribute('aria-current','page');await expect(dialog.getByRole('table',{name:'Registos de trabalho'})).toBeVisible()
})
