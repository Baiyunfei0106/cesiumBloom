import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import cesium from 'vite-plugin-cesium'
 
/**
 * 详情见 vitejs 文档：https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [vue(),cesium()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})