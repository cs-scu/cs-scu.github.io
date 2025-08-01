import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src', // مشخص می‌کند که فایل‌های اصلی در پوشه src هستند
  build: {
    outDir: '../dist' // خروجی بیلد در پوشه dist در ریشه پروژه ذخیره شود
  }
})