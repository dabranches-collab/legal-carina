import { Icon, type IconName } from '../../components/ui/Icon'
import type { ViewId } from '../../types/navigation'

const options:{view:ViewId;label:string;icon:IconName}[]=[
  {view:'admin-users',label:'Utilizadores',icon:'people'},
  {view:'imports',label:'Importações',icon:'import'},
  {view:'import-review',label:'Revisão de importações',icon:'warning'},
]

export function AdminLandingPage({onNavigate}:{onNavigate:(view:ViewId)=>void}) {
  return <nav aria-label="Administração" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{options.map(option=><button key={option.view} type="button" onClick={()=>onNavigate(option.view)} className="card flex min-h-36 flex-col items-center justify-center gap-3 p-6 text-center text-primary transition hover:-translate-y-0.5 hover:border-accent hover:shadow-raised"><span className="grid size-14 place-items-center rounded-xl bg-secondary-soft text-secondary"><Icon name={option.icon} className="size-7"/></span><span className="font-display text-lg font-semibold">{option.label}</span></button>)}</nav>
}
