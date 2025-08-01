'use client'

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Lightbulb, Target, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const TradingWorkflowGuide = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProTip, setShowProTip] = useState(false);
  const [showWorkflowOrder, setShowWorkflowOrder] = useState(false);

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
      <CardContent className="p-4">
        {/* Header with Collapse/Expand Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center flex-1">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">
              📊 Your Trading Workflow: Analyze → Decide → Trade → Record
            </h2>
            <p className="text-sm text-blue-700 leading-relaxed">
              Use <strong>Top Down Analysis</strong> for market evaluation, leverage AI insights for decision-making, 
              execute trades objectively, and document your journey in your personal trading journal.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-4 p-2 h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
          >
            {isExpanded ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Collapsible Content */}
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          {/* Pro Tip Section - Collapsible */}
          <div className="border-t border-blue-200 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProTip(!showProTip)}
            className="w-full justify-between text-blue-700 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-md"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Pro Tip</span>
            </div>
            {showProTip ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          <div className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            showProTip ? "max-h-32 opacity-100 mt-2" : "max-h-0 opacity-0"
          )}>
            <p className="text-sm text-blue-700 leading-relaxed pl-6">
              After your TDA analysis, share insights and discuss potential trade setups with other traders 
              in the Social Forum for additional perspectives before making your final decision.
            </p>
          </div>
        </div>

        {/* Recommended Workflow Order - Collapsible */}
        <div className="border-t border-blue-200 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWorkflowOrder(!showWorkflowOrder)}
            className="w-full justify-between text-blue-700 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-md"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="font-medium">Recommended Workflow Order</span>
            </div>
            {showWorkflowOrder ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          <div className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            showWorkflowOrder ? "max-h-32 opacity-100 mt-2" : "max-h-0 opacity-0"
          )}>
                         <div className="pl-6">
               <div className="flex items-center gap-3 text-sm text-blue-700">
                 <div className="flex items-center gap-2">
                   <div className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                     <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                     </svg>
                   </div>
                   <span className="font-medium">TDA</span>
                 </div>
                 <span className="text-blue-400">→</span>
                 <div className="flex items-center gap-2">
                   <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                     <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                     </svg>
                   </div>
                   <span className="font-medium">Social Forum</span>
                 </div>
                 <span className="text-blue-400">→</span>
                 <div className="flex items-center gap-2">
                   <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                     <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                     </svg>
                   </div>
                   <span className="font-medium">Add Trade</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingWorkflowGuide; 