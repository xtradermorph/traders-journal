import { MedalType } from '@/lib/medal-utils'
import { cn } from '@/lib/utils'

interface MedalIconProps {
  medalType: MedalType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
}

const medalColors = {
  bronze: 'text-amber-600',
  silver: 'text-gray-400',
  gold: 'text-yellow-400',
  platinum: 'text-blue-400',
  diamond: 'text-purple-400'
}

export function MedalIcon({ medalType, size = 'md', className }: MedalIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        sizeClasses[size],
        medalColors[medalType],
        className
      )}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  )
} 