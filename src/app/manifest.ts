import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyndDesk — Team Attendance & Work Management',
    short_name: 'MyndDesk',
    description:
      'Focused attendance, tasks, projects and time-off management for small businesses and startups.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090a0c',
    theme_color: '#34d399',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
