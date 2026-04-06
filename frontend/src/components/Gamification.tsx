import { Card } from './ui/Card';

type Level = 'Beginner' | 'Active' | 'Ambassador';

const LEVELS: Record<Level, { minEarnings: number; color: string }> = {
  Beginner: { minEarnings: 0, color: '#94a3b8' },
  Active: { minEarnings: 1000, color: '#0ea5e9' },
  Ambassador: { minEarnings: 10000, color: '#8b5cf6' },
};

type Props = {
  totalEarnings: number;
};

export function Gamification({ totalEarnings }: Props) {
  // Determine level
  let currentLevel: Level = 'Beginner';
  let nextLevel: Level | null = 'Active';
  
  if (totalEarnings >= LEVELS.Ambassador.minEarnings) {
    currentLevel = 'Ambassador';
    nextLevel = null;
  } else if (totalEarnings >= LEVELS.Active.minEarnings) {
    currentLevel = 'Active';
    nextLevel = 'Ambassador';
  }

  const nextGoal = nextLevel ? LEVELS[nextLevel].minEarnings : totalEarnings;
  // Simple linear progress calculation from 0 to next goal for simplicity in this MVP
  // Or relative to current level band:
  const prevGoal = LEVELS[currentLevel].minEarnings;
  const progress = nextLevel 
    ? Math.min(100, Math.max(0, ((totalEarnings - prevGoal) / (nextGoal - prevGoal)) * 100))
    : 100;

  return (
    <Card>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="title-sm" style={{ marginBottom: 4 }}>Current Level</div>
          <div className="title-lg" style={{ color: LEVELS[currentLevel].color }}>{currentLevel} Reseller</div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div className="title-sm">Badges</div>
           <div className="row" style={{ marginTop: 4, fontSize: 24 }}>
             {totalEarnings > 0 ? <span title="First Sale">🥇</span> : <span style={{ opacity: 0.2 }}>🥇</span>}
             {totalEarnings > 1000 ? <span title="High Earner">🚀</span> : <span style={{ opacity: 0.2 }}>🚀</span>}
             {totalEarnings > 5000 ? <span title="Top Performer">💎</span> : <span style={{ opacity: 0.2 }}>💎</span>}
           </div>
        </div>
      </div>
      
      {nextLevel && (
        <div style={{ marginTop: 16 }}>
          <div className="row-between" style={{ fontSize: 12, marginBottom: 4, color: 'var(--muted)' }}>
            <span>Progress to {nextLevel}</span>
            <span>{Math.floor(progress)}%</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, background: LEVELS[currentLevel].color, height: '100%', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--muted)' }}>
            Earn €{(nextGoal - totalEarnings).toLocaleString()} more to level up!
          </div>
        </div>
      )}
    </Card>
  );
}
