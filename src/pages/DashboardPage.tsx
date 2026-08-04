import { SectionCard } from '../components/SectionCard'

const modules = [
  ['Horas', 'Registo e validação do trabalho por cliente e assunto.', '◷'],
  ['Clientes', 'Informação centralizada com acesso sujeito a permissões.', '◇'],
  ['Faturação', 'Preparação e acompanhamento do ciclo de faturação.', '▤'],
  ['Recebimentos', 'Controlo de valores pendentes e recebidos.', '€'],
] as const

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(177,138,68,0.14),transparent_35%)]">
      <header className="border-b border-black/10 bg-white/80 backdrop-blur">
        <nav aria-label="Navegação principal" className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="#inicio" className="font-serif text-xl font-bold tracking-tight">Legal Carina</a>
          <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ink-700">Fundação</span>
        </nav>
      </header>
      <main id="inicio" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Gestão jurídica</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-6xl">Clareza operacional, com confidencialidade desde a origem.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-700">Base técnica para gerir horas, clientes, faturação e recebimentos. Os fluxos funcionais e o acesso a dados serão implementados nas próximas fases.</p>
        </div>
        <section aria-labelledby="modulos" className="mt-14">
          <h2 id="modulos" className="sr-only">Módulos previstos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map(([title, description, icon]) => <SectionCard key={title} title={title} description={description} icon={icon} />)}
          </div>
        </section>
        <aside className="mt-8 rounded-2xl border border-gold-500/30 bg-cream-100 p-6 text-sm leading-6 text-ink-700" aria-label="Estado da aplicação">
          <strong className="text-ink-950">Estado:</strong> fundação técnica criada; sem dados reais, autenticação ou ligações remotas ativas.
        </aside>
      </main>
    </div>
  )
}
