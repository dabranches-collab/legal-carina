import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const build = resolve(root, 'output/workflow-preview')
const out = resolve(root, 'output/workflow-review'); mkdirSync(out, { recursive: true })
let html = readFileSync(resolve(build, 'index.html'), 'utf8')
const assets = resolve(build, 'assets')
const js = readdirSync(assets).filter(f => f.endsWith('.js'))
if (js.length !== 1) throw new Error('O HTML autónomo exige um único bundle; reconstruir com codeSplitting=false.')
html = html.replace(/<script[^>]+src="\.\/assets\/[^"]+"[^>]*><\/script>/, () => '<script type="module">' + readFileSync(resolve(assets, js[0]), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>')
html = html.replace(/<link[^>]+href="\.\/assets\/([^"]+\.css)"[^>]*>/g, (_match, file) => '<style>' + readFileSync(resolve(assets, file), 'utf8') + '</style>')
if (/src="\.\/assets\/|href="\.\/assets\//.test(html)) throw new Error('Referências externas no HTML autónomo')
writeFileSync(resolve(out, 'carina-workflow-demonstracao.html'), html)
cpSync(resolve(root, 'prototypes/workflow/README.md'), resolve(out, 'LEIA-ME.md'))
console.log('HTML autónomo preparado: output/workflow-review/carina-workflow-demonstracao.html')
