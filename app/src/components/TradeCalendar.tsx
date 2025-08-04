'use client'

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isAfter, isBefore } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Trade } from '@/types/trade';

interface TradeCalendarProps {
  trades: Trade[];
  isLoading: boolean;
  userRegistrationDate?: string; // Add user registration date
}

// Function to get performance data for a specific date
function getDayPerformance(date: Date, trades: Trade[] = []) {
  // Ensure trades is always an array
  const safeTrades = Array.isArray(trades) ? trades : [];

  const dayTrades = safeTrades.filter(trade => 
    trade && trade.date && isSameDay(new Date(trade.date), date)
  );

  if (dayTrades.length === 0) {
    return null;
  }

  const totalProfit = dayTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
  return {
    profit: totalProfit,
    count: dayTrades.length,
    trades: dayTrades
  };
}

const TradeCalendar = ({ trades, isLoading, userRegistrationDate }: TradeCalendarProps) => {
  const { toast } = useToast();



  const [calendarDays, setCalendarDays] = useState<Date[]>([]);

  // Calculate the earliest allowed date based on user's registration date
  const earliestAllowedDate = useMemo(() => {
    if (userRegistrationDate) {
      // Use user's registration date as the earliest allowed date
      const registrationDate = new Date(userRegistrationDate);
      return registrationDate;
    }
    
    // Fallback: if no registration date, use 1 year back from current date
    const fallbackDate = subMonths(new Date(), 12);
    return fallbackDate;
  }, [userRegistrationDate]);

  // Initialize current month to be within allowed range
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const registrationDate = userRegistrationDate ? new Date(userRegistrationDate) : subMonths(new Date(), 12);
    
    // If current date is before registration date, start at registration date
    if (isBefore(now, registrationDate)) {
      return new Date(registrationDate.getFullYear(), registrationDate.getMonth(), 1);
    }
    
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Reset to current month when component mounts or user returns
  useEffect(() => {
    const now = new Date();
    const registrationDate = userRegistrationDate ? new Date(userRegistrationDate) : subMonths(new Date(), 12);
    
    // Always try to show current month if it's within allowed range
    if (!isBefore(now, registrationDate)) {
      setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [userRegistrationDate]);

  // Calculate the latest allowed date (current month)
  const latestAllowedDate = useMemo(() => {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, []);

  // Generate available years for selection (only from registration date onwards)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const registrationYear = earliestAllowedDate.getFullYear();
    const years = [];
    
    // Only include years from registration year to current year
    for (let year = currentYear; year >= registrationYear; year--) {
      years.push(year);
    }
    
    return years;
  }, [earliestAllowedDate]);

  const availableMonths = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();
    const selectedYear = currentMonth.getFullYear();
    const registrationYear = earliestAllowedDate.getFullYear();
    const registrationMonth = earliestAllowedDate.getMonth();
    
    const months = [
      { value: '0', label: 'January' },
      { value: '1', label: 'February' },
      { value: '2', label: 'March' },
      { value: '3', label: 'April' },
      { value: '4', label: 'May' },
      { value: '5', label: 'June' },
      { value: '6', label: 'July' },
      { value: '7', label: 'August' },
      { value: '8', label: 'September' },
      { value: '9', label: 'October' },
      { value: '10', label: 'November' },
      { value: '11', label: 'December' }
    ];
    
    // Filter months based on year and registration date
    if (selectedYear === currentYear) {
      // Current year: show months from registration month up to current month
      const startMonth = Math.max(registrationMonth, 0);
      const endMonth = Math.min(currentMonthIndex, 11);
      return months.filter((_, index) => index >= startMonth && index <= endMonth);
    }
    
    if (selectedYear === registrationYear) {
      // Registration year: only show months from registration month onwards
      return months.filter((_, index) => index >= registrationMonth);
    }
    
    // Years between registration and current: show all months
    if (selectedYear > registrationYear && selectedYear < currentYear) {
      return months;
    }
    
    // Default: return empty array for invalid years
    return [];
  }, [currentMonth, earliestAllowedDate]);





  useEffect(() => {
    // Get all days in the current month
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    setCalendarDays(days);
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(prevDate => {
      const newDate = subMonths(prevDate, 1);
      const registrationYear = earliestAllowedDate.getFullYear();
      const registrationMonth = earliestAllowedDate.getMonth();
      
      // Don't allow going before the registration month
      if (newDate.getFullYear() === registrationYear) {
        if (newDate.getMonth() < registrationMonth) {
          return prevDate;
        }
      } else if (newDate.getFullYear() < registrationYear) {
        return prevDate;
      }
      
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prevDate => {
      const newDate = addMonths(prevDate, 1);
      // Don't allow going into the future
      if (isAfter(newDate, latestAllowedDate)) {
        return prevDate;
      }
      return newDate;
    });
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    const newDate = new Date(newYear, currentMonth.getMonth(), 1);
    
    // Validate the new date
    if (isBefore(newDate, earliestAllowedDate) || isAfter(newDate, latestAllowedDate)) {
      return;
    }
    
    setCurrentMonth(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month);
    const newDate = new Date(currentMonth.getFullYear(), newMonth, 1);
    
    // Validate the new date
    if (isBefore(newDate, earliestAllowedDate) || isAfter(newDate, latestAllowedDate)) {
      return;
    }
    
    setCurrentMonth(newDate);
  };



  // Navigation state - allow navigation to any month that contains or is after registration date
  const canGoBack = (() => {
    const prevMonth = subMonths(currentMonth, 1);
    const registrationYear = earliestAllowedDate.getFullYear();
    const registrationMonth = earliestAllowedDate.getMonth();
    
    // Allow if previous month is in the same year as registration and same or later month
    if (prevMonth.getFullYear() === registrationYear) {
      return prevMonth.getMonth() >= registrationMonth;
    }
    
    // Allow if previous month is after registration year
    return prevMonth.getFullYear() > registrationYear;
  })();
  


  const showDayTrades = (date: Date, performance: { profit: number, count: number, trades: Trade[] }) => {
    const formattedDate = format(date, 'MMM dd, yyyy');
  
    // Show toast with trade details
    toast({
      title: `Performance Summary - ${formattedDate}`,
      description: `Net P/L: ${performance.profit > 0 ? '+' : ''}${performance.profit.toFixed(2)} USD\n${performance.trades.map(trade => `${trade.currency_pair} (${trade.trade_type}): ${(trade.profit_loss || 0) > 0 ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)} USD`).join('\n')}`,
      variant: performance.profit >= 0 ? "default" : "destructive",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-base">Trading Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }



  return (
    <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-200">Trading Calendar</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {currentMonth.getFullYear()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Year and Month Selection */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Select 
              key={`year-${availableYears.join('-')}`}
              value={availableYears.includes(currentMonth.getFullYear()) 
                ? currentMonth.getFullYear().toString() 
                : availableYears.length > 0 ? availableYears[0].toString() : new Date().getFullYear().toString()
              } 
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              key={`month-${availableMonths.map(m => m.value).join('-')}`}
              value={availableMonths.some(m => parseInt(m.value) === currentMonth.getMonth()) 
                ? currentMonth.getMonth().toString() 
                : availableMonths.length > 0 ? availableMonths[0].value : '0'
              } 
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 sm:h-7 sm:w-7 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600" 
              onClick={prevMonth}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 sm:h-7 sm:w-7 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600" 
              onClick={nextMonth}
              disabled={isAfter(addMonths(currentMonth, 1), latestAllowedDate)}
            >
              <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'].map((day, index) => (
            <div key={`day-${index}`} className="text-center text-xs sm:text-xs font-bold text-gray-700 dark:text-gray-300 py-2 px-1 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
              {day}
            </div>
          ))}
        </div>
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              // Create proper calendar grid with leading empty cells
              const monthStart = startOfMonth(currentMonth);
              const startDayOfWeek = monthStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
              
              // Create array with leading empty cells
              const calendarGrid = [];
              
              // Add leading empty cells
              for (let i = 0; i < startDayOfWeek; i++) {
                calendarGrid.push(null);
              }
              
              // Add all days of the month
              calendarDays.forEach(day => {
                calendarGrid.push(day);
              });
              
              return calendarGrid.map((day, i) => {
                if (!day) {
                  // Empty cell
                  return (
                    <div key={`empty-${i}`} className="h-12 flex items-center justify-center">
                      <span className="text-transparent">-</span>
                    </div>
                  );
                }
                
                const dayPerformance = getDayPerformance(day, trades);
                const dayOfMonth = format(day, 'd');
                const isPositive = dayPerformance && dayPerformance.profit > 0;
                const hasTrades = dayPerformance !== null;
                
                // Check if this is today using isSameDay for accurate comparison
                const isToday = isSameDay(day, new Date());
                
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className={`
                          relative h-12 sm:h-12 flex items-center justify-center cursor-pointer rounded-lg transition-all duration-200
                          ${hasTrades 
                            ? isPositive 
                              ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 border-2 border-green-300 dark:border-green-600' 
                              : 'bg-gradient-to-br from-red-400 to-red-500 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 border-2 border-red-300 dark:border-red-600'
                            : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md active:scale-95'
                          }
                          ${!hasTrades ? 'hover:border-gray-300 dark:hover:border-gray-600' : ''}
                          ${isToday ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg scale-102' : ''}
                          touch-manipulation
                        `}
                        onClick={() => dayPerformance && showDayTrades(day, dayPerformance)}
                      >
                        <span className={`text-sm font-semibold ${hasTrades ? 'text-white' : isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          <span className={`${isToday ? 'bg-blue-200 dark:bg-blue-800 rounded-full px-2 py-1 shadow-inner' : ''}`}>
                            {dayOfMonth}
                          </span>
                        </span>
                        {hasTrades && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-2 sm:h-2 bg-white rounded-full border border-gray-300 flex items-center justify-center">
                            <span className="text-[8px] sm:text-[6px] font-bold text-gray-700">
                              {dayPerformance.count}
                            </span>
                          </div>
                        )}
                        {isToday && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {hasTrades && (
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="text-center">
                          <div className="font-semibold">{format(day, 'MMM dd, yyyy')}</div>
                          <div className="text-sm">
                            {dayPerformance.count} trade{dayPerformance.count !== 1 ? 's' : ''}
                          </div>
                          <div className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {dayPerformance.profit > 0 ? '+' : ''}{dayPerformance.profit.toFixed(2)} USD
                          </div>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              });
            })()}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default TradeCalendar;