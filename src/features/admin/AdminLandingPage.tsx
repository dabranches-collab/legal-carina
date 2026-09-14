import { Icon, type IconName } from '../../components/ui/Icon'
import type { ViewId } from '../../types/navigation'
import { useAuth } from '../auth/AuthContext'

const options:{view:ViewId;label:string;icon:IconName;ownerOnly?:boolean}[]=[
  {view:'admin-users',label:'Utilizadores',icon:'people'},
  {view:'admin-access-logs',label:'Registos de acesso',icon:'audit',ownerOnly:true},
]

export function AdminLandingPage({onNavigate}:{onNavigate:(view:ViewId)=>void}) {
  const {role}=useAuth()
  return <nav aria-label="Administração" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{options.filter(option=>!option.ownerOnly||role==='owner').map(option=><button key={option.view} type="button" onClick={()=>onNavigate(option.view)} className="card flex min-h-36 flex-col items-center justify-center gap-3 p-6 text-center text-primary transition hover:-translate-y-0.5 hover:border-accent hover:shadow-raised"><span className="grid size-14 place-items-center rounded-xl bg-secondary-soft text-secondary"><Icon name={option.icon} className="size-7"/></span><span className="font-display text-lg font-semibold">{option.label}</span></button>)}</nav>
}
