'use client';

import React from 'react';
import Image from 'next/image';

interface DrashtiLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const DrashtiLogo: React.FC<DrashtiLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
}) => {
  const sizeMap = {
    sm: { h: 32, w: 100, iconSize: 32 },
    md: { h: 44, w: 140, iconSize: 42 },
    lg: { h: 56, w: 180, iconSize: 52 },
    xl: { h: 72, w: 230, iconSize: 68 },
  };

  if (variant === 'icon') {
    return (
      <div className={`relative flex items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-slate-100 ${className}`}>
        <img
          src="/drashti-optic-logo.png"
          alt="Drashti Optic"
          className="w-auto object-contain rounded"
          style={{ height: sizeMap[size].iconSize, width: sizeMap[size].iconSize }}
        />
      </div>
    );
  }

  const logoSrc = '/drashti-optic-logo.png';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src={logoSrc}
        alt="Drashti Optic"
        className="w-auto object-contain"
        style={{ height: sizeMap[size].h }}
      />
    </div>
  );
};

export default DrashtiLogo;
