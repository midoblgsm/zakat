/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Performance optimization: Set chunk size warning limit
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Vendor chunks - split heavy dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Feature-based chunks
          'pages-applicant': [
            './src/pages/applicant/ApplicantDashboard.tsx',
            './src/pages/applicant/ApplyPage.tsx',
            './src/pages/applicant/ApplicationsPage.tsx',
            './src/pages/applicant/ApplicationDetailPage.tsx',
          ],
          'pages-admin': [
            './src/pages/admin/AdminDashboard.tsx',
            './src/pages/admin/ApplicationPoolPage.tsx',
            './src/pages/admin/MyApplicationsPage.tsx',
            './src/pages/admin/AdminApplicationDetailPage.tsx',
            './src/pages/admin/FlagManagementPage.tsx',
            './src/pages/admin/AnalyticsDashboard.tsx',
          ],
          'pages-super-admin': [
            './src/pages/super-admin/SuperAdminDashboard.tsx',
            './src/pages/super-admin/MasajidListPage.tsx',
            './src/pages/super-admin/MasjidOnboardingPage.tsx',
            './src/pages/super-admin/MasjidDetailPage.tsx',
            './src/pages/super-admin/UserManagementPage.tsx',
            './src/pages/super-admin/SuperAdminApplicationsPage.tsx',
          ],
        },
      },
    },
    // Use esbuild for minification (faster, built-in to Vite)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/auth'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
});
