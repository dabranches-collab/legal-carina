import{expect,test}from'@playwright/test'

const routes=['view=overview','view=clients','view=billing','view=professionals','view=work','view=notes','view=retainers','view=master-data&entity=clients','view=master-data&entity=billing_entities','view=master-data&entity=professionals','view=admin','view=imports']

test('protótipo QA percorre todos os menus sem consultar dados reais nem apresentar erros',async({page})=>{for(const route of routes){await page.goto(`/?qa-iphone=1&qa-role=admin&qa-demo=1&${route}`);await expect(page.locator('body')).not.toBeEmpty();await expect(page.getByRole('alert')).toHaveCount(0);const text=await page.locator('body').innerText();expect(text).not.toMatch(/permission denied|failed to fetch/i);if(route!=='view=notes')expect(text).not.toMatch(/\bTESTE\b/)}})
