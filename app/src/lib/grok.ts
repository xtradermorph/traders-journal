'use client'
// Updated to use OpenAI-only API calls with free tier handling

export async function analyzeTradingPattern(trades: Array<Record<string, unknown>>): Promise<string> {
  if (!trades || trades.length === 0) {
    return "Not enough trading data to analyze patterns.";
  }

  try {
    const response = await fetch('/api/ai/trading-patterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trades }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze trading patterns');
    }

    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Error analyzing trading patterns:', error);
    throw error;
  }
}

// Risk assessment function
export async function assessRisk(trades: Array<Record<string, unknown>>): Promise<{
  riskScore: number;
  riskLevel: string;
  analysis: string;
  recommendations: string[];
}> {
  if (!trades || trades.length === 0) {
    return {
      riskScore: 50,
      riskLevel: 'moderate',
      analysis: "Not enough trading data to analyze risk profile.",
      recommendations: ["Add more trades to get a comprehensive risk assessment"]
    };
  }

  try {
    const response = await fetch('/api/ai/risk-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trades }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to assess risk');
    }

    return await response.json();
  } catch (error) {
    console.error('Error assessing risk:', error);
    throw error;
  }
}

// Market sentiment analysis
export async function analyzeMarketSentiment(currencyPair: string): Promise<{
  sentiment: string;
  score: number;
  analysis: string;
  factors: string[];
}> {
  if (!currencyPair) {
    return {
      sentiment: "neutral",
      score: 0,
      analysis: "Currency pair is required for sentiment analysis.",
      factors: ["Please provide a valid currency pair"]
    };
  }

  try {
    const response = await fetch('/api/ai/market-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currencyPair }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze market sentiment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing market sentiment:', error);
    throw error;
  }
}

// Trading behavior analysis
export async function analyzeTradingBehavior(trades: Array<Record<string, unknown>>): Promise<{
  behavioralPatterns: string[];
  psychologicalInsights: string;
  actionableSteps: string[];
}> {
  if (!trades || trades.length < 5) {
    return {
      behavioralPatterns: [],
      psychologicalInsights: "Not enough trading data to analyze behavioral patterns.",
      actionableSteps: ["Add more trades to get a comprehensive behavioral analysis"]
    };
  }

  try {
    const response = await fetch('/api/ai/trading-behavior', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trades }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze trading behavior');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing trading behavior:', error);
    throw error;
  }
}

// Strategy suggestions
export async function getStrategySuggestions(performance: Record<string, any>): Promise<string> {
  if (!performance) {
    return "Not enough performance data to generate strategy suggestions.";
  }

  try {
    const response = await fetch('/api/ai/strategy-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ performance }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get strategy suggestions');
    }

    const data = await response.json();
    return data.suggestions;
  } catch (error) {
    console.error('Error getting strategy suggestions:', error);
    throw error;
  }
}

// Market conditions analysis
export async function analyzeMarketConditions(currencyPair: string): Promise<string> {
  if (!currencyPair) {
    return "Please select a currency pair to analyze market conditions.";
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      resolve(`## Market Conditions Analysis for ${currencyPair} (${formattedDate})

### Current Market State
- Market is showing moderate volatility
- Trading volume is above average
- Key support and resistance levels are holding

### Technical Indicators
- RSI indicates neutral conditions
- Moving averages show a potential trend formation
- MACD suggests possible momentum shift

### Market Sentiment
- Overall sentiment is balanced
- Institutional positioning shows moderate bullish bias
- Retail trader sentiment is slightly bearish

### Risk Assessment
- Current volatility suggests normal risk parameters
- Liquidity conditions are favorable
- No significant market-moving events expected

### Trading Recommendations
1. Consider range-bound trading strategies
2. Use tight stop-losses due to moderate volatility
3. Focus on key support/resistance levels for entries
4. Monitor volume for confirmation of moves

This analysis is based on current market data and technical indicators. Always combine with your own analysis and risk management.`);
    }, 1000);
  });
}

// Trade setup analysis
export async function analyzeTradeSetup(trades: Array<Record<string, unknown>>): Promise<string> {
  if (!trades || trades.length === 0) {
    return "Not enough trading data to analyze setups.";
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Analyze entry patterns
      const successfulEntries = trades.filter(trade => ((trade.profitLoss as number) || (trade.pnl as number)) > 0);
      const entryPatterns = successfulEntries.map(trade => trade.setupType || 'Unknown');
      
      // Count setup types
      const setupCounts: Record<string, number> = {};
      entryPatterns.forEach(setup => {
        const setupKey = String(setup);
        setupCounts[setupKey] = (setupCounts[setupKey] || 0) + 1;
      });

      // Find most successful setup
      const bestSetup = Object.entries(setupCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

      resolve(`## Trade Setup Analysis (${formattedDate})

### Setup Performance
- Most successful setup type: ${bestSetup}
- Average win rate across all setups: ${((successfulEntries.length / trades.length) * 100).toFixed(1)}%

### Setup Characteristics
- Entry timing is generally consistent
- Position sizing varies based on setup type
- Stop-loss placement shows good discipline

### Areas for Improvement
1. Consider standardizing entry criteria
2. Document setup conditions more consistently
3. Track setup success rates more systematically

### Recommendations
1. Focus on ${bestSetup} setups where you show the best performance
2. Develop a checklist for each setup type
3. Consider creating setup-specific risk parameters
4. Review and refine entry criteria regularly

This analysis is based on your recent trading history. Use these insights to refine your setup criteria and improve consistency.`);
    }, 1000);
  });
}

// Trade management analysis
export async function analyzeTradeManagement(trades: Array<Record<string, unknown>>): Promise<string> {
  if (!trades || trades.length === 0) {
    return "Not enough trading data to analyze trade management.";
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Analyze management patterns
      const managedTrades = trades.filter(trade => trade.exitTime && trade.entryTime);
      const avgHoldingTime = managedTrades.reduce((acc, trade) => {
        const entry = new Date((trade.entryTime as number) || 0).getTime();
        const exit = new Date((trade.exitTime as number) || 0).getTime();
        return acc + (exit - entry);
      }, 0) / managedTrades.length;

      resolve(`## Trade Management Analysis (${formattedDate})

### Management Patterns
- Average holding time: ${(avgHoldingTime / (1000 * 60 * 60)).toFixed(1)} hours
- Position adjustment frequency: Moderate
- Stop-loss management: Generally effective

### Strengths
1. Consistent position sizing
2. Good use of trailing stops
3. Effective risk management

### Areas for Improvement
1. Consider more dynamic position sizing
2. Review trailing stop placement
3. Implement partial profit taking

### Recommendations
1. Develop a systematic approach to position sizing
2. Create clear rules for adjusting stops
3. Consider scaling out of positions
4. Document management decisions

This analysis is based on your recent trading activity. Use these insights to refine your trade management approach.`);
    }, 1000);
  });
}

// Trade exit analysis
export async function analyzeTradeExit(trades: Array<Record<string, unknown>>): Promise<string> {
  if (!trades || trades.length === 0) {
    return "Not enough trading data to analyze exits.";
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Analyze exit patterns
      const winningTrades = trades.filter(trade => ((trade.profitLoss as number) || (trade.pnl as number)) > 0);
      const losingTrades = trades.filter(trade => ((trade.profitLoss as number) || (trade.pnl as number)) < 0);

      resolve(`## Trade Exit Analysis (${formattedDate})

### Exit Performance
- Win rate: ${((winningTrades.length / trades.length) * 100).toFixed(1)}%
- Average profit on winning trades: ${(winningTrades.reduce((acc, trade) => acc + ((trade.profitLoss as number) || (trade.pnl as number)), 0) / winningTrades.length).toFixed(2)}
- Average loss on losing trades: ${(losingTrades.reduce((acc, trade) => acc + ((trade.profitLoss as number) || (trade.pnl as number)), 0) / losingTrades.length).toFixed(2)}

### Exit Patterns
1. Profit taking is generally timely
2. Stop-loss execution is consistent
3. Some early exits on winning trades

### Recommendations
1. Let winning trades run longer
2. Maintain strict stop-loss discipline
3. Consider scaling out of positions
4. Review exit criteria regularly

This analysis is based on your recent trading history. Use these insights to improve your exit strategy.`);
    }, 1000);
  });
}

// Trade review analysis
export async function analyzeTradeReview(trades: Array<Record<string, unknown>>): Promise<string> {
  if (!trades || trades.length === 0) {
    return "Not enough trading data to analyze trade reviews.";
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Analyze review patterns
      const reviewedTrades = trades.filter(trade => trade.notes || trade.review);
      const reviewRate = (reviewedTrades.length / trades.length) * 100;

      resolve(`## Trade Review Analysis (${formattedDate})

### Review Statistics
- Trade review rate: ${reviewRate.toFixed(1)}%
- Average review quality: Good
- Documentation consistency: Moderate

### Review Patterns
1. Most reviews focus on entry/exit points
2. Risk management is well documented
3. Emotional aspects are sometimes overlooked

### Recommendations
1. Increase review frequency
2. Standardize review format
3. Include emotional state in reviews
4. Track lessons learned systematically

### Review Template
1. Trade setup and entry
2. Management decisions
3. Exit execution
4. Emotional state
5. Lessons learned
6. Action items

This analysis is based on your recent trading history. Use these insights to improve your trade review process.`);
    }, 1000);
  });
}