import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora-sans",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MD Platform",
  description: "A bespoke, secure, and intelligent productivity platform.",
  icons: {
    icon: "/logo.svg",
  },
};

import { auth } from "@/auth";
import { Toaster } from 'react-hot-toast';
import { TaskTimerProvider } from '@/providers/task-timer-provider';
import { TaskTimerUI } from '@/components/ui/tasks/task-timer-ui';
import { LocationProvider } from '@/providers/location-provider';
import { getMyAttendanceToday } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { CookiePopup } from '@/components/ui/cookie-popup';

import { ThemeProvider } from "@/providers/theme-provider";
import { GlobalActionProvider } from "@/providers/global-action-provider";
import { AstryxProvider } from "@/providers/astryx-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const initialAttendance = session ? await getMyAttendanceToday() : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('md_platform_theme_preference');
                let supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (!theme || theme === 'system') {
                  document.documentElement.classList.add(supportDarkMode ? 'dark' : 'light');
                } else {
                  document.documentElement.classList.add(theme);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider>
          <GlobalActionProvider>
            <TaskTimerProvider>
              <LocationProvider initialRecord={initialAttendance}>
                <AstryxProvider>
                  <div className="min-h-screen bg-background transition-colors duration-300">
                    {children}
                  </div>
                </AstryxProvider>
                <TaskTimerUI />
                <CookiePopup />
              </LocationProvider>
            </TaskTimerProvider>
          </GlobalActionProvider>
        </ThemeProvider>
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-text)',
              border: '1px solid var(--toast-border)',
              backdropFilter: 'blur(12px)',
              padding: '16px 24px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '16px',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
          }} 
        />
      </body>
    </html>
  );
}
