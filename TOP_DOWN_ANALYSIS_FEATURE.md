# Top Down Analysis (TDA) Feature

## Overview

The Top Down Analysis (TDA) feature is a comprehensive market analysis tool that evaluates trading opportunities across multiple timeframes to provide AI-powered trade recommendations with probability scores. This feature helps traders make informed decisions by analyzing market conditions systematically.

## Key Features

### 🎯 Multi-Timeframe Analysis
- **Daily Timeframe**: Long-term trend and market structure analysis
- **2-Hour Timeframe**: Medium-term momentum and key levels
- **15-Minute Timeframe**: Short-term entry signals and volatility

### 🤖 AI-Powered Recommendations
- **Probability Scoring**: 0-100% probability of successful trade
- **Trade Recommendations**: LONG, SHORT, NEUTRAL, or AVOID
- **Risk Assessment**: LOW, MEDIUM, or HIGH risk levels
- **Confidence Levels**: AI confidence in the analysis
- **Detailed Reasoning**: Comprehensive breakdown of analysis factors

### 📊 Structured Analysis Process
- **Step-by-step workflow** through each timeframe
- **Progress tracking** with visual indicators
- **Question-based analysis** for consistent evaluation
- **Real-time validation** and error handling

## How It Works

### 1. Analysis Setup
- Select currency pair from comprehensive list
- Add optional notes for context
- Create new analysis session

### 2. Timeframe Analysis
For each timeframe (Daily → 2H → 15M), users answer structured questions:

#### Daily Timeframe Questions:
- What is the overall market trend on the daily timeframe?
- Are there any major support/resistance levels visible?
- What is the current market structure (higher highs/lower lows)?
- Are there any major economic events affecting this pair?
- What is your confidence level in the daily trend?

#### 2-Hour Timeframe Questions:
- What is the trend direction on the 2-hour timeframe?
- Are there any key levels or zones to watch?
- What is the momentum like on this timeframe?
- Are there any divergences visible?
- What is your confidence level in the 2-hour analysis?

#### 15-Minute Timeframe Questions:
- What is the immediate price action showing?
- Are there any entry signals visible?
- What is the current volatility like?
- Are there any pending orders or liquidity levels?
- What is your confidence level in the 15-minute setup?

### 3. AI Analysis Generation
The system processes user answers using sophisticated algorithms:

- **Weighted Scoring**: Daily (40%), 2H (35%), 15M (25%)
- **Sentiment Analysis**: BULLISH, BEARISH, or NEUTRAL for each timeframe
- **Signal Strength**: Consistency and confidence metrics
- **Risk Assessment**: Based on probability and market conditions

### 4. Results & Recommendations
Users receive comprehensive analysis including:

- **Overall Probability**: Weighted average across all timeframes
- **Trade Recommendation**: Specific action to take
- **Risk Level**: Assessment of trade risk
- **AI Summary**: Concise overview of findings
- **Detailed Reasoning**: Breakdown of analysis factors
- **Timeframe Breakdown**: Individual analysis for each timeframe

## Probability Guidelines

### Trade Decision Matrix:
- **75%+ Probability**: Strong recommendation (LOW risk)
- **60-74% Probability**: Good opportunity (MEDIUM risk)
- **45-59% Probability**: Neutral stance (MEDIUM risk)
- **<45% Probability**: Avoid trading (HIGH risk)

### Confidence Levels:
- **90%+**: Very high confidence
- **75-89%**: High confidence
- **60-74%**: Moderate confidence
- **<60%**: Low confidence

## Database Schema

### Core Tables:
1. **top_down_analyses**: Main analysis records
2. **tda_timeframe_analyses**: Timeframe-specific data
3. **tda_questions**: Analysis questions by timeframe
4. **tda_answers**: User responses to questions
5. **tda_analysis_history**: Audit trail of analysis changes

### Key Fields:
- `overall_probability`: 0-100% success probability
- `trade_recommendation`: LONG/SHORT/NEUTRAL/AVOID
- `confidence_level`: AI confidence percentage
- `risk_level`: LOW/MEDIUM/HIGH risk assessment
- `ai_summary`: Concise analysis summary
- `ai_reasoning`: Detailed reasoning breakdown

## API Endpoints

### Main TDA Operations:
- `GET /api/tda` - Fetch analyses (list or specific)
- `POST /api/tda` - Create new analysis
- `PUT /api/tda` - Update analysis
- `DELETE /api/tda` - Delete analysis

### Answer Management:
- `POST /api/tda/answers` - Save user answers
- `GET /api/tda/answers` - Fetch answers for analysis

### AI Analysis:
- `POST /api/tda/ai-analysis` - Generate AI recommendations

## Usage Instructions

### Starting a New Analysis:
1. Navigate to Dashboard
2. Click "Top Down Analysis" button
3. Select currency pair and add notes
4. Click "Start Analysis"

### Completing Timeframe Analysis:
1. Answer all questions for current timeframe
2. Click "Next Timeframe" to proceed
3. Repeat for all three timeframes
4. Review and submit for AI analysis

### Reviewing Results:
1. View overall probability and recommendation
2. Check risk level and confidence
3. Read AI summary and reasoning
4. Review timeframe breakdown
5. Use insights for trade decisions

### Viewing History:
- Access TDA History section on Dashboard
- Review past analyses and outcomes
- Track performance over time

## Technical Implementation

### Frontend Components:
- `TopDownAnalysisDialog`: Main analysis interface
- `TDAHistory`: History display component
- Form validation and progress tracking
- Real-time data synchronization

### Backend Services:
- Supabase database integration
- Row Level Security (RLS) policies
- AI analysis algorithms
- Data validation and sanitization

### Security Features:
- User authentication required
- Ownership verification for all operations
- Audit trail for analysis changes
- Secure data transmission

## Future Enhancements

### Planned Features:
- **Advanced AI Integration**: Integration with external AI services
- **Backtesting**: Historical analysis validation
- **Performance Tracking**: Success rate monitoring
- **Custom Questions**: User-defined analysis criteria
- **Market Data Integration**: Real-time price feeds
- **Collaborative Analysis**: Sharing with trading partners

### AI Improvements:
- **Machine Learning**: Pattern recognition from successful analyses
- **Natural Language Processing**: Enhanced text analysis
- **Market Sentiment**: Integration with news and social media
- **Risk Modeling**: Advanced risk assessment algorithms

## Support & Troubleshooting

### Common Issues:
- **Analysis not saving**: Check internet connection and try again
- **Questions not loading**: Refresh page and restart analysis
- **AI analysis failing**: Verify all questions are answered

### Best Practices:
- **Complete all questions**: More data leads to better analysis
- **Be consistent**: Use same criteria across timeframes
- **Review regularly**: Check analysis history for patterns
- **Combine with other tools**: Use TDA as part of broader strategy

## Data Privacy

- All analysis data is private to the user
- No data is shared with third parties
- Analysis history is stored securely
- Users can delete analyses at any time

---

*This feature is designed to enhance trading decision-making through systematic analysis and AI-powered insights. Always combine with proper risk management and never rely solely on automated recommendations.* 