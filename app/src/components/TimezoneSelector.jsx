"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Search, Globe, ChevronDown, Clock } from 'lucide-react';
import timezoneData from '../../settings/timezones-full';

export default function TimezoneSelector({ value, onValueChange, placeholder = "Select timezone" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Get local timezone
  const localTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return 'UTC';
    }
  }, []);

  // Find local timezone in our data
  const localTimezoneData = useMemo(() => {
    return timezoneData.find(tz => 
      tz.utc && tz.utc.some(utc => utc === localTimezone)
    ) || timezoneData.find(tz => tz.value === 'UTC');
  }, [localTimezone]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset selected index when search term changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm]);

  // Filter timezones based on search term
  const filteredTimezones = useMemo(() => {
    if (!searchTerm.trim()) {
      return timezoneData;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return timezoneData.filter(tz => 
      tz.text.toLowerCase().includes(searchLower) ||
      tz.value.toLowerCase().includes(searchLower) ||
      (tz.abbr && tz.abbr.toLowerCase().includes(searchLower)) ||
      (tz.utc && tz.utc.some(utc => utc.toLowerCase().includes(searchLower)))
    );
  }, [searchTerm]);

  // Get current timezone display text
  const getCurrentTimezoneText = () => {
    const currentTz = timezoneData.find(tz => tz.value === value);
    return currentTz ? currentTz.text : placeholder;
  };

  // Get current time in a timezone
  const getCurrentTimeInTimezone = (tzValue) => {
    try {
      const tz = timezoneData.find(t => t.value === tzValue);
      if (!tz || !tz.utc || !tz.utc[0]) return '';
      
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        timeZone: tz.utc[0],
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return timeString;
    } catch (error) {
      return '';
    }
  };

  // Handle timezone selection
  const handleTimezoneSelect = (tzValue) => {
    console.log('Selecting timezone:', tzValue); // Debug log
    onValueChange(tzValue);
    setIsOpen(false);
    setSearchTerm('');
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      setSelectedIndex(-1);
      return;
    }

    if (!isOpen) return;

    const hasLocalTimezone = localTimezoneData && !searchTerm.trim();
    const totalItems = hasLocalTimezone ? filteredTimezones.length + 1 : filteredTimezones.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const newIndex = prev < totalItems - 1 ? prev + 1 : 0;
        scrollToSelected(newIndex);
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const newIndex = prev > 0 ? prev - 1 : totalItems - 1;
        scrollToSelected(newIndex);
        return newIndex;
      });
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (hasLocalTimezone && selectedIndex === 0) {
        handleLocalTimezoneSelect();
      } else {
        const tzIndex = hasLocalTimezone ? selectedIndex - 1 : selectedIndex;
        if (filteredTimezones[tzIndex]) {
          handleTimezoneSelect(filteredTimezones[tzIndex].value);
        }
      }
    }
  };

  // Scroll to selected item
  const scrollToSelected = (index) => {
    if (!scrollAreaRef.current) return;
    
    const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return;

    const items = scrollArea.querySelectorAll('button');
    const targetItem = items[index];
    
    if (targetItem) {
      targetItem.scrollIntoView({ 
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  };

  // Handle local timezone selection
  const handleLocalTimezoneSelect = () => {
    if (localTimezoneData) {
      handleTimezoneSelect(localTimezoneData.value);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Label className="text-sm font-medium mb-2 block text-foreground">Timezone</Label>
      
      {/* Main selector button */}
      <Button
        variant="outline"
        className="w-full justify-between text-left font-normal bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">{getCurrentTimezoneText()}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
          {/* Search input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search timezones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 bg-background text-foreground border-border"
              />
            </div>
          </div>

          {/* Local timezone option */}
          {localTimezoneData && !searchTerm.trim() && (
            <div className="p-2 border-b border-border">
              <Button
                variant="ghost"
                className={`w-full justify-start text-sm ${
                  selectedIndex === 0 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-accent/50 hover:bg-accent'
                }`}
                onClick={handleLocalTimezoneSelect}
              >
                <div className="flex items-center gap-2 w-full">
                  <Clock className="h-4 w-4 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{localTimezoneData.text}</div>
                    <div className="text-xs text-muted-foreground">
                      Local time: {getCurrentTimeInTimezone(localTimezoneData.value)}
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          )}

          {/* Timezone list */}
          <div className="h-80 overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="h-full">
              <div className="p-1">
                {filteredTimezones.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No timezones found matching "{searchTerm}"
                  </div>
                ) : (
                  filteredTimezones.map((tz, index) => {
                    const adjustedIndex = localTimezoneData && !searchTerm.trim() ? index + 1 : index;
                    return (
                      <Button
                        key={tz.value}
                        variant="ghost"
                        className={`w-full justify-start text-sm ${
                          value === tz.value 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : selectedIndex === adjustedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                        onClick={() => handleTimezoneSelect(tz.value)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Globe className="h-4 w-4" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{tz.text}</div>
                            <div className="text-xs text-muted-foreground">
                              Current time: {getCurrentTimeInTimezone(tz.value)}
                              {tz.isdst && ' (DST)'}
                            </div>
                          </div>
                        </div>
                      </Button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

