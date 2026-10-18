import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if(id.includes('/node_modules/three/examples/'))return 'three-driving'
          if(id.includes('/node_modules/three/'))return 'three'
          if(id.includes('/node_modules/gsap/'))return 'gsap'
        },
      },
    },
  },
})
