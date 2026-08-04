import { Icon } from '../ui/Icon'

export function TableSkeleton({ columns = 6 }: { columns?: number }) {
  return <div role="status" aria-label="A carregar registos" className="card overflow-hidden"><span className="sr-only">A carregar…</span>{Array.from({ length: 6 }, (_, row) => <div key={row} className="flex gap-4 border-b border-border p-4 last:border-0">{Array.from({ length: columns }, (_, column) => <span key={column} className="h-4 flex-1 animate-pulse rounded bg-surface-subtle" />)}</div>)}</div>
}

export function TableEmptyState({ onClear }: { onClear?: () => void }) {
  return <div className="card grid min-h-64 place-items-center p-6 text-center"><div><Icon name="search" className="mx-auto size-8 text-text-secondary"/><h3 className="mt-3 font-semibold">Nenhum registo encontrado</h3><p className="mt-1 text-sm text-text-secondary">Ajuste os filtros ou limpe a pesquisa para ver outros resultados.</p>{onClear && <button onClick={onClear} className="mt-4 text-sm font-semibold text-secondary hover:underline">Limpar filtros</button>}</div></div>
}

export function TableErrorState({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5"><div className="flex gap-3"><Icon name="warning" className="mt-0.5 size-5 shrink-0 text-danger"/><div><h3 className="font-semibold text-danger">Não foi possível carregar os registos</h3><p className="mt-1 text-sm text-text-secondary">Os dados não foram alterados. Tente novamente ou contacte um administrador.</p><button onClick={onRetry} className="mt-3 text-sm font-semibold text-danger underline">Tentar novamente</button></div></div></div>
}
