'use client';

import React from 'react';
import Image from 'next/image';

interface BeamLogoProps {
  /** Size variant for the logo */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the "beam" wordmark alongside the icon */
  showWordmark?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeMap = {
  xs: { icon: 24, wordmarkHeight: 16 },
  sm: { icon: 32, wordmarkHeight: 20 },
  md: { icon: 40, wordmarkHeight: 26 },
  lg: { icon: 56, wordmarkHeight: 36 },
  xl: { icon: 72, wordmarkHeight: 46 },
};

/**
 * Official Beam logo component.
 * Uses the beamlogo.png which contains both the circular pink "B" icon
 * and the "beam" wordmark.
 */
export function BeamLogo({ size = 'md', showWordmark = true, className = '' }: BeamLogoProps) {
  const dims = sizeMap[size];

  if (showWordmark) {
    // Show the full logo (icon + wordmark)
    // The aspect ratio of the full logo image is roughly 3.2:1
    const fullWidth = Math.round(dims.icon * 3.2);
    return (
      <Image
        src="/images/beamlogo.png"
        alt="Beam"
        width={fullWidth}
        height={dims.icon}
        className={`object-contain ${className}`}
        priority
      />
    );
  }

  // Icon-only mode: show just the circular pink "B" portion
  // We use the full image but constrain it to a square and crop via CSS
  return (
    <div
      className={`relative overflow-hidden rounded-full flex-shrink-0 ${className}`}
      style={{ width: dims.icon, height: dims.icon }}
    >
      <Image
        src="/images/beamlogo.png"
        alt="Beam"
        width={dims.icon * 3.2}
        height={dims.icon}
        className="object-cover object-left"
        style={{ width: dims.icon * 3.2, height: dims.icon }}
        priority
      />
    </div>
  );
}

export default BeamLogo;
