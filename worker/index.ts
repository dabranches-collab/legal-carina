interface Env { ASSETS: Fetcher }

const securityHeaders:Record<string,string>={
  'Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://vtvvqyebigflgqccbqsw.supabase.co wss://vtvvqyebigflgqccbqsw.supabase.co; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests",
  'Cross-Origin-Opener-Policy':'same-origin',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Permissions-Policy':'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
}

export default {
  async fetch(request:Request,env:Env):Promise<Response>{
    if(!['GET','HEAD'].includes(request.method))return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}})
    const asset=await env.ASSETS.fetch(request),response=new Response(asset.body,asset)
    for(const [name,value]of Object.entries(securityHeaders))response.headers.set(name,value)
    const path=new URL(request.url).pathname
    if(path==='/'||response.headers.get('content-type')?.includes('text/html'))response.headers.set('Cache-Control','no-cache')
    if(path==='/sw.js')response.headers.set('Cache-Control','no-cache, no-store, must-revalidate')
    return response
  },
} satisfies ExportedHandler<Env>
