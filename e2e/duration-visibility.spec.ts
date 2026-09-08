import {expect,test} from '@playwright/test'

for(const width of [320,390,768,1280])for(const theme of ['light','dark']){
 test(`duração seleccionada legível a ${width}px em ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:900})
  await page.goto(`/?qa-iphone=1&qa-demo=1&qa-allocation=1&view=work&theme=${theme}&safe-top=47&safe-bottom=34`)
  await page.getByRole('button',{name:'Criar novo registo',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Criar movimento'})
  const minutes=dialog.getByLabel('Minutos',{exact:true})
  await minutes.selectOption('30')
  await dialog.getByRole('spinbutton',{name:/^Valor\/hora/}).fill('150')
  await expect(minutes).toHaveValue('30')
  await expect(dialog.getByRole('spinbutton',{name:/^Valor total/})).toHaveValue('75')
  for(const label of ['Dias','Horas','Minutos']){
   const control=dialog.getByLabel(label,{exact:true})
   const metrics=await control.evaluate(element=>{
    const style=getComputedStyle(element),box=element.getBoundingClientRect()
    return {width:box.width,space:box.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-22,right:box.right,viewport:innerWidth}
   })
   expect(metrics.width).toBeGreaterThanOrEqual(64)
   expect(metrics.space).toBeGreaterThanOrEqual(24)
   expect(metrics.right).toBeLessThanOrEqual(metrics.viewport)
  }
  await minutes.evaluate(element=>element.scrollIntoView({block:'center'}))
  await page.screenshot({path:`.tmp/duration-${width}-${theme}.png`})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 })
}
