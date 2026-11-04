import './globals.css';
import 'swiper/css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { getBaseUrl } from '@/lib/base-url';
import NavWrapper from '@/components/NavWrapper';
import PageTransition from '@/components/PageTransition';
import VisitorTracker from '@/components/VisitorTracker';
import InstallPrompt from '@/components/InstallPrompt';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import TelemetryProvider from '@/components/TelemetryProvider';
import ConnectionStatus from '@/components/ConnectionStatus';

export const metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: 'Apex',
  description: 'Master your exams with past questions, quizzes, and study materials',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Apex',
    statusBarStyle: 'black-translucent',
    startupImage: [
      { url: '/white-logo.png', media: '(device-width: 1024px)' },
      { url: '/white-logo.png', media: '(device-width: 834px)' },
      { url: '/white-logo.png', media: '(device-width: 430px)' },
      { url: '/white-logo.png', media: '(device-width: 320px)' },
    ],
  },
  other: {
    'apple-touch-icon': '/black-logo.png',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#130f40',
    'application-name': 'Apex',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/black-logo.png" />
        <link rel="apple-touch-icon" sizes="500x500" href="/black-logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#130f40" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Apex" />
        <meta name="msapplication-TileColor" content="#130f40" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="apple-mobile-web-app-title" content="Apex" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NavWrapper />
          <PageTransition>{children}</PageTransition>
          <Toaster position="bottom-center" toastOptions={{ style: { marginBottom: 90 } }} />
          <ConnectionStatus />
          <VisitorTracker />
          <InstallPrompt />
          <ServiceWorkerRegister />
          <AnalyticsTracker />
          <TelemetryProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
