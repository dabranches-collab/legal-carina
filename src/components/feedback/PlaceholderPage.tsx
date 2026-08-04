import { Icon, type IconName } from '../ui/Icon'

export function PlaceholderPage({ title, description, icon }: { title: string; description: string; icon: IconName }) {
  return <section className="card grid min-h-96 place-items-center p-8 text-center"><div><div className="mx-auto grid size-14 place-items-center rounded-xl bg-secondary-soft text-secondary"><Icon name={icon} className="size-7"/></div><h2 className="mt-5 font-display text-2xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{description}</p><span className="mt-5 inline-flex rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-warning">Estrutura visual preparada · integração futura</span></div></section>
}
