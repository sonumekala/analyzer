import React from 'react';

/**
 * Neo4j-style background visualization component.
 * This creates a dark grid-like background with a subtle networking pattern
 * similar to what you'd see in Neo4j's browser visualization.
 */
export default function Neo4jBackground() {
  return (
    <div 
      className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" 
      style={{ 
        background: 'radial-gradient(circle, transparent 20%, #050c2e 80%), linear-gradient(45deg, transparent 49%, rgba(70, 90, 140, 0.15) 50%, transparent 51%), linear-gradient(135deg, transparent 49%, rgba(70, 90, 140, 0.15) 50%, transparent 51%)',
        backgroundSize: '40px 40px, 40px 40px, 40px 40px',
        backgroundPosition: '0 0, 0 0, 0 0',
        zIndex: -1 
      }}
    />
  );
}