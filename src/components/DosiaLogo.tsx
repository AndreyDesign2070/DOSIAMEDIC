import React from 'react';

interface DosiaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function DosiaLogo({ className = '', size = 'md' }: DosiaLogoProps) {
  const sizeClasses = {
    sm: 'text-lg md:text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl md:text-5xl'
  };

  const svgSizes = {
    sm: 'w-4 h-4 mx-[1px]',
    md: 'w-5 h-5 mx-[1.5px]',
    lg: 'w-7 h-7 mx-[2px]',
    xl: 'w-9 h-9 mx-[2px] md:w-11 md:h-11'
  };

  return (
    <span className={`inline-flex items-center font-black font-display tracking-tight text-white select-none ${sizeClasses[size]} ${className}`}>
      <span>D</span>
      <span className="relative inline-flex items-center justify-center">
        <svg 
          className={svgSizes[size]} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Elegant outer letter 'O' circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="38" 
            stroke="currentColor" 
            strokeWidth="11" 
            className="text-white"
          />
          
          {/* The Asclepius Staff / Vara de Asclepio */}
          <line 
            x1="50" 
            y1="22" 
            x2="50" 
            y2="78" 
            stroke="#00F0FF" 
            strokeWidth="5" 
            strokeLinecap="round" 
            className="opacity-30"
          />
          
          {/* The Snake winding around the Staff */}
          <path 
            d="M 50 78 
               C 28 68, 28 58, 50 50 
               C 72 42, 72 32, 50 24
               C 42 20, 44 14, 52 14" 
            stroke="#00F0FF" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Snake head focus point */}
          <circle cx="52" cy="14" r="2" fill="#00F0FF" />
        </svg>
      </span>
      <span>SIA</span>
    </span>
  );
}
