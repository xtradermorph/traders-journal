// Market Data Service for Real-time Financial Information
// Integrates with multiple APIs for comprehensive market data

export interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  high24h: number
  low24h: number
  timestamp: Date
}

export interface MarketSentiment {
  symbol: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  score: number // -100 to 100
  confidence: number // 0 to 100
  factors: string[]
  timestamp: Date
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: Date
  sentiment: 'positive' | 'negative' | 'neutral'
  relevance: number // 0 to 100
}

export interface EconomicEvent {
  id: string
  title: string
  country: string
  currency: string
  impact: 'high' | 'medium' | 'low'
  date: Date
  forecast?: string
  previous?: string
  actual?: string
}

export interface TechnicalIndicators {
  symbol: string
  rsi: number
  macd: {
    line: number
    signal: number
    histogram: number
  }
  movingAverages: {
    sma20: number
    sma50: number
    sma200: number
  }
  support: number[]
  resistance: number[]
  timestamp: Date
}

export interface VolatilityData {
  symbol: string
  currentVolatility: number
  historicalVolatility: number
  impliedVolatility?: number
  volatilityRank: number // 1-100
  riskLevel: 'low' | 'medium' | 'high'
  timestamp: Date
}

// Alpha Vantage API Integration
class AlphaVantageService {
  private apiKey: string
  private baseUrl = 'https://www.alphavantage.co/query'

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'UYIBL618VPL93Z0X'
  }

  async getQuote(symbol: string): Promise<MarketData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch quote')
      
      const data = await response.json()
      const quote = data['Global Quote']
      
      if (!quote) return null
      
      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        high24h: parseFloat(quote['03. high']),
        low24h: parseFloat(quote['04. low']),
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Alpha Vantage quote error:', error)
      return null
    }
  }

  async getNewsSentiment(symbol: string): Promise<NewsItem[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${this.apiKey}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch news sentiment')
      
      const data = await response.json()
      const feed = data.feed || []
      
      return feed.map((item: any) => ({
        id: item.url,
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: new Date(item.time_published),
        sentiment: this.mapSentiment(item.overall_sentiment_score),
        relevance: parseFloat(item.relevance_score) * 100
      }))
    } catch (error) {
      console.error('Alpha Vantage news error:', error)
      return []
    }
  }

  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators | null> {
    try {
      const [rsiResponse, macdResponse, smaResponse] = await Promise.all([
        fetch(`${this.baseUrl}?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${this.apiKey}`),
        fetch(`${this.baseUrl}?function=MACD&symbol=${symbol}&interval=daily&series_type=close&apikey=${this.apiKey}`),
        fetch(`${this.baseUrl}?function=SMA&symbol=${symbol}&interval=daily&time_period=20&series_type=close&apikey=${this.apiKey}`)
      ])
      
      if (!rsiResponse.ok || !macdResponse.ok || !smaResponse.ok) {
        throw new Error('Failed to fetch technical indicators')
      }
      
      const [rsiData, macdData, smaData] = await Promise.all([
        rsiResponse.json(),
        macdResponse.json(),
        smaResponse.json()
      ])
      
      // Extract latest values
      const rsiValues = rsiData['Technical Analysis: RSI']
      const macdValues = macdData['Technical Analysis: MACD']
      const smaValues = smaData['Technical Analysis: SMA']
      
      const latestDate = Object.keys(rsiValues)[0]
      
      return {
        symbol,
        rsi: parseFloat(rsiValues[latestDate]['RSI']),
        macd: {
          line: parseFloat(macdValues[latestDate]['MACD']),
          signal: parseFloat(macdValues[latestDate]['MACD_Signal']),
          histogram: parseFloat(macdValues[latestDate]['MACD_Hist'])
        },
        movingAverages: {
          sma20: parseFloat(smaValues[latestDate]['SMA']),
          sma50: 0, // Would need separate API call
          sma200: 0  // Would need separate API call
        },
        support: [],
        resistance: [],
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Alpha Vantage technical indicators error:', error)
      return null
    }
  }

  private mapSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive'
    if (score < -0.1) return 'negative'
    return 'neutral'
  }
}

// Forex Factory Economic Calendar Integration
class ForexFactoryService {
  private baseUrl = 'https://www.forexfactory.com'

  async getEconomicCalendar(): Promise<EconomicEvent[]> {
    try {
      // Note: This would require server-side implementation due to CORS
      // For now, return mock data structure
      return []
    } catch (error) {
      console.error('Forex Factory error:', error)
      return []
    }
  }
}

// Market Sentiment Analysis Service
class MarketSentimentService {
  private alphaVantage: AlphaVantageService
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.alphaVantage = new AlphaVantageService()
  }

  async analyzeSentiment(symbol: string): Promise<MarketSentiment> {
    const cacheKey = `sentiment_${symbol}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }

    try {
      const [quote, news, technical] = await Promise.all([
        this.alphaVantage.getQuote(symbol),
        this.alphaVantage.getNewsSentiment(symbol),
        this.alphaVantage.getTechnicalIndicators(symbol)
      ])

      const sentiment = this.calculateSentiment(quote, news, technical)
      
      this.cache.set(cacheKey, {
        data: sentiment,
        timestamp: Date.now()
      })
      
      return sentiment
    } catch (error) {
      console.error('Sentiment analysis error:', error)
      return this.getDefaultSentiment(symbol)
    }
  }

  private calculateSentiment(
    quote: MarketData | null,
    news: NewsItem[],
    technical: TechnicalIndicators | null
  ): MarketSentiment {
    let score = 0
    let confidence = 0
    const factors: string[] = []

    // Price action sentiment
    if (quote) {
      if (quote.changePercent > 1) {
        score += 20
        factors.push('Strong price momentum')
      } else if (quote.changePercent < -1) {
        score -= 20
        factors.push('Negative price action')
      }
      
      if (quote.volume > 1000000) {
        confidence += 20
        factors.push('High trading volume')
      }
    }

    // News sentiment
    if (news.length > 0) {
      const positiveNews = news.filter(n => n.sentiment === 'positive').length
      const negativeNews = news.filter(n => n.sentiment === 'negative').length
      const totalNews = news.length
      
      if (totalNews > 0) {
        const newsScore = ((positiveNews - negativeNews) / totalNews) * 30
        score += newsScore
        factors.push(`${positiveNews} positive, ${negativeNews} negative news items`)
      }
      
      confidence += Math.min(news.length * 2, 30)
    }

    // Technical indicators
    if (technical) {
      if (technical.rsi < 30) {
        score += 15
        factors.push('Oversold RSI')
      } else if (technical.rsi > 70) {
        score -= 15
        factors.push('Overbought RSI')
      }
      
      if (technical.macd.histogram > 0 && technical.macd.line > technical.macd.signal) {
        score += 10
        factors.push('Bullish MACD crossover')
      } else if (technical.macd.histogram < 0 && technical.macd.line < technical.macd.signal) {
        score -= 10
        factors.push('Bearish MACD crossover')
      }
      
      confidence += 25
    }

    // Normalize score to -100 to 100 range
    score = Math.max(-100, Math.min(100, score))
    confidence = Math.max(0, Math.min(100, confidence))

    // Determine sentiment category
    let sentiment: 'bullish' | 'bearish' | 'neutral'
    if (score > 20) sentiment = 'bullish'
    else if (score < -20) sentiment = 'bearish'
    else sentiment = 'neutral'

    return {
      symbol: quote?.symbol || 'UNKNOWN',
      sentiment,
      score,
      confidence,
      factors,
      timestamp: new Date()
    }
  }

  private getDefaultSentiment(symbol: string): MarketSentiment {
    return {
      symbol,
      sentiment: 'neutral',
      score: 0,
      confidence: 0,
      factors: ['Limited data available'],
      timestamp: new Date()
    }
  }

  async getVolatilityData(symbol: string): Promise<VolatilityData> {
    try {
      const quote = await this.alphaVantage.getQuote(symbol)
      
      if (!quote) {
        return this.getDefaultVolatility(symbol)
      }

      // Calculate volatility based on price change
      const volatility = Math.abs(quote.changePercent)
      const riskLevel = volatility > 3 ? 'high' : volatility > 1.5 ? 'medium' : 'low'
      
      return {
        symbol,
        currentVolatility: volatility,
        historicalVolatility: volatility, // Would need historical data for better calculation
        volatilityRank: Math.min(Math.round(volatility * 20), 100),
        riskLevel,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Volatility calculation error:', error)
      return this.getDefaultVolatility(symbol)
    }
  }

  private getDefaultVolatility(symbol: string): VolatilityData {
    return {
      symbol,
      currentVolatility: 0,
      historicalVolatility: 0,
      volatilityRank: 50,
      riskLevel: 'medium',
      timestamp: new Date()
    }
  }
}

// Export services
export const marketSentimentService = new MarketSentimentService()
export const alphaVantageService = new AlphaVantageService()
export const forexFactoryService = new ForexFactoryService()

// Utility functions
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000000) {
    return `${(volume / 1000000000).toFixed(2)}B`
  } else if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`
  }
  return volume.toString()
}

export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'low': return 'text-green-600'
    case 'medium': return 'text-yellow-600'
    case 'high': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'bullish': return 'text-green-600'
    case 'bearish': return 'text-red-600'
    case 'neutral': return 'text-gray-600'
    default: return 'text-gray-600'
  }
}
