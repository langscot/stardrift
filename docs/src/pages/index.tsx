import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

import styles from './index.module.css';

type SpecItem = {
  code: string;
  title: string;
  description: string;
  status: 'LIVE' | 'PLANNED';
};

const specs: SpecItem[] = [
  {
    code: 'SYS::MINE',
    title: 'Resource Extraction',
    description: 'Drill ore from planets and asteroid belts across 100,000+ star systems. Different worlds yield different resources — from common iron to rare Dark Matter.',
    status: 'LIVE',
  },
  {
    code: 'SYS::NAV',
    title: 'Real-Time Navigation',
    description: 'Jump between systems with real travel times and fuel costs. Plan your routes, haul cargo to hungry markets, and always watch your fuel gauge.',
    status: 'LIVE',
  },
  {
    code: 'SYS::ECON',
    title: 'Dynamic Economy',
    description: 'NPC market prices react to supply. Flood a market and watch prices drop. Find an underserved system and sell at a premium.',
    status: 'LIVE',
  },
  {
    code: 'SYS::NET',
    title: 'Server = System',
    description: 'Every Discord server that enrolls claims a real system in the shared galaxy. Your community owns a piece of the universe.',
    status: 'LIVE',
  },
  {
    code: 'SYS::CORP',
    title: 'Corporations',
    description: 'Form corps with other players, pool your treasury, and coordinate fleet operations across multiple star systems.',
    status: 'PLANNED',
  },
  {
    code: 'SYS::WAR',
    title: 'Combat & Warfare',
    description: 'PvP combat zones, corporate wars, and system governance. The galaxy will need defending.',
    status: 'PLANNED',
  },
];

function SpecCard({code, title, description, status}: SpecItem) {
  return (
    <div className={styles.specCard}>
      <div className={styles.specHeader}>
        <span className={styles.specCode}>{code}</span>
        <span className={`${styles.specStatus} ${status === 'LIVE' ? styles.statusLive : styles.statusPlanned}`}>
          {status}
        </span>
      </div>
      <h3 className={styles.specTitle}>{title}</h3>
      <p className={styles.specDesc}>{description}</p>
    </div>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Stardrift"
      description="A Discord-native space MMO. Mine, trade, and conquer a galaxy of 100,000 star systems.">

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>DISCORD-NATIVE SPACE MMO</div>
          <h1 className={styles.heroTitle}>STARDRIFT</h1>
          <div className={styles.heroLine} />
          <p className={styles.heroTagline}>
            Mine. Trade. Conquer. A persistent galaxy of 100,000 star systems — played entirely through Discord.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.btnPrimary} to="/getting-started">
              START HERE
            </Link>
            <Link className={styles.btnOutline} to="/commands">
              COMMANDS REF
            </Link>
            <Link className={styles.btnOutline} to="/roadmap">
              ROADMAP
            </Link>
          </div>
        </div>
      </header>

      {/* Specs */}
      <main>
        <section className={styles.specsSection}>
          <div className={styles.specsSectionHeader}>
            <span className={styles.specsSectionCode}>// SYSTEM SPECIFICATIONS</span>
          </div>
          <div className={styles.specsGrid}>
            {specs.map((spec, idx) => (
              <SpecCard key={idx} {...spec} />
            ))}
          </div>
        </section>

        {/* Stats bar */}
        <section className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statValue}>100,000+</span>
            <span className={styles.statLabel}>STAR SYSTEMS</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>10</span>
            <span className={styles.statLabel}>RESOURCE TYPES</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>5</span>
            <span className={styles.statLabel}>STAR CLASSES</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>7</span>
            <span className={styles.statLabel}>PLANET TYPES</span>
          </div>
        </section>
      </main>
    </Layout>
  );
}
