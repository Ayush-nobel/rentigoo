/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Phone checks are live only when the DLT IDs are set (the same rule as amplify/backend.ts),
// so public pages never claim checks we don't do yet.
const phoneCheckLive = Boolean(process.env.DLT_ENTITY_ID && process.env.DLT_TEMPLATE_ID && process.env.SMS_SENDER_ID)
// ID checks are live only when the Setu keys are set (same rule as amplify/backend.ts).
const idCheckLive = Boolean(process.env.SETU_CLIENT_ID && process.env.SETU_PRODUCT_INSTANCE_ID)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __PHONE_CHECK_LIVE__: JSON.stringify(phoneCheckLive), __ID_CHECK_LIVE__: JSON.stringify(idCheckLive) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: ['shared/**/*.test.ts', 'src/**/*.test.ts', 'amplify/**/*.test.ts'],
  },
})
