import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, BarChart3, Users, Brain, Calendar, Share2, Target, TrendingUp, Shield, Zap } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Comprehensive Trade Recording",
      description: "Record every trade with detailed information including entry/exit prices, time, duration, pips, and profit/loss calculations."
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI-Powered Analysis",
      description: "Get intelligent insights into your trading patterns, performance metrics, and personalized recommendations for improvement."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Performance Analytics",
      description: "Track your win rate, average pips, profit/loss trends, and detailed performance breakdowns by currency pairs and timeframes."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Social Trading Community",
      description: "Connect with other traders, share your trades, follow successful traders, and learn from the community."
    },
    {
      icon: <Share2 className="h-6 w-6" />,
      title: "Trade Sharing & Collaboration",
      description: "Share your trades with friends, get feedback, and collaborate on trading strategies."
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Trade Calendar & History",
      description: "View your trading history in an organized calendar format with monthly and yearly summaries."
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Goal Setting & Tracking",
      description: "Set trading goals and track your progress towards achieving them with visual progress indicators."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Private",
      description: "Your trading data is encrypted and secure. You control who sees your trades and personal information."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Real-time Updates",
      description: "Get instant updates on your performance metrics and community interactions."
    }
  ];

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40 original-dark">
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-6xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
        <div className="py-0 px-0">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-start mb-6">
              <Link 
                href="/" 
                className="inline-flex items-center justify-center h-12 w-12 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
              >
                <div className="relative flex items-center justify-center rounded-full bg-orange-500/10 p-2.5">
                  <ArrowLeft className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                </div>
              </Link>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Features</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover all the powerful tools and features that make Trader's Journal your ultimate trading companion.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-all duration-300 hover:border-primary/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center bg-card rounded-2xl p-8 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Start Your Trading Journey?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of traders who are already improving their performance with Trader's Journal. 
              Start recording your trades, analyzing your performance, and connecting with the trading community today.
            </p>
            <Link 
              href="/register" 
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
            >
              <CheckCircle className="h-5 w-5" />
              Get Started Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 