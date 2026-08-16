import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/layout/AppShell';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Drashti Optic | Store Billing & Optical Management',
  description: 'Complete optical store billing, prescription management, inventory, and automatic WhatsApp PDF invoicing system for Drashti Optic.',
  icons: {
    icon: '/drashti-optic-logo.png',
    shortcut: '/drashti-optic-logo.png',
    apple: '/drashti-optic-logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
