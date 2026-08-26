/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function normalizeBasePath(value: string | undefined): string {
  const base = (value || '/').trim();
  return base === '/' ? '/' : `/${base.replace(/^\/+|\/+$/g, '')}/`;
}

function demoAiProxy(enabled: boolean, baseUrl: string, apiKey: string, model: string): Plugin {
  return {
    name: 'smart-sale-demo-ai-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__demo/ai-chat', (request, response, next) => {
        if (request.method !== 'POST') { response.statusCode = 405; response.end(); return; }
        if (!enabled || !baseUrl || !apiKey) { response.statusCode = 503; response.end(JSON.stringify({ error: 'demo_ai_not_configured' })); return; }
        let raw = '';
        request.on('data', (chunk) => {
          raw += chunk;
          if (raw.length > 24_000) request.destroy();
        });
        request.on('error', next);
        request.on('end', async () => {
          try {
            const payload = JSON.parse(raw) as { question?: string; context?: unknown; messages?: Array<{ role?: string; text?: string }> };
            if (!payload.question?.trim() || payload.question.length > 1200) throw new Error('invalid_request');
            const system = `You are a concise Chinese retail shopping assistant. Use only this store context and never invent price, stock, location, or promotions: ${JSON.stringify(payload.context ?? {})}`;
            const upstream = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ model, stream: false, temperature: 0.35, messages: [
                { role: 'system', content: system },
                ...(payload.messages ?? []).slice(-6).filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.text === 'string').map((message) => ({ role: message.role, content: message.text!.slice(0, 1200) })),
                { role: 'user', content: payload.question.trim() }
              ] }),
              signal: AbortSignal.timeout(45_000)
            });
            if (!upstream.ok) throw new Error(`upstream_${upstream.status}`);
            const data = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) throw new Error('empty_response');
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.end(JSON.stringify({ text }));
          } catch {
            response.statusCode = 502;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.end(JSON.stringify({ error: 'demo_ai_unavailable' }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBasePath(env.VITE_APP_BASE_PATH);
  const demoAiEnabled = mode === 'demo' && env.VITE_DEMO_AI_ENABLED === 'true';
  return {
  base,
  plugins: [
    vue(),
    legacy(),
    demoAiProxy(demoAiEnabled, env.DEMO_AI_BASE_URL, env.DEMO_AI_API_KEY, env.DEMO_AI_MODEL || 'deepseek-chat'),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '智售引擎',
        short_name: '智售引擎',
        description: 'AI赋能小微零售：智店管家（商家端）与 智购顾问（买家端）',
        lang: 'zh-CN',
        theme_color: '#3880ff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
};
})
