import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { features } from '../../prototypes/workflow/src/catalog.ts'
import { legacyRoute } from '../../prototypes/workflow/src/model.ts'

const root = resolve(import.meta.dirname, '../..')
const missing = features.filter(f => !existsSync(resolve(root, f.source)))
if (missing.length) throw new Error('Fontes inexistentes: ' + missing.map(f => f.source).join(', '))
if (new Set(features.map(f => f.id)).size !== features.length) throw new Error('IDs duplicados')
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8')
const views = app.match(/const validViews:ViewId\[\] = \[([^\]]+)\]/)?.[1].match(/'([^']+)'/g)?.map(v => v.slice(1, -1))
if (!views || views.length !== 16) throw new Error('Rever o inventário de vistas da aplicação')
for (const view of views) {
  const route = legacyRoute('?view=' + view)
  if (!route.area || route.legacy !== view) throw new Error('Vista sem mapeamento: ' + view)
}
if (legacyRoute('?view=clients&clientType=individual').area !== 'resumo' || legacyRoute('?view=clients&clientType=individual&clientMode=list').area !== 'clientes') throw new Error('Preservar a distinção entre painel e lista de clientes')
const folder = resolve(root, 'prototypes/workflow/src')
for (const file of readdirSync(folder).filter(f => /\.(ts|tsx)$/.test(f))) {
  const source = readFileSync(resolve(folder, file), 'utf8')
  if (/\b(fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(|createClient\s*\(|register\s*\(.*sw\.js)/.test(source) || /from\s+['"](@supabase|.*\/src\/App)/.test(source)) throw new Error('Dependência operacional inesperada: ' + file)
}
const changed = execFileSync('git', ['diff', '--name-only', '88adcd6471f3ef469470c6a0899dd1dc6a187eb7'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const operational = changed.filter(f => /^(src\/|worker\/|supabase\/|public\/|package\.json$|pnpm-lock\.yaml$|vite\.config\.ts$|wrangler)/.test(f))
const operationalPreview = process.argv.includes('--operational-preview')
const allowedPreviewFiles = new Set(['src/features/master-data/MasterDataPage.tsx', 'src/features/master-data/RecordDialogHost.tsx', 'src/features/master-data/workflowClientNavigation.ts', 'src/features/master-data/workflowClientNavigation.test.ts', 'src/App.tsx', 'src/App.test.tsx', 'src/components/ui/AppLink.tsx', 'src/components/ui/AppLink.test.tsx', 'src/components/layout/AppShell.tsx', 'src/components/layout/WorkflowNavigation.tsx', 'src/types/workflowNavigation.ts', 'src/types/workflowNavigation.test.ts', 'package.json', 'public/release-notes.json'])
for (const file of ['src/components/layout/workflowPreview.css','src/components/dashboard/Charts.tsx','src/components/dashboard/Charts.test.tsx','src/pages/OverviewPage.tsx']) allowedPreviewFiles.add(file)
const unexpected = operationalPreview ? operational.filter(file => !allowedPreviewFiles.has(file)) : operational
if (unexpected.length) throw new Error('Código operacional fora do âmbito: ' + unexpected.join(', '))
const out = resolve(root, 'output/workflow-review'); mkdirSync(out, { recursive: true })
const counts = Object.fromEntries(['Demonstrado', 'Mapeado', 'Em preparação'].map(status => [status, features.filter(f => f.status === status).length]))
writeFileSync(resolve(out, 'inventory.json'), JSON.stringify(features, null, 2))
writeFileSync(resolve(out, 'audit.json'), JSON.stringify({ baseline: '88adcd6471f3ef469470c6a0899dd1dc6a187eb7', features: features.length, counts, legacyViews: views.length, operationalFilesChanged: operational, remoteServicesUsed: false }, null, 2))
const esc = t => String(t).replaceAll('|', '\\|')
const markdown = ['# Inventário de funcionalidades e destinos', '', 'Preparação isolada de 09-10-2026. Fontes: código da aplicação em `88adcd6`; os 84 destinos conservam a respectiva função na proposta. Um estado “Demonstrado” significa interface/ensaio fictício, não confirmação da integração operacional completa. “Mapeado” significa destino preparado, com componente actual a reutilizar. “Em preparação” conserva um limite existente.', '', 'O selector de perfis do protótipo não altera utilizadores ou permissões. Regras reais, Azure, Auth, Storage, pricing e livro financeiro serão verificados em ambiente próprio antes de qualquer activação.', '', `Contagem: **${features.length} funções**, ${counts.Demonstrado} demonstradas, ${counts.Mapeado} mapeadas e ${counts['Em preparação']} em preparação. **${views.length} vistas antigas** com destino preparado.`, '', '| ID / função | Acesso actual | Destino proposto | Integração / acesso | Estado / fonte |', '| --- | --- | --- | --- | --- |', ...features.map(f => `| ${esc(f.id + ' · ' + f.name)} | ${esc(f.current)} | ${esc(f.proposed)} | ${esc(f.integration + '; ' + f.access)} | ${esc(f.status)}; [fonte](../../${f.source}) |`), '', 'Este inventário é a base de revisão de cobertura. A migração operacional exige validação de cada função pelos operadores e pelos testes dos módulos existentes.']
writeFileSync(resolve(root, 'docs/workflow/inventory.md'), markdown.join('\n') + '\n')
console.log(JSON.stringify({ features: features.length, counts, mappedViews: views.length, operationalFilesChanged: operational.length }))
