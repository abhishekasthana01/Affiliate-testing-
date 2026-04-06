import logoBeam from '../assets/logo_beam.png';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | number;

type Props = {
  size?: LogoSize;
  withText?: boolean;
  className?: string;
};

const SIZES = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export function BeamLogo({ size = 'md', withText = false, className = '' }: Props) {
  const height = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  const fontSize = Math.max(14, Math.round(height * 0.6)); // Scale text with logo

  return (
    <div className={`row ${className}`} style={{ alignItems: 'center', gap: height * 0.3 }}>
      <img
        src={logoBeam}
        alt="Beam logo"
        style={{ display: 'block', objectFit: 'contain', width: 'auto', height }}
      />
      {withText && (
        <span 
          style={{ 
            fontStyle: 'italic', 
            fontWeight: 800, 
            fontSize, 
            letterSpacing: '-0.02em', 
            color: 'var(--charcoal)',
            lineHeight: 1
          }}
        >
          beam
        </span>
      )}
    </div>
  );
}
