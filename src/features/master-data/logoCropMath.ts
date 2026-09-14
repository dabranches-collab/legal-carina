export const logoFitScale=(canvasWidth:number,canvasHeight:number,imageWidth:number,imageHeight:number)=>Math.min(canvasWidth/imageWidth,canvasHeight/imageHeight)

export type CropInsets={left:number;right:number;top:number;bottom:number}

type PixelBounds={left:number;right:number;top:number;bottom:number}

export function cropSourceRect(imageWidth:number,imageHeight:number,crop:CropInsets){
 const left=Math.max(0,Math.min(99,crop.left)),right=Math.max(0,Math.min(99-left,crop.right)),top=Math.max(0,Math.min(99,crop.top)),bottom=Math.max(0,Math.min(99-top,crop.bottom))
 const x=imageWidth*left/100,y=imageHeight*top/100
 return{x,y,width:Math.max(1,imageWidth-x-imageWidth*right/100),height:Math.max(1,imageHeight-y-imageHeight*bottom/100)}
}

export function squareCropInside(imageWidth:number,imageHeight:number,crop:CropInsets):CropInsets{
 const rect=cropSourceRect(imageWidth,imageHeight,crop),side=Math.min(rect.width,rect.height)
 const x=rect.x+(rect.width-side)/2,y=rect.y+(rect.height-side)/2
 return{left:x/imageWidth*100,right:(imageWidth-x-side)/imageWidth*100,top:y/imageHeight*100,bottom:(imageHeight-y-side)/imageHeight*100}
}

export function squareCropAroundBounds(imageWidth:number,imageHeight:number,bounds:PixelBounds):CropInsets{
 const maxSide=Math.min(imageWidth,imageHeight),side=Math.min(maxSide,Math.max(1,bounds.right-bounds.left+1,bounds.bottom-bounds.top+1))
 const x=Math.max(0,Math.min(imageWidth-side,(bounds.left+bounds.right+1-side)/2))
 const y=Math.max(0,Math.min(imageHeight-side,(bounds.top+bounds.bottom+1-side)/2))
 return{left:x/imageWidth*100,right:(imageWidth-x-side)/imageWidth*100,top:y/imageHeight*100,bottom:(imageHeight-y-side)/imageHeight*100}
}
