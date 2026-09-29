import {expect,test} from '@playwright/test'

for(const theme of ['light','dark'] as const){
 test(`atalho de despesa abre a câmara no iPhone em modo ${theme}`,async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await page.addInitScript(()=>{
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
    document.documentElement.dataset.cameraRequested='true'
    return new MediaStream()
   }}})
  })
  await page.goto(`/?qa-iphone=1&qa-demo=1&safe-top=47&safe-bottom=34&theme=${theme}&view=overview`)
  const shortcuts=['Criar novo registo','Criar novo cliente','Criar nova despesa'].map(name=>page.getByRole('button',{name}))
  const boxes=await Promise.all(shortcuts.map(button=>button.boundingBox()))
  expect(boxes.every(box=>box&&box.width>=44&&box.height>=44)).toBe(true)
  expect(boxes[0]!.y).toBe(boxes[1]!.y)
  expect(boxes[1]!.y).toBe(boxes[2]!.y)
  await shortcuts[2].click()
  await page.getByRole('combobox',{name:'Cliente e vertente'}).selectOption('qa-profile')
  await expect(page.getByRole('button',{name:'Tirar fotografia'})).toBeVisible()
  await expect(page.getByLabel('Escolher a partir de ficheiro')).toHaveAttribute('accept',/image\/jpeg/)
  await page.getByRole('button',{name:'Tirar fotografia'}).click()
  await expect(page.getByLabel('Pré-visualização da câmara')).toBeVisible()
  expect(await page.locator('html').getAttribute('data-camera-requested')).toBe('true')
  await page.getByRole('button',{name:'Cancelar fotografia'}).click()
  await expect(page.getByRole('button',{name:'Tirar fotografia'})).toBeVisible()
 })
}
