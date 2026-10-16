import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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

function pwaRegisterStub(): Plugin {
  // `vite-plugin-pwa` only serves `virtual:pwa-register` in dev when
  // `devOptions.enabled` is true. We keep the service worker disabled in dev
  // (so `npm run dev` and Playwright run without a worker), but the static
  // import in `PwaUpdatePrompt.tsx` still needs to resolve — hence a no-op
  // stub that only applies to `serve`. Production builds use the real module.
  const id = 'virtual:pwa-register'
  const resolved = `\0${id}`
  return {
    name: 'pwa-register-stub',
    apply: 'serve',
    resolveId(source) {
      if (source === id) return resolved
      return null
    },
    load(moduleId) {
      if (moduleId === resolved) {
        return 'export function registerSW() { return () => undefined }\n'
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    contentSync(),
    contentSyncBuild(),
    pwaRegisterStub(),
    VitePWA({
      // The web manifest is a hand-written file in public/; the plugin only
      // generates the service worker and precaches the build output.
      manifest: false,
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'logo-ll.svg',
        'manifest.webmanifest',
        'icons/*.png',
      ],
      workbox: {
        // App shell only — content/*.json is large and cached lazily at runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // SPA routes (/:level/rules/...) must resolve offline.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Content is immutable per production build, so CacheFirst is safe:
            // a new deploy ships a new service worker with a fresh cache.
            urlPattern: ({ url }) => url.pathname.startsWith('/content/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'content-cache',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
