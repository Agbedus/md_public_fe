import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, DM_Sans, Space_Grotesk } from "next/font/google";
import { siteConfig, siteUrl } from "@/lib/seo";
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
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.title,
    template: "%s | MyndDesk",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: "MyndDesk", url: siteUrl }],
  creator: "MyndDesk",
  publisher: "MyndDesk",
  category: "business software",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
    languages: {
      "en": "/",
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    locale: siteConfig.locale,
    alternateLocale: ["en_GB"],
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MyndDesk — focused team attendance and work management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  manifest: "/manifest.webmanifest",
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
import { MotionProvider } from "@/providers/motion-provider";

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
                let resolved;
                if (!theme || theme === 'system') {
                  resolved = supportDarkMode ? 'dark' : 'light';
                } else {
                  resolved = theme;
                }
                document.documentElement.classList.add(resolved);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider>
          <MotionProvider>
            <GlobalActionProvider>
              <TaskTimerProvider>
                <LocationProvider initialRecord={initialAttendance}>
                  <div className="min-h-screen bg-background transition-colors duration-300">
                    {children}
                  </div>
                  <TaskTimerUI />
                  <CookiePopup />
                </LocationProvider>
              </TaskTimerProvider>
            </GlobalActionProvider>
          </MotionProvider>
        </ThemeProvider>
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-text)',
              border: '1px solid var(--toast-border)',
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
