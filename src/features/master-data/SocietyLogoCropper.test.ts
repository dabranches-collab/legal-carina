import { describe,expect,it } from 'vitest'
import { cropSourceRect, logoFitScale, squareCropAroundBounds, squareCropInside } from './logoCropMath'

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

describe('recorte quadrado',()=>{
  it('centra o maior quadrado dentro da selecção',()=>{
    const rect=cropSourceRect(1200,800,squareCropInside(1200,800,{left:10,right:10,top:0,bottom:0}))
    expect(rect.x).toBeCloseTo(200);expect(rect.y).toBe(0);expect(rect.width).toBe(800);expect(rect.height).toBe(800)
  })
  it('envolve os limites detectados com o menor quadrado possível',()=>{
    expect(cropSourceRect(1000,1000,squareCropAroundBounds(1000,1000,{left:100,right:899,top:300,bottom:699}))).toEqual({x:100,y:100,width:800,height:800})
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
