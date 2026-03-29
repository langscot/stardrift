import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  gameSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Mechanics',
      items: [
        'mechanics/mining',
        'mechanics/inventory',
        'mechanics/travel',
        'mechanics/trading',
      ],
    },
    {
      type: 'category',
      label: 'Universe',
      items: [
        'universe/galaxy',
        'universe/systems',
        'universe/star-types',
      ],
    },
    'commands',
    'roadmap',
  ],
};

export default sidebars;
