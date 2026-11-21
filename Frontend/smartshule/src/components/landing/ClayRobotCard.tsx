import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/* ------------------------------------------------------------------
 *  ClayRobotCard – simplified placeholder animation
 *  The original Originkit animation is large; for now we provide a
 *  lightweight placeholder that respects the maroon branding.
 * ------------------------------------------------------------------ */

export interface ClayRobotProps {
  /** Optional container height (e.g., "300px" or "h-64") */
  height?: string;
  /** Additional inline styles */
  style?: CSSProperties;
}

/** Simple placeholder component – replace with the full Originkit code if desired */
export default function ClayRobotCard({ height = '300px', style }: ClayRobotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Placeholder effect – in a real implementation you would initialise the WebGL canvas here.
  useEffect(() => {
    if (!containerRef.current) setFailed(true);
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Clay robot animation placeholder"
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: '#80000010',
        border: '2px dashed #800000',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Placeholder content */}
      <div className="absolute inset-0 flex items-center justify-center text-[#800000] font-bold">
        Clay Robot Animation
      </div>
    </div>
  );
}
