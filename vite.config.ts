import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { telemetryLogPlugin } from './vite.telemetryPlugin.ts'

export default defineConfig({
  plugins: [react(), telemetryLogPlugin()],
})
