import { execFileSync } from 'node:child_process'

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
const allowed = new Set(['.env.example', 'src/test/fixtures/horas-anonimizadas.csv'])
const forbidden = [
  /^\.env(\.|$)/i, /^(imports|uploads|client-data|client-documents|legal-documents|dumps|backups)\//i,
  /\.(xlsx?|xlsm|ods|tsv|pdf|docx?|rtf|dump|bak|pem|key|p12|pfx)$/i,
  /(credentials|service-account).*\.json$/i,
]
const violations = tracked.filter((file) => !allowed.has(file) && forbidden.some((pattern) => pattern.test(file)))
if (violations.length) {
  console.error(`Ficheiros sensíveis versionados:\n${violations.map((file) => `- ${file}`).join('\n')}`)
  process.exitCode = 1
} else console.log('Nenhum ficheiro sensível proibido está versionado.')
