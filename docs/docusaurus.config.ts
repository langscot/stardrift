import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Stellar Drift',
  tagline: 'A Discord-native space MMO — mine, trade, and conquer the galaxy.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://your-stellar-drift-docs.vercel.app',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Stellar Drift',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'gameSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/roadmap',
          label: 'Roadmap',
          position: 'left',
        },
        {
          to: '/commands',
          label: 'Commands',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guides',
          items: [
            {label: 'Getting Started', to: '/getting-started'},
            {label: 'Mining', to: '/mechanics/mining'},
            {label: 'Travel', to: '/mechanics/travel'},
            {label: 'Trading', to: '/mechanics/trading'},
          ],
        },
        {
          title: 'Reference',
          items: [
            {label: 'Commands', to: '/commands'},
            {label: 'Star Types', to: '/universe/star-types'},
            {label: 'Roadmap', to: '/roadmap'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Stellar Drift. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
