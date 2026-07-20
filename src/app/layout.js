import './globals.css';
import { ThemeProvider } from 'next-themes';
import NavWrapper from '@/components/NavWrapper';
import AlexChat from '@/components/AlexChat';
import VisitorTracker from '@/components/VisitorTracker';
import InstallPrompt from '@/components/InstallPrompt';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import TelemetryProvider from '@/components/TelemetryProvider';
import ProfileCompletePrompt from '@/components/ProfileCompletePrompt';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'https://apex-tau-gules.vercel.app'),
  title: 'Apex',
  description: 'Master your exams with past questions, quizzes, and study materials',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Apex',
    statusBarStyle: 'black-translucent',
    startupImage: [
      { url: '/icon-512.png', media: '(device-width: 1024px)' },
      { url: '/icon-512.png', media: '(device-width: 834px)' },
      { url: '/icon-512.png', media: '(device-width: 430px)' },
      { url: '/icon-192.png', media: '(device-width: 320px)' },
    ],
  },
  other: {
    'apple-touch-icon': '/icon-192.png',
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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
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
          {children}
          <NavWrapper />
          <AlexChat />
          <VisitorTracker />
          <InstallPrompt />
          <ServiceWorkerRegister />
          <AnalyticsTracker />
          <TelemetryProvider />
          <ProfileCompletePrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
