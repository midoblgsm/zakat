import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SkipLink } from '@/components/common/SkipLink';

export function RootLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Skip links for keyboard navigation (WCAG 2.1 Level A) */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#primary-navigation" className="focus:left-4 focus:top-16">
        Skip to navigation
      </SkipLink>

      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main
          id="main-content"
          className="flex-1 p-6"
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
