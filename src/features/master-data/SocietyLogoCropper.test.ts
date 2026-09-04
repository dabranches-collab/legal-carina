import { describe,expect,it } from 'vitest'
import { cropSourceRect, logoFitScale } from './logoCropMath'

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

describe('recorte independente do logótipo',()=>{
  it('retira apenas as margens laterais sem alterar a altura',()=>{
    expect(cropSourceRect(1000,400,{left:10,right:20,top:0,bottom:0})).toEqual({x:100,y:0,width:700,height:400})
  })
  it('impede que lados opostos eliminem toda a imagem',()=>{
    const rect=cropSourceRect(100,100,{left:80,right:80,top:0,bottom:0})
    expect(rect.width).toBe(1)
  })
})
