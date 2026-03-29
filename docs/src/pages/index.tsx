import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/getting-started">
            New Pilot Guide
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="/commands">
            Commands Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

type FeatureItem = {
  title: string;
  description: ReactNode;
  emoji: string;
};

const features: FeatureItem[] = [
  {
    emoji: '⛏️',
    title: 'Mine the Galaxy',
    description: 'Drill ore from planets and asteroid belts across 100,000+ star systems. Different worlds yield different resources — from common iron to rare Dark Matter.',
  },
  {
    emoji: '🚀',
    title: 'Real-Time Travel',
    description: 'Jump between systems with real travel times and fuel costs. Plan your routes, haul cargo to hungry markets, and always watch your fuel gauge.',
  },
  {
    emoji: '📈',
    title: 'Dynamic Economy',
    description: "NPC market prices react to supply. Flood a market and watch prices drop. Find an underserved system and sell at a premium. Arbitrage is the meta.",
  },
  {
    emoji: '🌐',
    title: 'One Server = One System',
    description: 'Every Discord server that enrolls claims a real system in the shared galaxy. Join others or stake your own corner of the universe.',
  },
  {
    emoji: '🏭',
    title: 'Corporations (Coming Soon)',
    description: 'Form corps with other players, pool your treasury, and coordinate fleet operations across multiple systems.',
  },
  {
    emoji: '⚔️',
    title: 'Combat (Coming Soon)',
    description: 'PvP combat zones, corp wars, and system ownership with taxes and access control — the galaxy will eventually need defending.',
  },
];

function Feature({emoji, title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className={styles.featureEmoji}>{emoji}</div>
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
    </div>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="A Discord-native space MMO. Mine, trade, and conquer a galaxy of 100,000 star systems — all through slash commands.">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
