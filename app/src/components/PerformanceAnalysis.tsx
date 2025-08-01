'use client'

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Filter, Tag, TrendingUp, Pencil, Trash2, X } from "lucide-react";
import type { Trade } from '@/types/trade';
import { AlertDialog, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { supabase } from "@/lib/supabase";

interface Stats {
  winRate: number;
  totalProfit: number;
  avgTradeProfit: number;
  riskRewardRatio: number;
  [key: string]: number | undefined;
}

interface PerformanceAnalysisProps {
  stats: Stats | null;
  trades: Trade[] | null;
  isLoading: boolean;
  onTradesChanged?: () => void;
}

const formatTime = (dateInput: string | Date) => {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const PerformanceAnalysis = ({
  stats,
  trades,
  isLoading,
  onTradesChanged
}: PerformanceAnalysisProps) => {
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [filterTag, setFilterTag] = useState<string>("");
  const [contractSize, setContractSize] = useState<string>("0.01");
  const [riskPips, setRiskPips] = useState<string>("-3");
  const [selectedPair, setSelectedPair] = useState<string>("all");
  const [depositCurrency, setDepositCurrency] = useState<string>("USD");
  const [showAllTags, setShowAllTags] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editTag, setEditTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const { toast } = useToast();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [aiStrategyLoading, setAiStrategyLoading] = useState(false);
  const [aiStrategyError, setAiStrategyError] = useState<string | null>(null);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterApplied, setFilterApplied] = useState(false);
  const [deleteTag, setDeleteTag] = useState<string | null>(null);
  const [showActionsForTag, setShowActionsForTag] = useState<string | null>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Pagination state for tag-filtered trades
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tradesPerPage = 30;
  
  const currencyPairs = [
    "GBPUSD",
    "EURUSD",
    "AUDUSD",
    "USDJPY",
    "USDCHF",
    "Other"
  ];
  
  // Generate performance analysis text based on stats
  const generateAnalysis = () => {
    if (!trades || trades.length === 0) {
      return (
        <div className="bg-muted/60 border border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto shadow-sm mb-4">
          <strong className="text-base text-foreground">No trade data available yet.</strong>
          <span className="mt-2 text-sm text-muted-foreground">
            Once you start recording trades, this summary will display your win rate, total profit/loss, average trade performance, and more.
          </span>
          <ul className="list-disc text-left ml-6 mt-3 text-sm text-muted-foreground space-y-1">
            <li>Track your trading performance over time</li>
            <li>See your most traded currency pairs</li>
            <li>Get actionable insights to improve your strategy</li>
          </ul>
          <span className="block mt-4 text-xs text-primary font-medium">Add your first trade to unlock your performance summary!</span>
        </div>
      );
    }

    const winRate = stats?.winRate ? stats.winRate.toFixed(1) : "0";
    const totalProfit = stats?.totalProfit ? stats.totalProfit.toFixed(2) : "0.00";
    const avgTradeProfit = stats?.avgTradeProfit ? stats.avgTradeProfit.toFixed(2) : "0.00";

    // Calculate pair performance from trades
    const pairPerformanceData: Record<string, { totalTrades: number; profitLoss: number }> = {};
    for (const trade of trades) {
      if (!pairPerformanceData[trade.currency_pair]) {
        pairPerformanceData[trade.currency_pair] = { totalTrades: 0, profitLoss: 0 };
      }
      pairPerformanceData[trade.currency_pair].totalTrades++;
      pairPerformanceData[trade.currency_pair].profitLoss += (trade.profit_loss || 0);
    }

    // Find most traded pair
    let mostTradedPair = { pair: "N/A", count: 0 };
    for (const [pair, data] of Object.entries(pairPerformanceData)) {
      if (data.totalTrades > mostTradedPair.count) {
        mostTradedPair = { pair, count: data.totalTrades };
      }
    }

    // Always show the explicit summary sentence first
    return (
      <div className="mb-3">
        <p className="text-sm text-muted-foreground">
          Your trading performance shows a win rate of {winRate}%. You have a {Number(totalProfit) >= 0
            ? <span>total profit of <span className="text-green-500">${totalProfit}</span></span>
            : <span>total loss of <span className="text-red-500">${Math.abs(Number(totalProfit)).toFixed(2)}</span></span>},
          with an average of ${avgTradeProfit} per trade.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {mostTradedPair.pair !== "N/A" && (
            <span>Most traded currency pair is <span className="font-medium">{mostTradedPair.pair}</span>. </span>
          )}
          Consider adjusting your strategy to improve growth, have a compounding strategy in place that suits for your trading style.
          Aim for short duration in trades to reduce risk and to ensure long-term profitability.
          Focus on improving your win rate by refining your entry/exit criteria.
        </p>
      </div>
    );
  };
  
  // Get common trade patterns
  const getTradePatterns = () => {
    return [
      { name: "Double Top", count: 3 },
      { name: "Double Bottom", count: 2 },
      { name: "Head and Shoulders", count: 1 },
      { name: "Triangle", count: 4 },
      { name: "Flag", count: 2 }
    ];
  };
  
  // Major currency pairs used in the project
  const majorPairs = [
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", 
    "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP", 
    "EUR/JPY", "GBP/JPY"
  ];

  // Major currencies for deposit
  const majorCurrencies = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];

  // Exchange rates (simplified static values for demonstration)
  // In a real implementation, these would be fetched from an API
  const exchangeRates: Record<string, number> = {
    "EUR/USD": 1.08,
    "GBP/USD": 1.27,
    "USD/JPY": 151.20,
    "USD/CHF": 0.90,
    "AUD/USD": 0.66,
    "USD/CAD": 1.36,
    "NZD/USD": 0.61,
    "EUR/GBP": 0.85,
    "EUR/JPY": 163.30,
    "GBP/JPY": 192.00
  };

  // Currency to USD conversion rates (simplified)
  const toUsdRates: Record<string, number> = {
    "USD": 1,
    "EUR": 1.08,
    "GBP": 1.27,
    "JPY": 0.0066,
    "CHF": 1.11,
    "AUD": 0.66,
    "CAD": 0.74,
    "NZD": 0.61
  };

  // Generate contract size options
  const getContractSizeOptions = () => {
    const options = [];
    
    // 0.01 to 0.10
    for (let i = 1; i <= 10; i++) {
      options.push({ value: (i / 100).toFixed(2), label: (i / 100).toFixed(2) });
    }
    
    // 0.10 to 0.90
    for (let i = 10; i < 100; i += 10) {
      options.push({ value: (i / 100).toFixed(2), label: (i / 100).toFixed(2) });
    }
    
    // 1.00 to 100
    for (let i = 1; i <= 100; i++) {
      options.push({ value: i.toFixed(2), label: i.toFixed(2) });
    }
    
    return options;
  };

  // Calculate pip value based on currency pair, lot size, and deposit currency
  const calculatePipValue = () => {
    const lotSize = parseFloat(contractSize) || 0.01;
    const pair = selectedPair;
    const deposit = depositCurrency;
    
    // Standard lot size (1.0) = 100,000 units of base currency
    const standardLotSize = 100000;
    const positionSize = standardLotSize * lotSize;
    
    // Get the currency pair components
    const [baseCurrency, quoteCurrency] = pair.split('/');
    
    // Calculate pip value in quote currency
    let pipValueInQuote = 0;
    
    // For JPY pairs, a pip is 0.01, for others it's 0.0001
    const pipSize = quoteCurrency === 'JPY' ? 0.01 : 0.0001;
    pipValueInQuote = positionSize * pipSize;
    
    // Convert to deposit currency if needed
    let pipValueInDeposit = pipValueInQuote;
    
    if (quoteCurrency !== deposit) {
      // Convert from quote currency to USD first
      let valueInUsd = 0;
      
      if (quoteCurrency === 'USD') {
        valueInUsd = pipValueInQuote;
      } else if (`${quoteCurrency}/USD` in exchangeRates) {
        valueInUsd = pipValueInQuote * exchangeRates[`${quoteCurrency}/USD`];
      } else if (`USD/${quoteCurrency}` in exchangeRates) {
        valueInUsd = pipValueInQuote / exchangeRates[`USD/${quoteCurrency}`];
      }
      
      // Then convert from USD to deposit currency
      if (deposit === 'USD') {
        pipValueInDeposit = valueInUsd;
      } else {
        pipValueInDeposit = valueInUsd / toUsdRates[deposit];
      }
    }
    
    return pipValueInDeposit.toFixed(2);
  };
  
  // Calculate total risk amount
  const calculateRiskAmount = () => {
    const pipValue = parseFloat(calculatePipValue());
    const pips = Math.abs(parseFloat(riskPips) || 3);
    return (pipValue * pips).toFixed(2);
  };

  // Helper: get all unique, non-empty, trimmed tags with counts
  const tagCounts: Record<string, number> = {};
  (trades || []).forEach(t => {
    const tag = t.tags
      ? (typeof t.tags === 'string'
          ? t.tags.trim()
          : Array.isArray(t.tags)
            ? t.tags.join(', ').trim()
            : '')
      : '';
    if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  let uniqueTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || a.localeCompare(b));
  const maxTagsToShow = 5; // Show only 5 tags initially
  const tagsToShow = showAllTags ? uniqueTags : uniqueTags.slice(0, maxTagsToShow);

  const handleEditTag = async (oldTag: string, newTag: string) => {
    try {
      await axios.patch("/api/trades/tags", { oldTag, newTag });
      toast({ title: "Tag renamed", description: `Tag '${oldTag}' renamed to '${newTag}'.` });
      setEditTag(null);
      setEditValue("");
      if (typeof refreshTrades === 'function') await refreshTrades();
      if (typeof onTradesChanged === 'function') onTradesChanged();
    } catch (err: any) {
      toast({ title: "Error renaming tag", description: err?.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleDeleteTag = async (tag: string) => {
    try {
      await axios.delete("/api/trades/tags", { data: { tag } });
      toast({ title: "Tag removed", description: `Tag '${tag}' removed from all trades.` });
      setDeleteTag(null);
      if (typeof refreshTrades === 'function') await refreshTrades();
      if (typeof onTradesChanged === 'function') onTradesChanged();
    } catch (err: any) {
      toast({ title: "Error removing tag", description: err?.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const fetchAISummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/trades/ai-summary", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiSummary(data.summary);
    } catch (err: any) {
      setAiError(err.message || "Failed to fetch AI summary.");
      setAiSummary(null);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchAIStrategy = async () => {
    setAiStrategyLoading(true);
    setAiStrategyError(null);
    try {
      const res = await fetch("/api/trades/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "strategy" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiStrategy(data.summary);
    } catch (err: any) {
      setAiStrategyError(err.message || "Failed to fetch AI insights.");
      setAiStrategy(null);
    } finally {
      setAiStrategyLoading(false);
    }
  };

  useEffect(() => {
    fetchAISummary();
    if (trades && trades.length > 0) fetchAIStrategy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  const getPair = (t: any) =>
    t.currency_pair ||
    t.currencyPair ||
    t.curreny_pair ||
    t.currenyPair ||
    t.pair ||
    '';

  // Update fetchFilteredTrades to set filterApplied and handle 'Other' empty case
  const fetchFilteredTrades = async () => {
    setFilterLoading(true);
    setFilteredTrades([]); // Always clear previous results before fetching
    setFilterApplied(false);
    // If 'Other' is selected and the custom field is empty, show no results and mark as filtered
    if (!currencyPairs.includes(selectedPair) && selectedPair !== 'all' && selectedPair.trim() === '') {
      setFilteredTrades([]);
      setFilterApplied(true);
      setFilterLoading(false);
      return;
    }
    let query = supabase.from('trades').select('*').order('date', { ascending: false });
    // Only add currency_pair filter if not 'all'
    if (selectedPair && selectedPair !== 'all') {
      query = query.eq('currency_pair', selectedPair.trim());
    }
    if (filterStartDate) {
      query = query.gte('date', filterStartDate);
    }
    if (filterEndDate) {
      query = query.lte('date', filterEndDate);
    }
    const { data, error } = await query;
    setFilterApplied(true);
    if (error) {
      toast({ title: 'Error fetching filtered trades', description: error.message, variant: 'destructive' });
      setFilteredTrades([]);
    } else {
      let result = (data ?? []) as Trade[];
      result.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setFilteredTrades(result);
    }
    setFilterLoading(false);
  };

  // Update clearFilters to reset filterApplied
  const clearFilters = () => {
    setSelectedPair('all');
    setFilterStartDate("");
    setFilterEndDate("");
    setFilteredTrades([]);
    setFilterApplied(false);
  };

  // Add a type guard for string
  function isString(val: unknown): val is string {
    return typeof val === 'string';
  }

  const refreshTrades = async () => {
    // You may want to show a loading state here
    if (!supabase) return;
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      // Update the trades state
      setFilteredTrades([]); // clear filtered trades if any
      setSelectedTag(null); // clear tag filter if any
      setEditTag(null); // clear edit state
      // Assuming 'trades' prop is managed by parent or state, update it if needed
      // For now, we'll just update the local filteredTrades state
      // If 'trades' prop is managed by parent, you'd update it here.
      // setTrades(data); // This line would require 'setTrades' to be defined in the component's state
    }
  };

  // Reset pagination when tag selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag]);

  // Get filtered trades for selected tag
  const getFilteredTradesForTag = () => {
    if (!selectedTag || !trades) return [];
    
    return trades.filter(t => {
      if (!t.tags) return false;
      if (typeof t.tags === 'string') return t.tags.trim() === selectedTag;
      if (Array.isArray(t.tags)) return t.tags.map(tagValue => tagValue.trim()).includes(selectedTag);
      return false;
    });
  };

  // Pagination logic
  const filteredTradesForTag = getFilteredTradesForTag();
  const totalPages = Math.ceil(filteredTradesForTag.length / tradesPerPage);
  const startIndex = (currentPage - 1) * tradesPerPage;
  const endIndex = startIndex + tradesPerPage;
  const currentTrades = filteredTradesForTag.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Tag color palette
  const tagColors = [
    '#FF6B6B', // red
    '#4ECDC4', // teal
    '#FFD93D', // yellow
    '#1A535C', // dark teal
    '#FF922B', // orange
    '#5F6CAF', // blue
    '#B388FF', // purple
    '#43AA8B', // green
    '#F06595', // pink
    '#495057', // gunmetal
  ];
  // Compute tag counts and top tags
  const totalTagCount = Object.values(tagCounts).reduce((a, b) => a + b, 0);
  const topTags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <Card>
      <CardContent className="p-0">
        <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex justify-center gap-2 mb-6 bg-muted/60 rounded-lg p-1 shadow-sm">
            <TabsTrigger value="summary" className="flex-1 px-6 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition">Summary</TabsTrigger>
            <TabsTrigger value="filter" className="flex-1 px-6 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition">Filtering</TabsTrigger>
            <TabsTrigger value="tags" className="flex-1 px-6 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition">Tags</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="px-6 pb-6">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              generateAnalysis()
            )}
            {trades && trades.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold text-lg text-foreground mb-2 flex items-center">
                  <span className="mr-2">🤖</span> AI Actionable Insights
                  <Button
                    size="sm"
                    className="ml-2 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold shadow transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                    onClick={fetchAIStrategy}
                    disabled={aiStrategyLoading}
                  >
                    Reload
                  </Button>
                </h4>
                <div className="text-sm text-muted-foreground">
                  {aiStrategyLoading && <span>Generating insights...</span>}
                  {aiStrategyError && <span className="text-destructive">{aiStrategyError}</span>}
                  {!aiStrategyLoading && !aiStrategyError && aiStrategy && <span>{aiStrategy}</span>}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="filter" className="px-6 pb-6">
            <div className="bg-background border border-muted rounded-xl p-8 max-w-3xl mx-auto shadow-md mb-8">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Trade Filtering
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Currency Pair</label>
                  <Select
                    value={currencyPairs.includes(selectedPair) ? selectedPair : (selectedPair === 'all' ? 'all' : 'Other')}
                    onValueChange={value => {
                      if (value === 'Other') {
                        setSelectedPair('');
                      } else {
                        setSelectedPair(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All pairs" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      <SelectItem value="all">All pairs</SelectItem>
                      {currencyPairs.map(pair => (
                        <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!currencyPairs.includes(selectedPair) && selectedPair !== 'all') && (
                    <Input
                      placeholder="Enter custom currency pair"
                      value={selectedPair}
                      onChange={e => setSelectedPair(e.target.value.toUpperCase().slice(0, 6))}
                      className="mt-2 w-full bg-background text-foreground border-input"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date Range</label>
                  <div className="flex space-x-2">
                    <Input type="date" className="flex-1" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                    <Input type="date" className="flex-1" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Button onClick={fetchFilteredTrades} disabled={filterLoading} className="w-full sm:w-auto">
                  {filterLoading ? 'Filtering...' : 'Apply Filters'}
                </Button>
                <Button variant="outline" onClick={clearFilters} disabled={filterLoading} className="w-full sm:w-auto">
                  Clear Filters
                </Button>
              </div>
            </div>
            {/* Results Section - visually separated, wider than filter card */}
            {filteredTrades && filteredTrades.length > 0 && (
              <div className="max-w-5xl mx-auto w-full">
                <h5 className="text-base font-semibold mb-3 ml-1">Filtered Results</h5>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-muted bg-muted/60">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left font-semibold">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Currency Pair</th>
                        <th className="px-3 py-2 text-left font-semibold">Trade Type</th>
                        <th className="px-3 py-2 text-left font-semibold">Entry Time</th>
                        <th className="px-3 py-2 text-left font-semibold">Exit Time</th>
                        <th className="px-3 py-2 text-right font-semibold">Duration (m)</th>
                        <th className="px-3 py-2 text-right font-semibold">Entry Price</th>
                        <th className="px-3 py-2 text-right font-semibold">Exit Price</th>
                        <th className="px-3 py-2 text-right font-semibold">Net Pips</th>
                        <th className="px-3 py-2 text-right font-semibold">Lot Size</th>
                        <th className="px-3 py-2 text-right font-semibold">P/L</th>
                        <th className="px-3 py-2 text-center font-semibold">Currency</th>
                        <th className="px-3 py-2 text-left font-semibold">Tags</th>
                        <th className="px-3 py-2 text-left font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.map((t, idx) => {
                        return (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{idx + 1}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{t.date ? new Date(t.date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : "-"}</td>
                            <td className="px-3 py-2 font-mono uppercase tracking-wide whitespace-nowrap">{t.currency_pair || "-"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                t.trade_type === 'LONG' 
                                  ? "text-green-600 dark:text-green-400" 
                                  : "text-red-600 dark:text-red-400"
                              )}>
                                {t.trade_type || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{t.entry_time ? formatTime(t.entry_time) : '-'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{t.exit_time ? formatTime(t.exit_time) : '-'}</td>
                            <td className="px-3 py-2 text-right">{t.duration ?? "-"}</td>
                            <td className="px-3 py-2 text-right">{
  t.currency_pair === 'USDJPY'
    ? (typeof t.entry_price === 'number' ? t.entry_price.toFixed(3) : '-')
    : (typeof t.entry_price === 'number' ? t.entry_price.toFixed(5) : '-')
}</td>
                            <td className="px-3 py-2 text-right">{
  t.currency_pair === 'USDJPY'
    ? (typeof t.exit_price === 'number' ? t.exit_price.toFixed(3) : '-')
    : (typeof t.exit_price === 'number' ? t.exit_price.toFixed(5) : '-')
}</td>
                            <td className="px-3 py-2 text-right">{t.pips ?? "-"}</td>
                            <td className="px-3 py-2 text-right">{t.lot_size ?? "-"}</td>
                            <td className={
                              typeof t.profit_loss === 'number'
                                ? t.profit_loss > 0
                                  ? "px-3 py-2 text-right text-green-600"
                                  : t.profit_loss < 0
                                    ? "px-3 py-2 text-right text-red-600"
                                    : "px-3 py-2 text-right"
                                : "px-3 py-2 text-right"
                            }>
                              {typeof t.profit_loss === 'number' ? t.profit_loss.toFixed(2) : "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {t.currency || 'AUD'}
                            </td>
                            <td className="px-3 py-2 text-left">
                              {Array.isArray(t.tags) ? t.tags.join(', ') : t.tags || "-"}
                            </td>
                            <td className="px-3 py-2 text-left max-w-xs truncate" title={t.notes || undefined}>{t.notes || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Card View for Filtered Results */}
                <div className="md:hidden space-y-3">
                  {filteredTrades.map((t, idx) => (
                    <div key={t.id} className="bg-card border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                          <span className="text-sm font-semibold">{t.currency_pair || "-"}</span>
                        </div>
                        <span className={cn("text-sm font-bold", 
                          typeof t.profit_loss === 'number'
                            ? t.profit_loss > 0 ? "text-green-600" : t.profit_loss < 0 ? "text-red-600" : ""
                            : ""
                        )}>
                          {typeof t.profit_loss === 'number' ? t.profit_loss.toFixed(2) : "-"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Date:</span> {t.date ? new Date(t.date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : "-"}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {t.duration ?? "-"}m
                        </div>
                        <div>
                          <span className="font-medium">Entry:</span> {t.entry_time ? formatTime(t.entry_time) : '-'}
                        </div>
                        <div>
                          <span className="font-medium">Exit:</span> {t.exit_time ? formatTime(t.exit_time) : '-'}
                        </div>
                        <div>
                          <span className="font-medium">Pips:</span> {t.pips ?? "-"}
                        </div>
                        <div>
                          <span className="font-medium">Lot:</span> {t.lot_size ?? "-"}
                        </div>
                      </div>
                      
                      {Array.isArray(t.tags) && t.tags.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">Tags:</span> {t.tags.join(', ')}
                        </div>
                      )}
                      
                      {t.notes && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">Notes:</span>
                          <div className="mt-1 text-muted-foreground truncate">
                            {t.notes.length > 100 ? `${t.notes.substring(0, 100)}...` : t.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* If no results and a filter has been applied, show notification */}
            {filterApplied && filteredTrades && filteredTrades.length === 0 && (
              <div className="max-w-5xl mx-auto w-full text-center text-sm text-muted-foreground py-8">
                No stored data found for the currency pair you selected.
            </div>
            )}
          </TabsContent>
          
          <TabsContent value="tags" className="px-6 pb-6">
            {(!trades || trades.length === 0) ? (
              <div className="bg-muted/60 border border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto shadow-sm">
                <strong className="text-base text-foreground">No tag data available yet.</strong>
                <span className="mt-2 text-sm text-muted-foreground">
                  Once you start recording trades and add tags, this section will display:
                </span>
                <ul className="list-disc text-left ml-6 mt-3 text-sm text-muted-foreground space-y-1">
                  <li>A list of your unique trade tags, with usage counts</li>
                  <li>Easy filtering of trades by tag</li>
                  <li>Options to edit or remove tags from your trades</li>
                  <li>AI-powered insights and summaries about your tag usage and trade performance</li>
                </ul>
                <span className="block mt-4 text-xs text-primary font-medium">Add your first trade with a tag to unlock these analytics and insights!</span>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start w-full min-h-[340px]">
                {/* Left: Your Tags, Tag Pills, and Trades Table */}
                <div className="flex-1 min-w-0 space-y-4">
                  <h4 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    <span>Your Tags</span>
                  </h4>
                  <div className="flex flex-wrap gap-3 mb-6 min-h-[48px]">
                    {tagsToShow.length === 0 && (
                      <div className="text-muted-foreground italic text-sm">No tags yet. Add a trade with a tag to get started!</div>
                    )}
                    {tagsToShow.map((tag, idx) => (
                      <div
                        key={tag}
                        className="relative group"
                        onMouseEnter={() => setShowActionsForTag(tag)}
                        onMouseLeave={() => {
                          if (deleteTag !== tag) setShowActionsForTag(null);
                        }}
                        onTouchStart={() => {
                          longPressTimeout.current = setTimeout(() => setShowActionsForTag(tag), 500);
                        }}
                        onTouchEnd={() => {
                          if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
                        }}
                      >
                        {editTag === tag ? (
                          <div className="flex items-center gap-1 bg-background border-2 border-primary rounded-full px-3 py-1 shadow-md">
                            <Input
                              value={editValue}
                              onChange={e => setEditValue(String(e.target.value))}
                              maxLength={20}
                              className="h-7 text-xs px-2 w-24 border-none focus:ring-0 bg-transparent"
                              style={{ minWidth: 60 }}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => {
                              if (!editValue || !(typeof editValue === 'string' && editValue.trim())) return toast({ title: "Tag cannot be empty", variant: "destructive" });
                              handleEditTag(tag, editValue as string);
                            }}>OK</Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { setEditTag(null); setEditValue(""); }}>X</Button>
                          </div>
                        ) : (
                          <div
                            className={
                              `inline-flex items-center rounded-full font-extrabold text-sm shadow-md border transition-all duration-200 cursor-pointer select-none group-hover:scale-105 group-hover:shadow-lg` +
                              (selectedTag === tag ? ' ring-2 ring-primary/70' : '')
                            }
                            style={{
                              padding: showActionsForTag === tag ? '0.5rem 1.5rem 0.5rem 0.75rem' : '0.5rem 0.75rem',
                              background: 'linear-gradient(90deg, #b0b4b8 0%, #6e7277 100%)',
                              minHeight: 36,
                              letterSpacing: 0.5,
                              width: 'fit-content',
                              maxWidth: '100%',
                            }}
                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                          >
                            <Tag className="h-4 w-4 mr-1 opacity-80 text-primary" />
                            <span className="mr-2 text-white font-extrabold text-sm" style={{ textShadow: '0 1px 2px rgba(30,30,30,0.5)' }}>{tag}</span>
                            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">{tagCounts[tag]}</span>
                            {(showActionsForTag === tag) && (
                              <span className="flex items-center ml-2 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-6 w-6 p-0 text-white hover:text-primary-foreground" onClick={e => { e.stopPropagation(); setEditTag(tag); setEditValue(String(tag)); }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 p-0 text-red-200 hover:text-red-500" onClick={e => { e.stopPropagation(); setDeleteTag(tag); setShowActionsForTag(tag); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </span>
                            )}
                          </div>
                        )}
                        {/* Delete confirmation popover */}
                        {deleteTag === tag && (
                          <div className="absolute z-50 top-12 left-1/2 -translate-x-1/2 bg-white border border-destructive rounded-xl shadow-lg p-4 w-72 animate-fade-in">
                            <div className="text-sm text-destructive font-semibold mb-2">Remove Tag?</div>
                            <div className="text-xs text-muted-foreground mb-3">
                              This will remove the tag from all associated trades.<br/>Those trades will have <b>no tags</b> after deletion.<br/>Trades will <b>not</b> be removed from Trade Records.
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => { setDeleteTag(null); setShowActionsForTag(null); }}>Cancel</Button>
                              <Button size="sm" variant="destructive" onClick={() => { handleDeleteTag(tag); setDeleteTag(null); setShowActionsForTag(null); }}>Delete</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {uniqueTags.length > maxTagsToShow && (
                      <Button variant="link" size="sm" className="h-7 px-2" onClick={() => setShowAllTags(v => !v)}>
                        {showAllTags ? "Show less" : `Show more (${uniqueTags.length - maxTagsToShow})`}
                      </Button>
                    )}
                  </div>
                  {/* Filtered trades list with pagination */}
                  {selectedTag && (
                    <div className="bg-muted rounded-md p-4 mb-4 w-auto max-w-fit ml-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          Trades with tag: <span className="text-primary">{selectedTag}</span>
                          <span className="text-muted-foreground ml-2">
                            ({filteredTradesForTag.length} total, page {currentPage} of {totalPages})
                          </span>
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedTag(null)}>
                          <X className="h-4 w-4 mr-1" />Clear filter
                        </Button>
                      </div>
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-3 p-2 bg-background rounded border gap-2">
                          {/* Mobile: Stacked layout */}
                          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={goToPrevPage}
                              disabled={currentPage === 1}
                              className="h-8 px-3"
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={goToNextPage}
                              disabled={currentPage === totalPages}
                              className="h-8 px-3"
                            >
                              Next
                            </Button>
                          </div>
                          
                          {/* Page Numbers - Responsive */}
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  size="sm"
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  onClick={() => goToPage(pageNum)}
                                  className="h-8 w-8 p-0 text-xs"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(5 * 2.5rem + 2.5rem)' }}>
                        <table className="w-auto table-auto text-sm">
                          <thead className="sticky top-0 bg-muted/50 z-10">
                            <tr>
                              <th className="px-2 py-1 text-left text-sm font-medium">#</th>
                              <th className="px-2 py-1 text-left text-sm font-medium">Date</th>
                              <th className="px-2 py-1 text-left text-sm font-medium">Currency Pair</th>
                              <th className="px-2 py-1 text-left text-sm font-medium">Trade Type</th>
                              <th className="px-2 py-1 text-right text-sm font-medium">Entry Price</th>
                              <th className="px-2 py-1 text-right text-sm font-medium">Exit Price</th>
                              <th className="px-2 py-1 text-right text-sm font-medium">Duration (m)</th>
                              <th className="px-2 py-1 text-right text-sm font-medium">Net Pips</th>
                              <th className="px-2 py-1 text-right text-sm font-medium">Lot Size</th>
                              <th className="px-2 py-1 text-right text-sm font-medium">P/L</th>
                              <th className="px-2 py-1 text-center text-sm font-medium">Currency</th>
                              <th className="px-2 py-1 pl-4 text-left text-sm font-medium min-w-[120px] max-w-[180px]">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentTrades.map((t, idx) => (
                              <tr key={t.id} className={`border-b border-muted ${idx % 2 === 1 ? 'bg-muted/40' : ''} align-middle`}>
                                <td className="px-2 py-1 text-left text-sm align-middle font-medium">
                                  {startIndex + idx + 1}
                                </td>
                                <td className="px-2 py-1 text-left text-sm align-middle">{t.date ? new Date(t.date).toLocaleDateString() : "-"}</td>
                                <td className="px-2 py-1 text-left font-mono text-sm align-middle">{t.currency_pair}</td>
                                <td className="px-2 py-1 text-left text-sm align-middle">
                                  <span className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    t.trade_type === 'LONG' 
                                      ? "text-green-600 dark:text-green-400" 
                                      : "text-red-600 dark:text-red-400"
                                  )}>
                                    {t.trade_type || '-'}
                                  </span>
                                </td>
                                <td className="px-2 py-1 text-right font-mono text-sm align-middle">{typeof t.entry_price === 'number' ? t.entry_price : "-"}</td>
                                <td className="px-2 py-1 text-right font-mono text-sm align-middle">{typeof t.exit_price === 'number' ? t.exit_price : "-"}</td>
                                <td className="px-2 py-1 text-right font-mono text-sm align-middle">{typeof t.duration === 'number' ? t.duration : "-"}</td>
                                <td className="px-2 py-1 text-right font-mono text-sm align-middle">{typeof t.pips === 'number' ? t.pips : "-"}</td>
                                <td className="px-2 py-1 text-right font-mono text-sm align-middle">{typeof t.lot_size === 'number' ? t.lot_size : "-"}</td>
                                <td className={
                                  typeof t.profit_loss === 'number'
                                    ? t.profit_loss > 0
                                      ? "px-2 py-1 text-right text-green-600 font-semibold text-sm align-middle"
                                      : t.profit_loss < 0
                                        ? "px-2 py-1 text-right text-red-600 font-semibold text-sm align-middle"
                                        : "px-2 py-1 text-right text-sm align-middle"
                                  : "px-2 py-1 text-right text-sm align-middle"
                                }>
                                  {typeof t.profit_loss === 'number' ? t.profit_loss.toFixed(2) : "-"}
                                </td>
                                <td className="px-2 py-1 text-center text-sm align-middle">
                                  {t.currency || 'AUD'}
                                </td>
                                <td className="px-2 py-1 pl-4 text-left max-w-[180px] truncate text-sm min-w-[120px] align-middle" title={t.notes || undefined}>{t.notes || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(5 * 4rem + 1rem)' }}>
                        {currentTrades.map((t, idx) => (
                          <div key={t.id} className="bg-background border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">#{startIndex + idx + 1}</span>
                              <span className="text-xs text-muted-foreground">{t.date ? new Date(t.date).toLocaleDateString() : "-"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-medium">{t.currency_pair}</span>
                              <span className={
                                typeof t.profit_loss === 'number'
                                  ? t.profit_loss > 0
                                    ? "text-green-600 font-semibold text-sm"
                                    : t.profit_loss < 0
                                      ? "text-red-600 font-semibold text-sm"
                                      : "text-sm"
                                  : "text-sm"
                              }>
                                {typeof t.profit_loss === 'number' ? `$${t.profit_loss.toFixed(2)}` : "-"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Entry:</span>
                                <span className="font-mono ml-1">{typeof t.entry_price === 'number' ? t.entry_price : "-"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Exit:</span>
                                <span className="font-mono ml-1">{typeof t.exit_price === 'number' ? t.exit_price : "-"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="ml-1">{typeof t.duration === 'number' ? `${t.duration}m` : "-"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Pips:</span>
                                <span className="ml-1">{typeof t.pips === 'number' ? t.pips : "-"}</span>
                              </div>
                            </div>
                            {t.notes && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Notes:</span>
                                <span className="ml-1 truncate block" title={t.notes}>{t.notes}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Bottom Pagination Info */}
                      {totalPages > 1 && (
                        <div className="mt-2 text-xs text-muted-foreground text-center">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredTradesForTag.length)} of {filteredTradesForTag.length} trades
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Right: Tag Podium and Word Cloud (always visible) */}
                <div className="flex flex-col items-end justify-start flex-1 min-h-[340px] relative">
                  {/* Podium for Top 3 Tags - top right corner */}
                  <div className="absolute right-0 top-0 flex flex-row items-end justify-end gap-4 mb-8 z-10">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center justify-end" style={{ width: 80 }}>
                      <span className="text-2xl font-extrabold mb-1" style={{ color: '#C0C0C0' }}>2nd</span>
                      <Tag className="h-7 w-7 mb-1" style={{ color: tagColors[1 % tagColors.length] || '#b0b4b8' }} />
                      <span className="text-base font-semibold text-center" style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>{topTags[1]?.name || '-'}</span>
                    </div>
                    {/* 1st Place */}
                    <div className="flex flex-col items-center justify-end" style={{ width: 90 }}>
                      <span className="text-3xl font-extrabold mb-1" style={{ color: '#FFD700' }}>1st</span>
                      <Tag className="h-9 w-9 mb-1" style={{ color: tagColors[0 % tagColors.length] || '#FFD700' }} />
                      <span className="text-base font-semibold text-center" style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>{topTags[0]?.name || '-'}</span>
                    </div>
                    {/* 3rd Place */}
                    <div className="flex flex-col items-center justify-end" style={{ width: 80 }}>
                      <span className="text-xl font-extrabold mb-1" style={{ color: '#CD7F32' }}>3rd</span>
                      <Tag className="h-6 w-6 mb-1" style={{ color: tagColors[2 % tagColors.length] || '#FFA500' }} />
                      <span className="text-base font-semibold text-center" style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>{topTags[2]?.name || '-'}</span>
                    </div>
                  </div>
                  {/* Centered Pie/Donut Chart and Bulletpoint List */}
                  <div className="flex flex-row items-center justify-center gap-8 w-full mt-20">
                    {/* Pie/Donut Chart for Tag Usage (centered) */}
                    <svg width={260} height={260} viewBox="0 0 260 260" className="block">
                      {(() => {
                        const tags = Object.entries(tagCounts);
                        let startAngle = 0;
                        return tags.map(([tag, count], idx) => {
                          const percent = count / totalTagCount;
                          const angle = percent * 360;
                          const endAngle = startAngle + angle;
                          const startRad = (Math.PI / 180) * (startAngle - 90);
                          const endRad = (Math.PI / 180) * (endAngle - 90);
                          const x1 = 130 + 120 * Math.cos(startRad);
                          const y1 = 130 + 120 * Math.sin(startRad);
                          const x2 = 130 + 120 * Math.cos(endRad);
                          const y2 = 130 + 120 * Math.sin(endRad);
                          const largeArc = angle > 180 ? 1 : 0;
                          const pathData = `M130,130 L${x1},${y1} A120,120 0 ${largeArc} 1 ${x2},${y2} Z`;
                          // For percentage text placement
                          const midAngle = startAngle + angle / 2;
                          const midRad = (Math.PI / 180) * (midAngle - 90);
                          const textX = 130 + 80 * Math.cos(midRad);
                          const textY = 130 + 80 * Math.sin(midRad);
                          // Tooltip logic (SVG title)
                          const tooltip = `${tag}: ${count} trade${count !== 1 ? 's' : ''}`;
                          // Choose text color for contrast
                          const bgColor = tagColors[idx % tagColors.length];
                          const useWhite = idx % 2 === 0 || bgColor === '#495057' || bgColor === '#1A535C';
                          const textColor = useWhite ? '#fff' : '#222';
                          startAngle += angle;
                          return (
                            <g key={tag}>
                              <path d={pathData} fill={bgColor} stroke="#222" strokeWidth={1.2} >
                                <title>{tooltip}</title>
                              </path>
                              <text
                                x={textX}
                                y={textY}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                fontSize="12"
                                fontWeight="bold"
                                fill={textColor}
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                              >
                                {Math.round(percent * 100)}%
                              </text>
                            </g>
                          );
                        });
                      })()}
                      {/* Donut hole */}
                      <circle cx={130} cy={130} r={60} fill="#18181b" />
                    </svg>
                    {/* Bulletpoint List of Tags (smaller, minimal gap, higher up) */}
                    <ul className="flex flex-col gap-1 ml-2 items-start mt-2 text-xs">
                      {Object.entries(tagCounts)
                        .map(([tag, count]) => ({ tag, count, percent: count / totalTagCount }))
                        .sort((a, b) => b.percent - a.percent)
                        .map((item, idx) => (
                          <li key={item.tag} className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: tagColors[idx % tagColors.length] }}></span>
                            <span className="font-medium text-foreground">{item.tag}</span>
                            <span className="text-[11px] text-muted-foreground ml-1">{Math.round(item.percent * 100)}%</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {/* Restore AI Tag Insights section at the bottom of the tags tab */}
            <div className="mt-8">
              <h4 className="font-bold text-lg text-foreground mb-2 flex items-center">
                <span className="mr-2">🤖</span> AI Tag Insights
                <Button
                  size="sm"
                  className="ml-2 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold shadow transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                  onClick={fetchAISummary}
                  disabled={aiLoading}
                >
                  Reload
                </Button>
              </h4>
              <div className="text-sm text-muted-foreground">
                {aiLoading && <span>Generating summary...</span>}
                {aiError && <span className="text-destructive">{aiError}</span>}
                {!aiLoading && !aiError && aiSummary && <span>{aiSummary}</span>}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PerformanceAnalysis;

