import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'vendor-react'
          if (id.includes('/react-markdown/') || id.includes('/remark-gfm/') || id.includes('/unified/') || id.includes('/micromark/') || id.includes('/mdast-util') || id.includes('/hast-util')) return 'vendor-markdown'
          if (id.includes('/axios/')) return 'vendor-axios'
          return undefined
        },
      },
    },
  },
})
