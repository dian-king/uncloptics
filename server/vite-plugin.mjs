import { apiMount } from './api.mjs'

export default function lumiereStudio() {
  return {
    name: 'lumiere-studio',
    configureServer(server) {
      server.middlewares.use(apiMount)
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMount)
    },
  }
}
