import {describe,it,expect} from 'vitest'
import {clientGroups,clientPages,restoreClientGroup} from './workflowClientNavigation'
describe('destinos da ficha reorganizada',()=>{
 it('conserva as dez páginas em cinco grupos',()=>{expect(clientGroups).toHaveLength(5);expect(new Set(clientPages.map(p=>p.id)).size).toBe(10);expect(clientPages.filter(p=>p.group==='finance').map(p=>p.id)).toEqual(['provisions','credentials','documents','invoices','honorariumNotes'])})
 it('abre Resumo numa ficha sem destino anterior',()=>expect(restoreClientGroup(null,'general',false,false)).toBe('summary'))
 it('restaura a consulta de registos acima da página guardada',()=>expect(restoreClientGroup('data','general',true,true)).toBe('work'))
 it('conserva deep links de documentos e contratos',()=>{expect(restoreClientGroup(null,'documents',true,false)).toBe('finance');expect(restoreClientGroup(null,'fixedFees',true,false)).toBe('contracts')})
 it('conserva o Resumo ao recarregar mesmo com general no URL',()=>expect(restoreClientGroup('summary','general',true,false)).toBe('summary'))
 it('deriva o grupo do destino em vez de aceitar parâmetros inválidos',()=>expect(restoreClientGroup('unknown','contacts',true,false)).toBe('data'))
})
