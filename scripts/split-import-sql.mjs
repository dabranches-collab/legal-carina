import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [sourcePath, outputDirectory] = process.argv.slice(2)
if (!sourcePath || !outputDirectory) throw new Error('Uso: node split-import-sql.mjs <sql> <output-directory>')

mkdirSync(outputDirectory, { recursive: false })
const statements = readFileSync(sourcePath, 'utf8')
  .split(/\r?\n\r?\n/)
  .map((statement) => statement.trim())
  .filter((statement) => statement && statement !== 'begin;' && statement !== 'commit;')

const maxBytes = 2_500_000
const groups = []
let current = []
let bytes = 0
for (const statement of statements) {
  const statementBytes = Buffer.byteLength(statement, 'utf8') + 2
  if (current.length && bytes + statementBytes > maxBytes) {
    groups.push(current)
    current = []
    bytes = 0
  }
  current.push(statement)
  bytes += statementBytes
}
if (current.length) groups.push(current)

groups.forEach((group, index) => {
  const name = `${String(index + 1).padStart(3, '0')}.sql`
  writeFileSync(join(outputDirectory, name), `begin;\n\n${group.join('\n\n')}\n\ncommit;\n`, { encoding: 'utf8', flag: 'wx' })
})

console.log(JSON.stringify({ files: groups.length, maxBytes }))
