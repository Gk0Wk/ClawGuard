import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://clawguard.top',
  integrations: [sitemap()],
  output: 'static',
  build: {
    format: 'directory'
  }
});
