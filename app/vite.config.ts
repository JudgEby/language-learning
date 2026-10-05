import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const APP_DIR = dirname(fileURLToPath(import.meta.url))
const CONTENT_SRC = resolve(APP_DIR, '..', 'content')
const CONTENT_DST = resolve(APP_DIR, 'public', 'content')

function syncAll(): void {
  if (!existsSync(CONTENT_SRC)) {
    console.warn(`[content] source not found: ${CONTENT_SRC}, skipping sync`)
    return
  }
  rmSync(CONTENT_DST, { recursive: true, force: true })
  mkdirSync(dirname(CONTENT_DST), { recursive: true })
  cpSync(CONTENT_SRC, CONTENT_DST, { recursive: true })
  console.log(`[content] synced ${CONTENT_SRC} -> ${CONTENT_DST}`)
}

function syncPath(srcPath: string, event: string): void {
  const relative = srcPath.slice(CONTENT_SRC.length + 1)
  if (event === 'unlink' || event === 'unlinkDir') {
    rmSync(resolve(CONTENT_DST, relative), { recursive: true, force: true })
    return
  }
  const dstPath = resolve(CONTENT_DST, relative)
  mkdirSync(dirname(dstPath), { recursive: true })
  cpSync(srcPath, dstPath, { recursive: true })
}

function contentSync(): Plugin {
  return {
    name: 'content-sync',
    apply: 'serve',
    configureServer(server) {
      syncAll()
      server.watcher.add(CONTENT_SRC)
      server.watcher.on('all', (event, path) => {
        if (!path.startsWith(CONTENT_SRC)) return
        syncPath(path, event)
        console.log(`[content] ${event}: ${path}`)
        server.ws.send({ type: 'full-reload' })
      })
      server.watcher.on('ready', () => {
        console.log(`[content] watching ${CONTENT_SRC}`)
      })
    },
  }
}

function contentSyncBuild(): Plugin {
  return {
    name: 'content-sync-build',
    apply: 'build',
    buildStart() {
      syncAll()
    },
  }
}

export default defineConfig({
  plugins: [react(), contentSync(), contentSyncBuild()],
})
