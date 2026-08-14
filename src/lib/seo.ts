const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'https://mynddesk.com';

export const siteUrl = configuredSiteUrl.replace(/\/$/, '');

export const siteConfig = {
  name: 'MyndDesk',
  title: 'MyndDesk | Simple Team Attendance & Work Management',
  description:
    'MyndDesk helps small businesses and startups track team attendance, tasks, projects and time off—without tracking everything.',
  locale: 'en_GH',
  keywords: [
    'team attendance software',
    'employee attendance software Ghana',
    'attendance management software Africa',
    'small business task management',
    'startup project management software',
    'hybrid team management',
    'employee time off tracking',
    'AI workplace assistant',
    'team productivity software',
    'geofenced attendance',
  ],
} as const;

export const landingPageStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: siteConfig.name,
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
      description: siteConfig.description,
      areaServed: ['Ghana', 'Africa', 'Worldwide'],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: siteConfig.name,
      description: siteConfig.description,
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'en-GH',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#software`,
      name: siteConfig.name,
      url: siteUrl,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Workforce and project management',
      operatingSystem: 'Web',
      description: siteConfig.description,
      audience: {
        '@type': 'BusinessAudience',
        audienceType: 'Small businesses, startups and growing teams',
      },
      featureList: [
        'Geofenced team attendance',
        'Task and project management',
        'Employee time-off workflows',
        'AI workplace assistant',
        'Multi-organization workspaces',
      ],
      provider: { '@id': `${siteUrl}/#organization` },
    },
  ],
};

export const privatePageMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};
import type { Metadata } from 'next';
