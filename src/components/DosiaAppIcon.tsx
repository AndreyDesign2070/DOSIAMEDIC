import React from 'react';

interface DosiaAppIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function DosiaAppIcon({ className = '', size = 'md' }: DosiaAppIconProps) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-28 h-28'
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${sizes[size]} ${className}`}>
      {/* Outer subtle glow container */}
      <div className="absolute inset-0 bg-brand-teal/5 rounded-2xl border border-brand-teal/20 backdrop-blur-sm shadow-inner" />
      
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-4/5 h-4/5 relative z-10"
      >
        {/* Elegant Letter 'D' styled in display sans-serif */}
        <text
          x="18"
          y="76"
          fill="#FFFFFF"
          fontSize="72"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.05em"
        >
          D
        </text>

        {/* The Snake coiling around the D (only the snake, no staff!) */}
        <path
          d="M 52 82 
             C 30 71, 30 60, 52 52 
             C 74 44, 74 33, 52 24
             C 44 20, 46 13, 54 13"
          stroke="#00F0FF"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
        />
        
        {/* Snake eye detail */}
        <circle cx="53" cy="12" r="1.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
