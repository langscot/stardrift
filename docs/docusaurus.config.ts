import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const DISCORD_URL = process.env.DISCORD_URL || 'https://discord.gg/hTMz4g93mh';

const config: Config = {
  title: 'Stardrift',
  tagline: 'A Discord-native space MMO — mine, trade, and conquer the galaxy.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://stardrift.lang.scot',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  customFields: {
    discordUrl: DISCORD_URL,
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
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'STARDRIFT',
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
        {
          href: DISCORD_URL,
          label: 'Discord',
          position: 'right',
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
        {
          title: 'Community',
          items: [
            {label: 'Join the Discord', href: DISCORD_URL},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Stardrift. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
