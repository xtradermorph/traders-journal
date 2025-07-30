"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarProps = {
  selected?: Date
  onSelect?: (date: Date) => void
  disabled?: (date: Date) => boolean
  userRegistrationDate?: Date
  className?: string
}

function Calendar({
  selected,
  onSelect,
  disabled,
  userRegistrationDate,
  className
}: CalendarProps) {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const currentDay = today.getDate()

  // Use user registration date or default to 2020
  const earliestDate = userRegistrationDate || new Date(2020, 0, 1)
  const earliestYear = earliestDate.getFullYear()
  const earliestMonth = earliestDate.getMonth()

  const [currentViewMonth, setCurrentViewMonth] = React.useState<Date>(() => {
    const initialDate = selected || today
    // Ensure we don't start with a future month
    if (initialDate > today) {
      return new Date(currentYear, currentMonth, 1)
    }
    // Ensure we don't start before registration
    if (initialDate < earliestDate) {
      return new Date(earliestYear, earliestMonth, 1)
    }
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  })

  // Generate years (from user registration year to current year)
  const years = React.useMemo(() => {
    const yearArray = []
    for (let year = earliestYear; year <= currentYear; year++) {
      yearArray.push(year)
    }
    return yearArray
  }, [earliestYear, currentYear])

  // Generate months
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Check if we can navigate to previous month
  const canGoPrevious = React.useMemo(() => {
    const prevMonth = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() - 1, 1)
    return prevMonth >= new Date(earliestYear, earliestMonth, 1)
  }, [currentViewMonth, earliestYear, earliestMonth])

  // Check if we can navigate to next month
  const canGoNext = React.useMemo(() => {
    const nextMonth = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 1)
    return nextMonth <= new Date(currentYear, currentMonth, 1)
  }, [currentViewMonth, currentYear, currentMonth])

  // Debug logging
  console.log('Calendar debug:', {
    earliestDate: earliestDate.toISOString(),
    earliestYear,
    earliestMonth,
    currentViewMonth: currentViewMonth.toISOString(),
    canGoPrevious,
    canGoNext
  })

  const handleMonthChange = (monthIndex: number) => {
    const newDate = new Date(currentViewMonth.getFullYear(), monthIndex, 1)
    const currentDate = new Date(currentYear, currentMonth, 1)
    
    // Allow navigation to any month within the valid range
    if (newDate <= currentDate) {
      // If we're in the registration year, only allow months >= registration month
      if (newDate.getFullYear() === earliestYear && monthIndex < earliestMonth) {
        return
      }
      setCurrentViewMonth(newDate)
    }
  }

  const handleYearChange = (year: number) => {
    const newDate = new Date(year, currentViewMonth.getMonth(), 1)
    const currentDate = new Date(currentYear, currentMonth, 1)
    
    // Allow navigation to any year within the valid range
    if (year >= earliestYear && year <= currentYear) {
      // If we're selecting the registration year, ensure month is >= registration month
      if (year === earliestYear && currentViewMonth.getMonth() < earliestMonth) {
        setCurrentViewMonth(new Date(year, earliestMonth, 1))
      } else {
        setCurrentViewMonth(newDate)
      }
    }
  }

  const handlePreviousMonth = () => {
    if (canGoPrevious) {
      setCurrentViewMonth(new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() - 1, 1))
    }
  }

  const handleNextMonth = () => {
    if (canGoNext) {
      setCurrentViewMonth(new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 1))
    }
  }

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const year = currentViewMonth.getFullYear()
    const month = currentViewMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday

    const days = []
    const currentDate = new Date(startDate)

    // Generate 6 weeks of days (42 days total)
    for (let i = 0; i < 42; i++) {
      const dayDate = new Date(currentDate)
      days.push(dayDate)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }, [currentViewMonth])

  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    return selected && date.getDate() === selected.getDate() &&
           date.getMonth() === selected.getMonth() &&
           date.getFullYear() === selected.getFullYear()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentViewMonth.getMonth() &&
           date.getFullYear() === currentViewMonth.getFullYear()
  }

  const isDisabled = (date: Date) => {
    // Future date
    if (date > today) return true
    // Before registration
    if (date < earliestDate) return true
    // Custom disabled function
    if (disabled && disabled(date)) return true
    return false
  }

  const handleDayClick = (date: Date) => {
    if (!isDisabled(date)) {
      onSelect?.(date)
    }
  }

  return (
    <div className={cn("bg-background border border-border rounded-md p-4", className)}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousMonth}
          disabled={!canGoPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Select
            value={currentViewMonth.getMonth().toString()}
            onValueChange={(value) => handleMonthChange(parseInt(value))}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => {
                const isFutureMonth = currentViewMonth.getFullYear() === currentYear && index > currentMonth
                const isBeforeRegistration = currentViewMonth.getFullYear() === earliestYear && index < earliestMonth
                const isDisabled = isFutureMonth || isBeforeRegistration
                return (
                  <SelectItem 
                    key={month} 
                    value={index.toString()}
                    disabled={isDisabled}
                    className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {month}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select
            value={currentViewMonth.getFullYear().toString()}
            onValueChange={(value) => handleYearChange(parseInt(value))}
          >
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => {
                const isFutureYear = year > currentYear
                const isBeforeRegistration = year < earliestYear
                const isDisabled = isFutureYear || isBeforeRegistration
                return (
                  <SelectItem 
                    key={year} 
                    value={year.toString()}
                    disabled={isDisabled}
                  >
                    {year}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((date, index) => {
          const dayDisabled = isDisabled(date)
          const daySelected = isSelected(date)
          const dayToday = isToday(date)
          const dayCurrentMonth = isCurrentMonth(date)

          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => handleDayClick(date)}
              disabled={dayDisabled}
              className={cn(
                "h-8 w-8 p-0 text-xs",
                !dayCurrentMonth && "text-muted-foreground opacity-50",
                dayToday && "bg-accent text-accent-foreground font-bold",
                daySelected && "bg-primary text-primary-foreground hover:bg-primary",
                dayDisabled && "opacity-50 cursor-not-allowed",
                !dayDisabled && "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {date.getDate()}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }