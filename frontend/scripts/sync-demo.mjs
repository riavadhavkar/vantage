// OWNER: Person B
// Copies the repo's demo/ folder (owned by Person C) into public/demo/ so the
// cached demo is served with the app. Runs before dev and build. Never edits demo/.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../demo')
const dest = resolve(here, '../public/demo')

if (!existsSync(src)) {
  console.log('[sync-demo] no demo/ folder found; demo mode will use the bundled sample path')
  process.exit(0)
}
rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true, filter: (p) => !p.endsWith('.gitkeep') })
console.log(`[sync-demo] copied ${src} -> ${dest}`)
