'use client'

import React, { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { User, Settings, LifeBuoy, LogOut } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useUserProfile } from "../UserProfileContext"
import { useAuth } from "../../hooks/useAuth"
import { useTheme } from 'next-themes'
import MedalIcon from '../MedalIcon'
import { MedalType } from '../../types/user'
import { cn } from "../../lib/utils"

interface UserProfileSectionProps {
  medalType: MedalType | null
  isOnline: boolean
  className?: string
}

export function UserProfileSection({ 
  medalType, 
  isOnline, 
  className 
}: UserProfileSectionProps) {
  const { profile: currentUser } = useUserProfile()
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { theme } = useTheme()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    try {
      // Add logout logic here
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleProfileClick = () => {
    router.push('/profile')
    setUserMenuOpen(false)
  }

  const handleSettingsClick = () => {
    router.push('/settings')
    setUserMenuOpen(false)
  }

  const handleSupportClick = () => {
    router.push('/support')
    setUserMenuOpen(false)
  }

  return (
    <div className={cn("relative group", className)} ref={userMenuRef}>
      <div className="flex items-center space-x-1">
        {medalType && (
          <div className="relative h-12 w-12 flex items-center justify-center">
            <MedalIcon medalType={medalType} size="md" />
          </div>
        )}
        <Button 
          variant="ghost" 
          className="relative h-14 w-14 rounded-full p-0 ml-4 mr-2 overflow-visible"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
        >
          <div className="relative h-14 w-14">
            <Avatar className="h-14 w-14 relative z-10 ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg">
              <AvatarImage 
                src={currentUser?.avatar_url || undefined} 
                alt={currentUser?.username || 'User avatar'} 
                className="object-cover object-center" 
              />
              <AvatarFallback>
                {getInitials(currentUser?.username ?? undefined)}
              </AvatarFallback>
            </Avatar>
            <div 
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-background z-20"
              style={{ backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </div>
        </Button>
      </div>
      
      {/* Hover Menu - Desktop */}
      <div className="absolute right-0 top-full mt-2 w-60 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 md:block hidden">
        <div className="p-3 bg-card border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser?.avatar_url || undefined} alt={currentUser?.username || 'User'} />
              <AvatarFallback>{getInitials(currentUser?.username ?? undefined)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.username || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser?.email || 'No email'}</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleProfileClick}
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleSettingsClick}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleSupportClick}
          >
            <LifeBuoy className="mr-2 h-4 w-4" />
            Support
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {userMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-popover border border-border rounded-md shadow-lg z-50 md:hidden">
          <div className="p-3 bg-card border-b">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser?.avatar_url || undefined} alt={currentUser?.username || 'User'} />
                <AvatarFallback>{getInitials(currentUser?.username ?? undefined)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser?.username || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email || 'No email'}</p>
              </div>
            </div>
          </div>
          
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleProfileClick}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleSettingsClick}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleSupportClick}
            >
              <LifeBuoy className="mr-2 h-4 w-4" />
              Support
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
