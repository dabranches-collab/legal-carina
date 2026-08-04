import type { ReactNode } from 'react'

type SectionCardProps = { title: string; description: string; icon: ReactNode }

export function SectionCard({ title, description, icon }: SectionCardProps) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <div aria-hidden="true" className="mb-5 grid size-11 place-items-center rounded-xl bg-cream-100 text-gold-600">{icon}</div>
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-700">{description}</p>
    </article>
  )
}
