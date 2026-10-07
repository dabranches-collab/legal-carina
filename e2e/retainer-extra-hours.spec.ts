import {test,expect} from '@playwright/test'
import {createQaAllocationData} from '../src/lib/qaAllocationData'

for(const width of [1440,768,390])for(const colorScheme of ['light','dark'] as const){
 test(`avença anual + horas · ${width} · ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme});
  await page.addInitScript(theme=>localStorage.setItem('carina-theme',theme),colorScheme);
  const fixture=createQaAllocationData(),writes:Record<string,unknown>[]=[];
  const terms={id:'synthetic-annual-retainer',firm_id:'synthetic-firm',client_id:'00000000-0000-4000-8000-000000000020',billing_entity_id:'00000000-0000-4000-8000-000000000001',active:true,monthly_amount:100,currency:'EUR',starts_on:'2026-01-01',ends_on:null,reference_hourly_rate:null,included_hours:32,billing_interval_months:1,hours_interval_months:12,billing_mode:'retainer',excess_hourly_rate:null,notes:null};
  await page.route('**/rest/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1)??'',rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=['POST','PATCH'].includes(request.method())?request.postDataJSON():{};
   if(table==='client_retainers'&&request.method()==='PATCH'){writes.push(args);Object.assign(terms,args)}
   const result=table==='client_retainers'?[terms]:table==='retainer_charges'?[]:rpc==='get_client_retainer_summary'?{minutes:1905,movements:50,chargesTotal:0,invoiced:0,paid:0,periods:0,pendingPeriods:0,unpaidPeriods:0,effectiveHourlyRate:null}:fixture(rpc,table,args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false);
   await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.goto('/?qa-iphone=1&qa-role=admin&view=clients&clientType=individual&clientMode=list');
  await page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}).dblclick();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Avença',exact:true}).click();
  await dialog.getByText('Abrir condições e edição da avença',{exact:true}).click();
  await dialog.getByLabel('Modalidade da avença').selectOption('retainer_plus_hours');
  await dialog.getByLabel('Preço/hora do excedente').fill('150');
  await expect(dialog.getByLabel('Período de controlo das horas')).toHaveValue('12');
  await expect(dialog.getByLabel('Horas incluídas por período (opcional)')).toHaveValue('32');
  await page.screenshot({path:`output/retainer-plus-hours-${width}-${colorScheme}.png`});
  await dialog.getByRole('button',{name:'Guardar esta condição da avença'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({billing_mode:'retainer_plus_hours',included_hours:32,hours_interval_months:12,excess_hourly_rate:150});
 });
}
