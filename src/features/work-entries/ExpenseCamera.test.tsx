import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach,expect,it,vi} from 'vitest'
import {ExpenseCamera} from './ExpenseCamera'

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})

it('abre a câmara traseira directamente e pára-a ao cancelar',async()=>{
 const stop=vi.fn()
 const getUserMedia=vi.fn().mockResolvedValue({getTracks:()=>[{stop}]})
 vi.stubGlobal('navigator',Object.assign(Object.create(navigator),{mediaDevices:{getUserMedia}}))
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined)
 const user=userEvent.setup()
 render(<ExpenseCamera onCapture={vi.fn()}/> )
 await user.click(screen.getByRole('button',{name:'Tirar fotografia'}))
 expect(getUserMedia).toHaveBeenCalledWith({audio:false,video:{facingMode:{ideal:'environment'}}})
 await screen.findByRole('button',{name:'Cancelar fotografia'})
 await user.click(screen.getByRole('button',{name:'Cancelar fotografia'}))
 await waitFor(()=>expect(stop).toHaveBeenCalledOnce())
 expect(screen.getByRole('button',{name:'Tirar fotografia'})).toBeInTheDocument()
})

it('capta um JPEG e liberta a câmara',async()=>{
 const stop=vi.fn(),onCapture=vi.fn()
 vi.stubGlobal('navigator',Object.assign(Object.create(navigator),{mediaDevices:{getUserMedia:vi.fn().mockResolvedValue({getTracks:()=>[{stop}]})}}))
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined)
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D)
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['jpeg'],{type:'image/jpeg'})))
 const user=userEvent.setup()
 render(<ExpenseCamera onCapture={onCapture}/> )
 await user.click(screen.getByRole('button',{name:'Tirar fotografia'}))
 const video=await screen.findByLabelText('Pré-visualização da câmara')
 Object.defineProperties(video,{videoWidth:{value:1200},videoHeight:{value:1600}})
 fireEvent.loadedMetadata(video)
 await user.click(screen.getByRole('button',{name:'Capturar fotografia'}))
 await waitFor(()=>expect(onCapture).toHaveBeenCalledOnce())
 expect(onCapture.mock.calls[0][0]).toEqual(expect.objectContaining({type:'image/jpeg'}))
 expect(stop).toHaveBeenCalledOnce()
})
