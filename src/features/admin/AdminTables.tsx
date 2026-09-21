import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'
import {formatDateTime} from '../../utils/date'

type UserRow={userId:string;username:string;displayName:string;pinConfigured:boolean;role:string;active:boolean;lastSignInAt:string|null}
type LoginRow={userId:string;username:string;displayName:string;firstAt:string;lastAt:string;count:number;events:string[]}

const roles:Record<string,string>={owner:'Proprietário',admin:'Administrador',manager:'Gestor',operator:'Operador',billing:'Financeiro',professional:'Advogado',viewer:'Consulta',auditor:'Auditor'}

export function AdminUsersTable({rows,loading,onConfigure}:{rows:UserRow[];loading:boolean;onConfigure:(row:UserRow)=>void}){
  const columns:TableColumn<UserRow>[]=[
    {id:'name',label:'Nome',essential:true,sticky:true,filterable:false,value:row=>row.displayName||'Sem nome'},
    {id:'username',label:'Utilizador',filterable:false,value:row=>row.username||'Por configurar',render:row=><><span className="block">{row.username||'Por configurar'}</span>{!row.pinConfigured&&<span className="text-xs text-warning">PIN por configurar</span>}</>},
    {id:'role',label:'Perfil',filterable:false,filterOptions:Object.values(roles).map(label=>({value:label,label})),value:row=>roles[row.role]??row.role},
    {id:'active',label:'Estado',kind:'boolean',filterable:false,value:row=>row.active,render:row=><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.active?'bg-success-soft text-success':'bg-surface-subtle text-text-secondary'}`}>{row.active?'Activo':'Inactivo'}</span>},
    {id:'last',label:'Último acesso',kind:'date',filterable:false,value:row=>row.lastSignInAt,render:row=>row.lastSignInAt?formatDateTime(row.lastSignInAt):'Ainda não entrou'},
    {id:'actions',label:'Acções',sortable:false,searchable:false,exportable:false,value:()=>null,render:row=><button type="button" onClick={()=>onConfigure(row)} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary">Configurar</button>},
  ]
  return <StandardDataTable id="admin-users" label="Utilizadores existentes" rows={rows} columns={columns} rowKey={row=>row.userId} loading={loading} onRowDoubleClick={onConfigure} defaultPageSize={20}/>
}

export function LoginActivityTable({rows}:{rows:LoginRow[]}){
  const columns:TableColumn<LoginRow>[]=[
    {id:'user',label:'Utilizador',essential:true,sticky:true,value:row=>`${row.displayName} ${row.username}`,render:row=><><span className="block font-medium">{row.displayName}</span><span className="text-xs text-text-secondary">{row.username}</span></>},
    {id:'first',label:'Primeira entrada do bloco',kind:'date',value:row=>row.firstAt,render:row=>formatDateTime(row.firstAt)},
    {id:'last',label:'Última entrada do bloco',kind:'date',value:row=>row.lastAt,render:row=>formatDateTime(row.lastAt)},
    {id:'count',label:'Entradas',kind:'number',align:'right',value:row=>row.count},
    {id:'detail',label:'Detalhe',sortable:false,searchable:false,exportable:false,value:()=>null,render:row=>row.count>1?<details><summary className="cursor-pointer font-semibold text-primary">Ver entradas</summary><ul className="mt-2 space-y-1 text-xs text-text-secondary">{row.events.map((date,index)=><li key={`${date}-${index}`}>{formatDateTime(date)}</li>)}</ul></details>:<span className="text-text-secondary">Entrada única</span>},
  ]
  return <StandardDataTable id="login-activity" label="Entradas registadas" rows={rows} columns={columns} rowKey={(row)=>`${row.userId}-${row.lastAt}`} defaultPageSize={20}/>
}
