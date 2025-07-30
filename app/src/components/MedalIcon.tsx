"use client"

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MedalType } from '@/lib/medal-utils';

interface MedalIconProps {
  medalType: MedalType;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const medalColors = {
  bronze: {
    outer: '#CD7F32',
    inner: '#E8AA76',
    shadow: '#8B5A2B'
  },
  silver: {
    outer: '#C0C0C0',
    inner: '#E6E6E6',
    shadow: '#A8A8A8'
  },
  gold: {
    outer: '#FFD700',
    inner: '#FFEB7F',
    shadow: '#B8860B'
  },
  platinum: {
    outer: '#E5E4E2',
    inner: '#FFFFFF',
    shadow: '#A9A9A9'
  },
  diamond: {
    outer: '#B9F2FF',
    inner: '#FFFFFF',
    shadow: '#89CFF0'
  }
};

const medalTitles = {
  bronze: 'Bronze Medal (60-69% positive trades)',
  silver: 'Silver Medal (70-79% positive trades)',
  gold: 'Gold Medal (80-85% positive trades)',
  platinum: 'Platinum Medal (86-90% positive trades)',
  diamond: 'Diamond Medal (91-100% positive trades)'
};

export const MedalIcon: React.FC<MedalIconProps> = ({ 
  medalType, 
  size = 'md', 
  showTooltip = true 
}) => {
  if (!medalType) return null;

  const colors = medalColors[medalType];
  
  // Size mapping
  const sizeMap = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 40, height: 40 }
  };
  
  const { width, height } = sizeMap[size];
  
  const medalSvg = (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="transition-all hover:scale-110"
    >
      {/* Medal ribbon */}
      <path 
        d="M7 15L4.5 21.5H8L9.5 17.5M17 15L19.5 21.5H16L14.5 17.5" 
        stroke={colors.outer} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill={colors.shadow}
      />
      
      {/* Medal circle */}
      <circle 
        cx="12" 
        cy="9" 
        r="7" 
        fill={colors.inner} 
        stroke={colors.outer} 
        strokeWidth="1.5" 
      />
      
      {/* Medal shine effect */}
      <path 
        d="M9 6.5C9.5 5.5 10.5 5 12 5C13.5 5 14.5 5.5 15 6.5" 
        stroke={colors.outer} 
        strokeWidth="0.75" 
        strokeLinecap="round" 
      />
      
      {/* Medal star */}
      <path 
        d="M12 7L12.4 8.4L13.9 8.5L12.9 9.6L13.2 11L12 10.3L10.8 11L11.1 9.6L10.1 8.5L11.6 8.4L12 7Z" 
        fill={colors.outer} 
      />
    </svg>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {medalSvg}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{medalTitles[medalType]}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return medalSvg;
};

export default MedalIcon;
