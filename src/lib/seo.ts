const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  // The production host. Every canonical, Open Graph URL and structured-data
  // @id is derived from this, so the fallback has to be a domain that actually
  // resolves — it previously pointed at an unregistered one, which would have
  // had the whole site advertising a dead host had the env var ever gone
  // missing.
  'https://md.agbedus.com';

export const siteUrl = configuredSiteUrl.replace(/\/$/, '');

export const siteConfig = {
  name: 'MyndDesk',
  title: 'MyndDesk | Simple Team Attendance & Work Management',
  description:
    'MyndDesk helps small businesses and startups track team attendance, tasks, projects and time off—without tracking everything.',
  locale: 'en_US',
  keywords: [
    'team attendance software',
    'employee attendance software Africa',
    'global team attendance software',
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
      areaServed: ['Africa', 'Worldwide'],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: siteConfig.name,
      description: siteConfig.description,
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'en',
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
