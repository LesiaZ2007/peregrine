import '@fontsource-variable/archivo/standard.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './globals.css';
import './compare.css';
import './mobile.css';
import type { Metadata, Viewport } from 'next';
import TopBar from '@/components/TopBar';

export const metadata: Metadata = {
  title: 'Peregrine — go anywhere, cheaply',
  description:
    'Find cheap, interesting trips from where you are: trains, coaches, flights, ferries and rideshares, with every setting yours to change.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e7e9e1' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1620' },
  ],
};

const themeScript = `try{var t=localStorage.getItem('pg:theme');if(t==='"light"'||t==='"dark"')document.documentElement.dataset.theme=JSON.parse(t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
