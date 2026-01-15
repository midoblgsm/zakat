import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Zakat Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/masajid">
              <Button variant="ghost">Our Masajid</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Apply Now</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Zakat Management
              <span className="block text-primary-600">Made Simple</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              A unified platform connecting those in need with masajid across the community.
              Apply for Zakat assistance and get support from multiple participating mosques.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg">Start Your Application</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Check Application Status
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Easy Application</h3>
              <p className="mt-2 text-gray-600">
                Simple step-by-step form to submit your Zakat application with all necessary documentation.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Multi-Masjid Network</h3>
              <p className="mt-2 text-gray-600">
                Your application is reviewed by multiple participating masajid, increasing your chances of receiving assistance.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Secure & Confidential</h3>
              <p className="mt-2 text-gray-600">
                Your personal information is protected with enterprise-grade security and handled with complete confidentiality.
              </p>
            </div>
          </div>

          {/* How it Works */}
          <div className="mt-24">
            <h2 className="text-center text-3xl font-bold text-gray-900">How It Works</h2>
            <div className="mt-12 grid gap-8 lg:grid-cols-4">
              {[
                { step: '1', title: 'Create Account', desc: 'Register with your email and verify your account' },
                { step: '2', title: 'Submit Application', desc: 'Fill out the Zakat application form with required documents' },
                { step: '3', title: 'Review Process', desc: 'Your application is reviewed by Zakat administrators' },
                { step: '4', title: 'Receive Assistance', desc: 'Get notified of the decision and receive Zakat if approved' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Zakat Management Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
