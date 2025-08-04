'use client';

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Download, Calendar as CalendarIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, startOfDay } from 'date-fns';
import { Trade } from '@/types/trade';

interface ExportTradesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onExport: (trades: Trade[], fileName: string) => Promise<void>;
}

type ExportTimeFrame = 'week' | 'month' | 'custom' | 'all';



export default function ExportTradesDialog({ isOpen, onClose, trades, onExport }: ExportTradesDialogProps) {
  const [timeFrame, setTimeFrame] = useState<ExportTimeFrame>('month');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate date restrictions
  const today = startOfDay(new Date());
  const earliestTradeDate = React.useMemo(() => {
    if (!trades || !Array.isArray(trades) || trades.length === 0) return today;
    const dates = trades.map(trade => new Date(trade.date));
    return startOfDay(new Date(Math.min(...dates.map(d => d.getTime()))));
  }, [trades, today]);

  // Get user registration date (use earliest trade date as proxy, or default to 2020)
  const userRegistrationDate = React.useMemo(() => {
    return earliestTradeDate || new Date(2020, 0, 1);
  }, [earliestTradeDate]);

  // Get available months from trades
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    if (!trades || !Array.isArray(trades)) return Array.from(months).sort().reverse();
    trades.forEach(trade => {
      const month = format(new Date(trade.date), 'yyyy-MM');
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [trades]);

  // Calculate filtered trades based on selected time frame
  const filteredTrades = React.useMemo(() => {
    if (!trades || !Array.isArray(trades) || trades.length === 0) return [];

    switch (timeFrame) {
      case 'week':
        if (!startDate) return [];
        const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 }); // Sunday
        return trades.filter(trade => {
          const tradeDate = new Date(trade.date);
          return isWithinInterval(tradeDate, { start: weekStart, end: weekEnd });
        });

      case 'month':
        if (!selectedMonth) return [];
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        return trades.filter(trade => {
          const tradeDate = new Date(trade.date);
          return isWithinInterval(tradeDate, { start: monthStart, end: monthEnd });
        });

      case 'custom':
        if (!startDate || !endDate) return [];
        const customStart = startOfDay(startDate);
        const customEnd = startOfDay(endDate);
        return trades.filter(trade => {
          const tradeDate = new Date(trade.date);
          return isWithinInterval(tradeDate, { start: customStart, end: customEnd });
        });

      case 'all':
        return trades;

      default:
        return [];
    }
  }, [trades, timeFrame, startDate, endDate, selectedMonth]);

  // Generate file name
  const generateFileName = useCallback(() => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    
    switch (timeFrame) {
      case 'week':
        return startDate ? `trades_week_${format(startDate, 'yyyy-MM-dd')}_${timestamp}.xlsx` : `trades_week_${timestamp}.xlsx`;
      case 'month':
        return `trades_month_${selectedMonth}_${timestamp}.xlsx`;
      case 'custom':
        return startDate && endDate ? `trades_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}_${timestamp}.xlsx` : `trades_custom_${timestamp}.xlsx`;
      case 'all':
        return `trades_all_${timestamp}.xlsx`;
      default:
        return `trades_${timestamp}.xlsx`;
    }
  }, [timeFrame, startDate, endDate, selectedMonth]);

  // Handle export
  const handleExport = async () => {
    if (filteredTrades.length === 0) {
      setError('No trades found for the selected time frame. Please select a different time period.');
      return;
    }

    // Validate date range for custom selection
    if (timeFrame === 'custom') {
      if (!startDate || !endDate) {
        setError('Please select both start and end dates.');
        return;
      }
      
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        setError('Please select a minimum of 7 days for custom date range.');
        return;
      }
    }

    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const fileName = generateFileName();
      await onExport(filteredTrades, fileName);
      setSuccess(`Successfully exported ${filteredTrades.length} trades to ${fileName}`);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export trades. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setTimeFrame('month');
      setStartDate(new Date());
      setEndDate(new Date());
      setSelectedMonth(format(new Date(), 'yyyy-MM'));
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Custom calendar wrapper component
  const CustomCalendar = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Calendar>>(
    ({ className, disabled, userRegistrationDate, ...props }, ref) => (
      <div ref={ref}>
        <Calendar 
          className={className}
          disabled={disabled}
          userRegistrationDate={userRegistrationDate}
          {...props}
        />
      </div>
    )
  );
  CustomCalendar.displayName = "CustomCalendar";

  // Custom calendar styles
  const calendarStyles = {
    '--calendar-background': 'hsl(var(--background))',
    '--calendar-border': 'hsl(var(--border))',
    '--calendar-text': 'hsl(var(--foreground))',
    '--calendar-text-muted': 'hsl(var(--muted-foreground))',
    '--calendar-accent': 'hsl(var(--accent))',
    '--calendar-accent-foreground': 'hsl(var(--accent-foreground))',
    '--calendar-primary': 'hsl(var(--primary))',
    '--calendar-primary-foreground': 'hsl(var(--primary-foreground))',
  } as React.CSSProperties;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Trades to Excel
          </DialogTitle>
          <DialogDescription>
            Select a time frame and export your trade data to Excel with analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Frame Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Time Frame</Label>
            <RadioGroup value={timeFrame} onValueChange={(value) => setTimeFrame(value as ExportTimeFrame)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="week" />
                <Label htmlFor="week" className="text-sm">This Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="month" />
                <Label htmlFor="month" className="text-sm">Selected Month</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="text-sm">Custom Date Range (min. 7 days)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="text-sm">All Trades</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Selection Based on Time Frame */}
          {timeFrame === 'week' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Week</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" style={calendarStyles}>
                  <CustomCalendar
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => isAfter(date, today) || isBefore(date, userRegistrationDate)}
                    userRegistrationDate={userRegistrationDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {timeFrame === 'month' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Month</Label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {format(new Date(month + '-01'), 'MMMM yyyy')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeFrame === 'custom' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM dd') : 'Start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" style={calendarStyles}>
                    <CustomCalendar
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => isAfter(date, today) || isBefore(date, userRegistrationDate)}
                      userRegistrationDate={userRegistrationDate}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM dd') : 'End'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" style={calendarStyles}>
                    <CustomCalendar
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => isAfter(date, today) || isBefore(date, userRegistrationDate)}
                      userRegistrationDate={userRegistrationDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="text-sm space-y-1">
                <div>Selected trades: <span className="font-medium">{filteredTrades.length}</span></div>
                {timeFrame === 'week' && startDate && (
                  <div>Week of: <span className="font-medium">{format(startOfWeek(startDate, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(startDate, { weekStartsOn: 1 }), 'MMM dd, yyyy')}</span></div>
                )}
                {timeFrame === 'month' && (
                  <div>Month: <span className="font-medium">{format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</span></div>
                )}
                {timeFrame === 'custom' && startDate && endDate && (
                  <div>Date range: <span className="font-medium">{format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}</span></div>
                )}
                {timeFrame === 'all' && (
                  <div>All available trades</div>
                )}
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* No trades warning */}
          {filteredTrades.length === 0 && trades.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No trades found for the selected time frame. Please select a different time period or check your date selection.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || filteredTrades.length === 0}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export to Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 