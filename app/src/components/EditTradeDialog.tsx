"use client"

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/index";
import { useToast } from "@/hooks/use-toast";
import type { Trade } from '@/types/trade';
import { Loader2, Check, TrendingUp, Calendar, Clock, DollarSign, Tag, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

// Same schema as AddTradeDialog
const tradeFormSchema = z.object({
  currencyPair: z.string()
    .min(1, "Currency pair is required")
    .max(6, "Currency pair must be 6 characters or less")
    .regex(/^[A-Z]{6}$/, "Currency pair must be uppercase letters only"),
  tradeType: z.enum(["LONG", "SHORT"], {
    required_error: "Trade type is required",
  }),
  entryPrice: z.coerce.number().positive("Entry price must be positive"),
  exitPrice: z.coerce.number().positive("Exit price must be positive"),
  entryTime: z.string()
    .min(1, "Entry time is required")
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use 24-hour format HH:MM"),
  exitTime: z.string()
    .min(1, "Exit time is required")
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use 24-hour format HH:MM"),
  lotSize: z.coerce.number().positive("Lot size must be positive").min(0.01, "Lot size must be at least 0.01").max(1000, "Lot size cannot exceed 1000"),
  date: z.string().min(1, "Date is required"),
  profitLoss: z.string()
    .min(1, "Profit/Loss is required")
    .refine(val => {
      // Remove $ symbol and convert to number
      const cleanValue = val.replace(/[$]/g, '');
      const numValue = parseFloat(cleanValue);
      return !isNaN(numValue) && numValue >= -999999 && numValue <= 999999;
    }, { 
      message: "Profit/Loss must be a valid number between -999,999 and 999,999" 
    }),
  pips: z.coerce.number()
    .refine(val => !isNaN(val) && val >= -99999 && val <= 99999, { 
      message: "Pips must be a number between -99,999 and 99,999" 
    }),
  duration: z.number().min(0, "Duration must be 0 or positive"),
  currency: z.string()
    .min(1, "Currency is required")
    .max(4, "Currency must be 4 characters or less")
    .regex(/^[A-Z]{3,4}$/, "Currency must be uppercase letters only"),
  // Optional fields
  notes: z.string().max(400, "Notes cannot exceed 400 characters").optional(),
  tags: z.string().max(20, "Tags must be 20 characters or less").regex(/^[a-zA-Z0-9 ]*$/, "Tags can only contain letters, numbers, and spaces").optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

interface EditTradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  onTradeUpdated?: () => void;
}

const lotSizeOptions = [
  "0.01", "0.02", "0.03", "0.05", "0.10", "0.20", "0.50", "0.80", "1.00",
  "2.00", "5.00", "8.00", "10.00", "12.00", "15.00", "18.00", "20.00",
  "25.00", "30.00", "35.00", "40.00", "45.00", "50.00", "80.00", "100.00",
  "other"
];

const currencyPairs = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'CHFJPY', 'EURCHF', 'AUDCAD', 'CADJPY',
  'GBPAUD', 'GBPCAD', 'GBPCHF', 'AUDCHF', 'AUDJPY', 'CADCHF', 'NZDJPY',
  'NZDCHF', 'NZDCAD', 'AUDNZD', 'EURNZD', 'GBPNZD', 'Other'
];

const currencies = [
  "AUD",
  "USD", 
  "EUR",
  "GBP",
  "NZD",
  "Other"
];

const EditTradeDialog = ({ isOpen, onClose, trade, onTradeUpdated }: EditTradeDialogProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCustomLotSize, setIsCustomLotSize] = useState(false);
  const [customLotSizeValue, setCustomLotSizeValue] = useState('');
  const [customLotSizeError, setCustomLotSizeError] = useState('');
  const [notesCharCount, setNotesCharCount] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      currencyPair: "",
      tradeType: "LONG",
      entryPrice: undefined,
      exitPrice: undefined,
      entryTime: "",
      exitTime: "",
      lotSize: undefined,
      date: new Date().toISOString().split('T')[0],
      pips: undefined,
      profitLoss: "",
      currency: "AUD",
      notes: "",
      duration: 0,
      tags: "",
    },
  });

  // Add a derived state for tag validity
  const tagValue = form.watch('tags');
  const isTagInvalid = tagValue && /,/.test(tagValue);

  // Update form when trade data changes
  useEffect(() => {
    if (trade) {
      // Convert database field names to form field names
      form.reset({
        currencyPair: trade.currency_pair,
        tradeType: trade.trade_type,
        entryPrice: trade.entry_price,
        exitPrice: trade.exit_price,
        entryTime: trade.entry_time ? new Date(trade.entry_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
        exitTime: trade.exit_time ? new Date(trade.exit_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
        lotSize: trade.lot_size,
        date: trade.date ? new Date(trade.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        pips: trade.pips,
        profitLoss: trade.profit_loss ? trade.profit_loss.toString() : '',
        currency: trade.currency || 'AUD',
        notes: trade.notes || '',
        duration: trade.duration || 0,
        tags: trade.tags && Array.isArray(trade.tags) ? trade.tags[0] || '' : '',
      });

      // Set custom lot size state
      const isPredefined = lotSizeOptions.some(option => 
        option !== 'other' && parseFloat(option) === trade.lot_size
      );
      setIsCustomLotSize(!isPredefined);
      if (!isPredefined) {
        setCustomLotSizeValue(trade.lot_size.toString());
      }

      // Set notes character count
      setNotesCharCount((trade.notes || '').length);
    }
  }, [trade, form]);

  // Watch relevant fields for automatic calculations
  const watchedEntryPrice = form.watch("entryPrice");
  const watchedExitPrice = form.watch("exitPrice");
  const watchedTradeType = form.watch("tradeType");
  const watchedCurrencyPair = form.watch("currencyPair");
  const watchedEntryTime = form.watch("entryTime");
  const watchedExitTime = form.watch("exitTime");

  // Effect for calculating Pips
  React.useEffect(() => {
    const newPips = calculatePips(watchedEntryPrice, watchedExitPrice, watchedTradeType, watchedCurrencyPair);
    // Check if newPips is a valid number or undefined (if inputs are not sufficient)
    if (typeof newPips === 'number' && !isNaN(newPips)) {
      form.setValue('pips', newPips, { shouldValidate: true, shouldDirty: true });
    } else {
      form.setValue('pips', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedEntryPrice, watchedExitPrice, watchedTradeType, watchedCurrencyPair, form]);

  // Effect for calculating Duration
  React.useEffect(() => {
    const newDuration = calculateDuration(watchedEntryTime, watchedExitTime);
    form.setValue('duration', newDuration, { shouldValidate: true, shouldDirty: true });
  }, [watchedEntryTime, watchedExitTime, form]);

  // Calculate pips function (same as AddTradeDialog)
  const calculatePips = (
    entryPrice: number | undefined,
    exitPrice: number | undefined,
    tradeType: 'LONG' | 'SHORT' | undefined,
    currencyPair: string | undefined
  ): number | undefined => {
    if (entryPrice === undefined || exitPrice === undefined || !tradeType || !currencyPair || currencyPair.length < 3) {
      return undefined;
    }

    let priceDifference: number;
    if (tradeType === 'LONG') {
      priceDifference = exitPrice - entryPrice;
    } else {
      priceDifference = entryPrice - exitPrice;
    }

    const isJpyPair = currencyPair.toUpperCase().includes("JPY");
    let pipsValue: number;

    if (isJpyPair) {
      // For JPY pairs, pip is 2nd decimal after point. Multiplier is 100.
      pipsValue = priceDifference * 100;
    } else {
      // For non-JPY pairs, pip is 4th decimal after point. Multiplier is 10000.
      pipsValue = priceDifference * 10000;
    }
    
    // Round to one decimal place for pips
    return parseFloat(pipsValue.toFixed(1));
  };

  // Calculate duration function (same as AddTradeDialog)
  const calculateDuration = (entryTime: string | undefined, exitTime: string | undefined): number => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // Validates HH:MM format

    if (!entryTime || !exitTime || !timeRegex.test(entryTime) || !timeRegex.test(exitTime)) {
      return 0; // Invalid format, or missing time, or regex test failed
    }

    const [entryHoursStr, entryMinutesStr] = entryTime.split(':');
    const [exitHoursStr, exitMinutesStr] = exitTime.split(':');

    const entryHours = parseInt(entryHoursStr, 10);
    const entryMinutes = parseInt(entryMinutesStr, 10);
    const exitHours = parseInt(exitHoursStr, 10);
    const exitMinutes = parseInt(exitMinutesStr, 10);

    // This check should ideally be redundant due to the regex, but good for safety.
    if (isNaN(entryHours) || isNaN(entryMinutes) || isNaN(exitHours) || isNaN(exitMinutes)) {
      return 0;
    }

    let entryTotalMinutes = entryHours * 60 + entryMinutes;
    let exitTotalMinutes = exitHours * 60 + exitMinutes;

    if (exitTotalMinutes < entryTotalMinutes) {
      // This implies the trade crossed midnight (e.g., entry 23:00, exit 01:00)
      // Add a day's worth of minutes to the exit time for calculation.
      exitTotalMinutes += 24 * 60;
    }

    const duration = exitTotalMinutes - entryTotalMinutes;
    
    // If the duration is negative at this point, it implies an invalid sequence 
    // not covered by the simple midnight crossing (e.g. a multi-day trade entered backwards, or bad input not caught by regex)
    // or a trade longer than 24 hours if we didn't reset entry/exit days.
    // For this component, we'll return 0 for negative or excessively large durations.
    if (duration < 0 || duration > (24 * 60)) { // Assuming no single trade will be > 24 hours for this calculation.
      // Exception: if original entryTime was 00:00 and original exitTime was also 00:00 then duration is 0, which is fine.
      // Or if a trade is exactly 24 hours. e.g. entry 10:00 exit 10:00 (next day)
      if (entryTime === exitTime && duration === (24*60)) return (24*60); // exactly 24h trade
      if (duration < 0) return 0; // Truly invalid sequence
    }
    
    return duration;
  };

  // Update trade mutation
  const updateTradeMutation = useMutation({
    mutationFn: async (rawData: TradeFormValues) => {
      if (!trade) throw new Error('No trade to update');


      
      const data = {
        ...rawData,
        pips: rawData.pips ?? calculatePips(rawData.entryPrice, rawData.exitPrice, rawData.tradeType, rawData.currencyPair),
        duration: calculateDuration(rawData.entryTime, rawData.exitTime),
        // Ensure profitLoss is a number, default to 0 if undefined
        profitLoss: rawData.profitLoss && rawData.profitLoss.trim() !== '' 
          ? parseFloat(rawData.profitLoss.replace(/[$]/g, '')) 
          : 0,
      };



      // Map form field names to database column names
      const updatedTrade = {
        currency_pair: data.currencyPair,
        trade_type: data.tradeType,
        entry_price: data.entryPrice,
        exit_price: data.exitPrice,
        entry_time: new Date(`2000-01-01T${data.entryTime}:00`),
        exit_time: new Date(`2000-01-01T${data.exitTime}:00`),
        duration: data.duration,
        pips: data.pips,
        lot_size: data.lotSize,
        profit_loss: data.profitLoss,
        currency: data.currency,
        date: new Date(data.date),
        notes: data.notes || null,
        tags: data.tags ? [data.tags] : null,
      };



      const { data: updateData, error } = await supabase
        .from('trades')
        .update(updatedTrade)
        .eq('id', trade.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Invalidate and refetch trades
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      // Show success message
      setSaveSuccess(true);
      toast({
        title: "Success",
        description: "Trade updated successfully!",
      });

      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
        // setIsSubmitting(false); // This line was not in the new_code, so it's removed.
      }, 1500);

      return updateData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['trades', '/api/trades', '/api/stats']
      });
      
      // Force the toast to show
      toast({
        id: 'trade-update-success',
        title: 'Trade Updated Successfully',
        description: 'Trade has been successfully updated in your Trader\'s Journal.',
        variant: 'default',
      });
      
      setSaveSuccess(true);
      
      // Reset save success after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
      
      onClose();
      form.reset();
      setIsCustomLotSize(false);
      setCustomLotSizeValue('');
      setCustomLotSizeError('');
      setNotesCharCount(0);
      if (onTradeUpdated) {
        onTradeUpdated();
      }
    },
    onError: (error: Error) => {
      toast({
        id: 'trade-update-error',
        title: 'Error Updating Trade',
        description: error.message || 'Failed to update trade. Please check your data and try again.',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = async (data: TradeFormValues) => {
    setIsSubmitting(true);
    setSaveSuccess(false);

    try {
      // Calculate final values
      const finalDuration = calculateDuration(data.entryTime, data.exitTime);
      const finalPips = data.pips ?? calculatePips(data.entryPrice, data.exitPrice, data.tradeType, data.currencyPair);

      // Submit the form
      updateTradeMutation.mutate(data);

    } catch (error) {
      console.error('Error updating trade:', error);
      toast({
        title: "Error",
        description: "Failed to update trade. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50/95 to-slate-100/95 backdrop-blur-md border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] [&>button]:text-slate-700 [&>button]:hover:text-slate-900 [&>button]:hover:bg-slate-100/80">
        <DialogHeader className="bg-black/80 backdrop-blur-md rounded-t-xl border-b border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-3 sm:p-4 md:p-6">
          <div className="flex items-start justify-between w-full">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white font-bold text-lg sm:text-xl md:text-2xl px-1 sm:px-2">
                Edit Trade
              </DialogTitle>
              <DialogDescription className="text-gray-200 mt-1 sm:mt-2 font-medium px-1 sm:px-2 text-sm sm:text-base">
                Update the details of your forex trade with precision
          </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Trade Info Header */}
            <Card className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm rounded-xl border border-green-200/30 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-[0_4px_12px_rgba(34,197,94,0.3)]">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">Trade Information</CardTitle>
                    <CardDescription className="text-slate-600 font-medium">
                      Essential trade details and configuration
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
            {/* Currency Pair */}
            <FormField
              control={form.control}
              name="currencyPair"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    Currency Pair <span className="text-red-500">*</span>
                  </FormLabel>
                  <div>
                    <Select 
                      onValueChange={(value) => {
                        if (value === 'Other') {
                          field.onChange('');
                        } else {
                          field.onChange(value);
                        }
                      }} 
                      value={currencyPairs.includes(field.value) ? field.value : 'Other'}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800">
                          <SelectValue placeholder="Select currency pair" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                        {currencyPairs.map((pair) => (
                          <SelectItem key={pair} value={pair} className="text-slate-800 hover:bg-slate-50">{pair}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!currencyPairs.includes(field.value)) && (
                      <Input 
                        placeholder="Enter custom currency pair" 
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase().slice(0, 6))}
                        className="mt-2 w-full bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800"
                      />
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

                          {/* Trade Type and Tags */}
              <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tradeType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                      <FormLabel className="text-slate-700 font-medium">
                        Trade Type <span className="text-red-500">*</span>
                      </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                          <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <RadioGroupItem value="LONG" id="LONG" className="text-green-600 border-slate-300" />
                            <Label htmlFor="LONG" className="text-green-700 font-medium cursor-pointer">Long</Label>
                      </div>
                          <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <RadioGroupItem value="SHORT" id="SHORT" className="text-red-600 border-slate-300" />
                            <Label htmlFor="SHORT" className="text-red-700 font-medium cursor-pointer">Short</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => {
                    const showMaxWarning = field.value && field.value.length >= 20;
                    return (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">Tags <span className="text-xs text-slate-500">(optional)</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter tag"
                            maxLength={20}
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => {
                              // Only allow alphanumeric and spaces, no commas or special chars
                              const value = e.target.value.replace(/[^a-zA-Z0-9 ]/g, "");
                              field.onChange(value);
                            }}
                            className="bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium"
                          />
                        </FormControl>
                        <div className="text-xs text-slate-500 mt-1">Only one tag per trade allowed.</div>
                        {field.value && /,/.test(field.value) && (
                          <div className="text-xs text-red-600 mt-1">Commas are not allowed. Only one tag per trade is allowed.</div>
                        )}
                        {showMaxWarning && (
                          <div className="text-xs text-red-600 mt-1">Max 20 characters reached.</div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

            {/* Entry and Exit Prices */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entryPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">
                      Entry Price <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.00001"
                        placeholder="1.0950"
                        className="bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">
                      Exit Price <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.00001"
                        placeholder="1.0975"
                        className="bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Entry and Exit Times */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">
                      Entry Time <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="HH:MM" 
                        maxLength={5}
                        {...field}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^\d:]/g, '');
                          if (val.length > 5) val = val.slice(0, 5);
                          field.onChange(val);
                        }}
                        className="bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">
                      Exit Time <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="HH:MM" 
                        maxLength={5}
                        {...field}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^\d:]/g, '');
                          if (val.length > 5) val = val.slice(0, 5);
                          field.onChange(val);
                        }}
                        className="bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      readOnly
                      className="text-right w-full appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none bg-slate-100/80 backdrop-blur-sm text-slate-700 border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                      value={field.value !== undefined ? String(field.value) : '0'}
                      placeholder="Calculated automatically"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lot Size and Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lotSize"
                render={({ field }) => {
                  const currentValue = field.value;
                  const isPredefinedOption = currentValue && lotSizeOptions.some(option => 
                    option !== 'other' && parseFloat(option) === currentValue
                  );
                  const selectValue = isPredefinedOption ? currentValue.toFixed(2) : 'other';
                  
                  return (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">
                        Lot Size <span className="text-red-500">*</span>
                      </FormLabel>
                      <div>
                        <Select
                          onValueChange={(value) => {
                            if (value === 'other') {
                              setIsCustomLotSize(true);
                              field.onChange(undefined);
                            } else {
                              setIsCustomLotSize(false);
                              field.onChange(parseFloat(value));
                            }
                          }}
                          value={isCustomLotSize ? 'other' : selectValue}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800">
                              <SelectValue placeholder="Select lot size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                            {lotSizeOptions.map((size) => (
                              <SelectItem key={size} value={size} className="text-slate-800 hover:bg-slate-50">{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isCustomLotSize && (
                          <div>
                            <Input 
                              type="text"
                              inputMode="decimal"
                              placeholder="Enter custom lot size (0.01-1000)" 
                              value={customLotSizeValue ?? ''}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                const cleanValue = inputValue.replace(/[^0-9.]/g, '');
                                const parts = cleanValue.split('.');
                                if (parts.length > 2) return;
                                
                                if (inputValue !== cleanValue) {
                                  setCustomLotSizeError('Only numbers between 0.01 and 1000 are allowed');
                                  return;
                                }
                                
                                setCustomLotSizeValue(cleanValue);
                                setCustomLotSizeError('');
                                
                                if (cleanValue === '') {
                                  field.onChange(undefined);
                                } else {
                                  const value = parseFloat(cleanValue);
                                  if (!isNaN(value)) {
                                    if (value >= 0.01 && value <= 1000) {
                                      field.onChange(value);
                                      setCustomLotSizeError('');
                                    } else {
                                      field.onChange(undefined);
                                      setCustomLotSizeError('Please enter a number between 0.01 and 1000');
                                    }
                                  } else {
                                    field.onChange(undefined);
                                    setCustomLotSizeError('Please enter numbers only');
                                  }
                                }
                              }}
                              className="mt-2 w-full bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800"
                            />
                            {customLotSizeError && (
                              <p className="text-red-500 text-sm mt-1">{customLotSizeError}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">
                      Date <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        max={new Date().toISOString().split('T')[0]}
                        className="bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pips and Profit/Loss in one row */}
            <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pips"
              render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-slate-700 font-medium">
                      Net Pips <span className="text-red-500">*</span>
                    </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      {...field}
                      readOnly
                        className={`text-right w-full appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none bg-slate-100/80 backdrop-blur-sm border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${
                          field.value !== undefined && field.value < 0 ? 'text-red-600' : field.value !== undefined && field.value > 0 ? 'text-green-600' : 'text-slate-700'
                      }`}
                      value={field.value !== undefined ? String(field.value) : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profitLoss"
              render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-slate-700 font-medium">
                      Profit/Loss <span className="text-red-500">*</span>
                    </FormLabel>
                  <FormControl>
                    <Input 
                        type="text"
                      placeholder="0.00"
                      {...field}
                        value={field.value !== undefined ? String(field.value) : ''}
                        onChange={(e) => {
                          // Only allow numbers, dots, minus sign, and $ symbol
                          const value = e.target.value.replace(/[^0-9.$-]/g, '');
                          // Ensure only one dot
                          const parts = value.split('.');
                          if (parts.length > 2) {
                            const filteredValue = parts[0] + '.' + parts.slice(1).join('');
                            field.onChange(filteredValue);
                          } else {
                            field.onChange(value);
                          }
                        }}
                        className={`text-right w-full bg-white/95 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${
                          (() => {
                            if (field.value === undefined || field.value === '') return 'text-slate-700';
                            const cleanValue = String(field.value).replace(/[$]/g, '');
                            const numValue = parseFloat(cleanValue);
                            return !isNaN(numValue) && numValue >= 0 ? 'text-green-600' : 'text-red-600';
                          })()
                        }`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            {/* Currency Field */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    Currency <span className="text-red-500">*</span>
                  </FormLabel>
                  <div>
                    <Select 
                      onValueChange={(value) => {
                        if (value === 'Other') {
                          field.onChange('');
                        } else {
                          field.onChange(value);
                        }
                      }} 
                      value={currencies.includes(field.value) ? field.value : 'Other'}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                        {currencies.map((currency) => (
                          <SelectItem key={currency} value={currency} className="text-slate-800 hover:bg-slate-50">{currency}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!currencies.includes(field.value)) && (
                      <Input 
                        placeholder="Enter custom currency" 
                        value={field.value ?? ''}
                        onChange={(e) => {
                          // Only allow letters, no numbers
                          const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
                          field.onChange(value);
                        }}
                        className="mt-2 w-full bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800"
                      />
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    Notes <span className="text-xs text-slate-500">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="Trade strategy, observations, etc. (max 400 characters)"
                        className="resize-none bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium"
                        maxLength={400}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setNotesCharCount(e.target.value.length);
                        }}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-slate-500">
                        {notesCharCount}/400
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              </CardContent>
            </Card>

            <DialogFooter className="mt-6 space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="bg-white/80 backdrop-blur-sm border-slate-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isTagInvalid || !form.formState.isValid}
                className={`${
                  form.formState.isValid && !isTagInvalid
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-[0_8px_24px_rgba(34,197,94,0.3)]"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                } backdrop-blur-sm border border-green-400/20`}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Update Trade"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTradeDialog;
