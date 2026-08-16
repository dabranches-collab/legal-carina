import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function platformInstructions() {
  const agent = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(agent)) return { title: 'Instalar no iPhone ou iPad', steps: ['Abra esta página no Safari.', 'Toque em Partilhar.', 'Escolha “Adicionar ao ecrã principal”.', 'Confirme em “Adicionar”.'] }
  if (/Android/i.test(agent)) return { title: 'Instalar no Android', steps: ['Abra o menu do Chrome.', 'Escolha “Instalar aplicação” ou “Adicionar ao ecrã principal”.', 'Confirme a instalação.'] }
  return { title: 'Instalar no Windows', steps: ['Abra esta página no Chrome ou Edge.', 'Clique no ícone de instalação na barra de endereço.', 'Em alternativa, abra o menu do navegador e escolha “Instalar Carina - Legal”.'] }
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [open, setOpen] = useState(false)
  const installed = window.matchMedia('(display-mode: standalone)').matches
  const instructions = platformInstructions()

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])

  if (installed) return null
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Instalar aplicação" className="app-safe-install fixed bottom-4 left-4 z-[65] grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-surface px-3 font-semibold text-primary shadow-raised sm:rounded-xl" title="Instalar aplicação"><span aria-hidden="true" className="text-xl">⇩</span><span className="ml-2 hidden sm:inline">Instalar aplicação</span></button>
    {open && <div className="app-safe-fixed fixed z-[80] grid place-items-center bg-primary/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="install-title" className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-secondary">Carina - Legal</p><h2 id="install-title" className="mt-1 font-display text-2xl font-semibold">{instructions.title}</h2></div><button onClick={() => setOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-surface-subtle" aria-label="Fechar instruções">×</button></div>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-text-secondary">{instructions.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        {prompt && <button onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); setOpen(false) }} className="mt-6 min-h-11 w-full rounded-lg bg-primary px-4 font-semibold text-surface">Instalar agora</button>}
        {!prompt && <p className="mt-5 rounded-lg bg-surface-subtle p-3 text-xs leading-5 text-text-secondary">Se a opção não aparecer, confirme que abriu o endereço publicado num navegador compatível e que a aplicação ainda não está instalada.</p>}
      </section>
    </div>}
  </>
}
