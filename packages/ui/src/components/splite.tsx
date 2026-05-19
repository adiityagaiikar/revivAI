'use client'

import React, { useEffect, useRef } from "react";

type SplineSceneProps = {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Load Spline viewer web component
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
    script.onload = () => {
      // Create the spline-viewer element after script loads
      const viewer = document.createElement('spline-viewer') as any;
      viewer.setAttribute('url', scene);
      viewer.style.width = '100%';
      viewer.style.height = '100%';
      viewer.style.background = 'transparent';
      container.appendChild(viewer);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      const viewer = container.querySelector('spline-viewer');
      if (viewer) container.removeChild(viewer);
    };
  }, [scene]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  );
}
