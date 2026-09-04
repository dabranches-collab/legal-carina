export const logoFitScale=(canvasWidth:number,canvasHeight:number,imageWidth:number,imageHeight:number)=>Math.min(canvasWidth/imageWidth,canvasHeight/imageHeight)

export type CropInsets={left:number;right:number;top:number;bottom:number}

export function cropSourceRect(imageWidth:number,imageHeight:number,crop:CropInsets){
 const left=Math.max(0,Math.min(99,crop.left)),right=Math.max(0,Math.min(99-left,crop.right)),top=Math.max(0,Math.min(99,crop.top)),bottom=Math.max(0,Math.min(99-top,crop.bottom))
 const x=imageWidth*left/100,y=imageHeight*top/100
 return{x,y,width:Math.max(1,imageWidth-x-imageWidth*right/100),height:Math.max(1,imageHeight-y-imageHeight*bottom/100)}
}
