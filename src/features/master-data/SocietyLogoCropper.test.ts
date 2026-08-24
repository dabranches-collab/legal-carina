import { describe,expect,it } from 'vitest'
import { logoFitScale } from './logoCropMath'

describe('enquadramento inicial do logótipo',()=>{
  it('mantém integralmente visível uma imagem larga',()=>{
    const scale=logoFitScale(600,200,1200,300)
    expect(1200*scale).toBeLessThanOrEqual(600)
    expect(300*scale).toBeLessThanOrEqual(200)
  })

  it('mantém integralmente visível uma imagem alta ou página PDF',()=>{
    const scale=logoFitScale(600,200,800,1200)
    expect(800*scale).toBeLessThanOrEqual(600)
    expect(1200*scale).toBeLessThanOrEqual(200)
  })
})
