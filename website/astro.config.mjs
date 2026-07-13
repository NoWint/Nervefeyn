// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"

// https://astro.build/config
export default defineConfig({
  srcDir: './src',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
  site: 'https://nervefeyn.dev',
  markdown: {
    shikiConfig: {
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
    },
  },
})
