"use client"

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Share, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/index";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";
import type { Trade } from '@/types/trade';
import { cn } from "@/lib/utils";
import EditTradeDialog from "./EditTradeDialog";
import ShareTradeDialog from "./ShareTradeDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { processTrades, ProcessedTrade } from '@/lib/utils';

const formatDatePart = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toISOString().split('T')[0];
};

const formatTime = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

interface RecentTradesProps {
  trades: ProcessedTrade[];
  onTradeUpdated?: () => void;
}

const RecentTrades: React.FC<RecentTradesProps> = ({ trades, onTradeUpdated }) => {
  const isLoading = false; // Since trades are passed as props, no need to fetch
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sharingTrade, setSharingTrade] = useState<Trade | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  // Add this state for notes tooltip
  const [openNoteIdx, setOpenNoteIdx] = useState<string | null>(null);
  
  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId);
      
      if (error) throw error;
      return tradeId;
    },
    onSuccess: (deletedTradeId) => {
      // Invalidate and refetch all trade-related queries
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      toast({
        id: 'trade-delete-success',
        title: 'Trade Deleted Successfully',
        description: 'The trade has been permanently removed from your journal.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        id: 'trade-delete-error',
        title: 'Error Deleting Trade',
        description: error.message || 'Failed to delete trade. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleDeleteTrade = (tradeId: string) => {
    deleteTradeMutation.mutate(tradeId);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingTrade(null);
  };

  const handleShareTrade = (trade: Trade) => {
    setSharingTrade(trade);
    setIsShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setIsShareDialogOpen(false);
    setSharingTrade(null);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-foreground">Recent Trades</h3>
        {trades && Array.isArray(trades) && trades.length > 5 && (
        <Link href="/trade-records">
          <Button variant="link" className="text-sm font-medium p-0">
            View all
          </Button>
        </Link>
        )}
      </div>
      
      <Card className="rounded-xl">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10 p-1 text-xs">#</TableHead>
                  <TableHead className="p-1 text-xs">Date</TableHead>
                  <TableHead className="p-1 text-xs">Currency Pair</TableHead>
                  <TableHead className="p-1 text-xs">Trade Type</TableHead>
                  <TableHead className="p-1 text-xs">Entry Time</TableHead>
                  <TableHead className="p-1 text-xs">Exit Time</TableHead>
                  <TableHead className="p-1 text-xs">Duration (m)</TableHead>
                  <TableHead className="p-1 text-xs">Entry Price</TableHead>
                  <TableHead className="p-1 text-xs">Exit Price</TableHead>
                  <TableHead className="p-1 text-xs">Net Pips</TableHead>
                  <TableHead className="p-1 text-xs">Lot Size</TableHead>
                  <TableHead className="p-1 text-xs text-right">P/L</TableHead>
                  <TableHead className="p-1 text-xs">Currency</TableHead>
                  <TableHead className="p-1 text-xs">Tags</TableHead>
                  <TableHead className="p-1 text-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="h-8">
                      {Array.from({ length: 15 }).map((_, j) => (
                        <TableCell key={j} className="p-1 text-xs">
                          <Skeleton className="h-3 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !trades || !Array.isArray(trades) || trades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-4 text-muted-foreground text-xs">
                      No trades available
                    </TableCell>
                  </TableRow>
                ) : (
                  trades.map((trade) => (
                    <TableRow key={trade.id} className="h-8 text-xs">
                      <TableCell className="font-medium text-muted-foreground p-1 align-middle">{`#${String(trade.month_trade_number).padStart(2, '0')}`}</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{formatDatePart(trade.date)}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground p-1 align-middle">{trade.currency_pair}</TableCell>
                      <TableCell className="text-xs font-medium p-1 align-middle">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          trade.trade_type === 'LONG' 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          {trade.trade_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{trade.entry_time ? formatTime(trade.entry_time) : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{trade.exit_time ? formatTime(trade.exit_time) : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{trade.duration || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{
                        trade.currency_pair === 'USDJPY'
                          ? (typeof trade.entry_price === 'number' ? trade.entry_price.toFixed(3) : '-')
                          : (typeof trade.entry_price === 'number' ? trade.entry_price.toFixed(5) : '-')
                      }</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{
                        trade.currency_pair === 'USDJPY'
                          ? (typeof trade.exit_price === 'number' ? trade.exit_price.toFixed(3) : '-')
                          : (typeof trade.exit_price === 'number' ? trade.exit_price.toFixed(5) : '-')
                      }</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{(trade.pips ?? 0).toFixed(1)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">{trade.lot_size?.toFixed(2) || '-'}</TableCell>
                      <TableCell className={cn("text-xs font-semibold text-right p-1 align-middle", (trade.profit_loss ?? 0) >= 0 ? "text-green-500" : "text-red-500")}>{(trade.profit_loss ?? 0) >= 0 ? '+' : ''}{(trade.profit_loss ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground p-1 align-middle">{trade.currency || 'AUD'}</TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground p-1 align-middle">{Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || ''}</TableCell>
                      <TableCell className="text-xs text-muted-foreground p-1 align-middle">
                        {trade.notes ? (
                          <TooltipProvider>
                            <Tooltip open={openNoteIdx === trade.id} onOpenChange={v => setOpenNoteIdx(v ? trade.id : null)}>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="max-w-[180px] truncate text-left cursor-pointer bg-transparent border-none outline-none p-0 h-auto min-h-0"
                                  tabIndex={0}
                                  onClick={() => setOpenNoteIdx(openNoteIdx === trade.id ? null : trade.id)}
                                  onBlur={() => setOpenNoteIdx(null)}
                                  asChild={false}
                                >
                                  {trade.notes.split('\n')[0].length > 50
                                    ? `${trade.notes.split('\n')[0].substring(0, 50)}...`
                                    : trade.notes.split('\n')[0]}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px] whitespace-pre-wrap">
                                <p>{trade.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <div className="max-w-[180px]">-</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : !trades || !Array.isArray(trades) || trades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No trades available
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {trades.slice(0, 5).map((trade) => (
                  <div key={trade.id} className="bg-card border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-muted-foreground">#{String(trade.month_trade_number).padStart(2, '0')}</span>
                        <span className="text-sm font-semibold">{trade.currency_pair}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-sm font-bold", (trade.profit_loss ?? 0) >= 0 ? "text-green-500" : "text-red-500")}>
                          {(trade.profit_loss ?? 0) >= 0 ? '+' : ''}{(trade.profit_loss ?? 0).toFixed(2)}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {trade.currency || 'AUD'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Date:</span> {formatDatePart(trade.date)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {trade.duration || '-'}m
                      </div>
                      <div>
                        <span className="font-medium">Entry:</span> {trade.entry_time ? formatTime(trade.entry_time) : '-'}
                      </div>
                      <div>
                        <span className="font-medium">Exit:</span> {trade.exit_time ? formatTime(trade.exit_time) : '-'}
                      </div>
                      <div>
                        <span className="font-medium">Pips:</span> {(trade.pips ?? 0).toFixed(1)}
                      </div>
                      <div>
                        <span className="font-medium">Lot:</span> {trade.lot_size?.toFixed(2) || '-'}
                      </div>
                      <div>
                        <span className="font-medium">Currency:</span> {trade.currency || 'AUD'}
                      </div>
                    </div>
                    
                    {Array.isArray(trade.tags) && trade.tags.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Tags:</span> {trade.tags.join(', ')}
                      </div>
                    )}
                    
                    {trade.notes && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Notes:</span>
                        <div className="mt-1 text-muted-foreground truncate">
                          {trade.notes.split('\n')[0].length > 100
                            ? `${trade.notes.split('\n')[0].substring(0, 100)}...`
                            : trade.notes.split('\n')[0]}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Trade Dialog */}
      <EditTradeDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        trade={editingTrade}
        onTradeUpdated={onTradeUpdated}
      />

      {/* Share Trade Dialog */}
      <ShareTradeDialog
        isOpen={isShareDialogOpen}
        onClose={handleCloseShareDialog}
        trade={sharingTrade}
      />

    </div>
  );
};

export { RecentTrades };

