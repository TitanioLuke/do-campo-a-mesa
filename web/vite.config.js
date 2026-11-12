import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Atender também no IP da máquina, e não só em localhost, para a aplicação
    // poder ser aberta no telemóvel enquanto se desenvolve. O endereço a usar
    // aparece no terminal como "Network".
    host: true,
  },
})
