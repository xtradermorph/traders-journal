'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Users, Search, UserPlus, UserMinus, UserCheck, UserX, Mail } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useToast } from "../../hooks/use-toast"
import {
  Friendship,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriends,
  getPendingIncomingRequests,
  blockUser,
  unblockUser
} from "../../lib/friendsUtils"
import { cn } from "../../lib/utils"

interface UserData {
  id: string
  username?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  email?: string
  profession?: string
  location?: string
  trader_status?: string
  trader_type?: string
  bio?: string
  years_experience?: string
  trading_frequency?: string
  markets?: string
  trading_goal?: string
  trading_challenges?: string
  is_online?: boolean
  last_active_at?: string
  medal_type?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | null
}

interface TradersDropdownProps {
  className?: string
}

export function TradersDropdown({ className }: TradersDropdownProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [tradersDropdownOpen, setTradersDropdownOpen] = useState(false)
  const [filteredTraders, setFilteredTraders] = useState<UserData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTraderTab, setActiveTraderTab] = useState('online')
  const [friendsList, setFriendsList] = useState<UserData[]>([])
  const [incomingRequests, setIncomingRequests] = useState<(Friendship & { sender_profile?: UserData })[]>([])
  const [friendshipStatuses, setFriendshipStatuses] = useState<Map<string, Friendship | null>>(new Map())
  const [activeTradersSubTab, setActiveTradersSubTab] = useState('myFriends')
  const [isFriendshipDataLoading, setIsFriendshipDataLoading] = useState(false)
  const tradersDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tradersDropdownRef.current && !tradersDropdownRef.current.contains(event.target as Node)) {
        setTradersDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTraderClick = (trader: UserData) => {
    router.push(`/profile/${trader.id}`)
    setTradersDropdownOpen(false)
  }

  const handleSendFriendRequest = async (traderId: string) => {
    try {
      const result = await sendFriendRequest(traderId)
      if (result.success) {
        toast({
          title: "Friend request sent",
          description: "Your friend request has been sent successfully.",
        })
        // Update friendship status
        setFriendshipStatuses(prev => new Map(prev.set(traderId, { 
          id: '', 
          user1_id: '', 
          user2_id: traderId, 
          status: 'PENDING' 
        })))
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send friend request.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      const result = await acceptFriendRequest(requestId)
      if (result.success) {
        toast({
          title: "Friend request accepted",
          description: "You are now friends!",
        })
        // Refresh incoming requests
        // This would need to be implemented based on your data structure
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to accept friend request.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      const result = await declineFriendRequest(requestId)
      if (result.success) {
        toast({
          title: "Friend request declined",
          description: "Friend request has been declined.",
        })
        // Refresh incoming requests
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to decline friend request.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFriend = async (traderId: string) => {
    try {
      const result = await removeFriend(traderId)
      if (result.success) {
        toast({
          title: "Friend removed",
          description: "Friend has been removed from your list.",
        })
        // Update friendship status
        setFriendshipStatuses(prev => new Map(prev.set(traderId, null)))
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove friend.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const renderTraderCard = (trader: UserData) => {
    const friendshipStatus = friendshipStatuses.get(trader.id)
    const isFriend = friendshipStatus?.status === 'ACCEPTED'
    const isPending = friendshipStatus?.status === 'PENDING'

    return (
      <div key={trader.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium">
              {trader.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{trader.username || 'Unknown User'}</p>
            <p className="text-xs text-muted-foreground truncate">
              {trader.profession || 'Trader'} • {trader.is_online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isFriend ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemoveFriend(trader.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <UserX className="h-4 w-4" />
            </Button>
          ) : isPending ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-muted-foreground"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendFriendRequest(trader.id)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTraderClick(trader)}
          >
            View
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)} ref={tradersDropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTradersDropdownOpen(!tradersDropdownOpen)}
        className="flex items-center space-x-2"
      >
        <Users className="h-4 w-4" />
        <span>Traders</span>
      </Button>

      {tradersDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-md shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search traders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            <Tabs value={activeTraderTab} onValueChange={setActiveTraderTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="online">Online</TabsTrigger>
                <TabsTrigger value="friends">Friends</TabsTrigger>
              </TabsList>

              <TabsContent value="online" className="mt-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredTraders.length > 0 ? (
                    filteredTraders.map(renderTraderCard)
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No traders found
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="friends" className="mt-4">
                <Tabs value={activeTradersSubTab} onValueChange={setActiveTradersSubTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="myFriends">My Friends</TabsTrigger>
                    <TabsTrigger value="requests">
                      Requests
                      {incomingRequests.length > 0 && (
                        <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
                          {incomingRequests.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="myFriends" className="mt-4">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {friendsList.length > 0 ? (
                        friendsList.map(renderTraderCard)
                      ) : (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          No friends yet
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="requests" className="mt-4">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {incomingRequests.length > 0 ? (
                        incomingRequests.map((request) => (
                          <div key={request.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {request.sender_profile?.username?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{request.sender_profile?.username || 'Unknown User'}</p>
                                <p className="text-xs text-muted-foreground">Wants to be friends</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptFriendRequest(request.id)}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeclineFriendRequest(request.id)}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          No pending requests
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}
