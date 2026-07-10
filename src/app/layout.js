import './globals.css';
import NavWrapper from '@/components/NavWrapper';
import VisitorTracker from '@/components/VisitorTracker';
import InstallPrompt from '@/components/InstallPrompt';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import ProfileCompletePrompt from '@/components/ProfileCompletePrompt';

export const metadata = {
  title: 'Apex',
  description: 'Master your exams with past questions',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Apex', statusBarStyle: 'black-translucent' },
  other: {
    'apple-touch-icon': '/just-logo.png',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/just-logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#130f40" />
      </head>
      <body>
        {children}
        <NavWrapper />
        <VisitorTracker />
        <InstallPrompt />
        <ServiceWorkerRegister />
        <AnalyticsTracker />
        <ProfileCompletePrompt />
      </body>
    </html>
  );
}
