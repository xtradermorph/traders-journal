import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { RecentTrades } from '@/components/RecentTrades';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { getTrades } from '@/lib/api/trades';
import type { Trade } from '@/types/trade';
import { processTrades } from '@/lib/utils';

export default function TradeRecords() {
  const [filters, setFilters] = useState({
    search: '',
    dateRange: { from: undefined, to: undefined },
    status: 'all',
    sortBy: 'date',
  });
  const queryClient = useQueryClient();

  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['trades', filters],
    queryFn: () => getTrades(filters),
  });

  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });

  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    setDateRange({ startDate, endDate });
  };

  // Function to refresh trades data
  const refreshTrades = () => {
    queryClient.invalidateQueries({ queryKey: ['trades'] });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Trade Records"
        description="View and manage your trade records."
      />

      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search trades..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="max-w-sm"
          />
          
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              <SelectItem value="win">Winning Trades</SelectItem>
              <SelectItem value="loss">Losing Trades</SelectItem>
              <SelectItem value="breakeven">Breakeven</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy}
            onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="profit">Profit/Loss</SelectItem>
              <SelectItem value="pair">Currency Pair</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <RecentTrades trades={processTrades(trades || [])} onTradeUpdated={refreshTrades} />
      )}
    </div>
  );
} 