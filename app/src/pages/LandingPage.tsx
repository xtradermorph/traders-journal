"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FeatureSection } from "@/components/landing/FeatureSection";
import FeedbackCarousel from "@/components/FeedbackCarousel";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  // Don't render until auth is loaded
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
      {/* Glassmorphism background overlay */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-6xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
      {/* Hero Section */}
      <div className="relative isolate">
          <div className="mx-auto max-w-4xl px-6 pb-8 pt-10 sm:pb-12 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Your Ultimate Market Companion
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Track your trades, analyze your performance, and improve your trading strategy with our comprehensive trading journal.
            </p>
            {!isAuthenticated && (
              <div className="mt-8 flex items-center justify-center gap-x-6">
                <Button
                  size="lg"
                  onClick={() => router.push("/register")}
                  className="text-lg py-6 px-8"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="space-y-8">
          <FeatureSection
            title="Track Your Trades"
            summary="Whether you're an experienced trader or just beginning, our sleek tool empowers you to master the markets effectively."
            description={[
              "Record entries, exits, and key observations for each trade",
              "Add screenshots and notes to document your trading journey",
              "Tag trades with strategies and market conditions"
            ]}
            imagePath="/images/landing/track-trades.jpg"
            imageAlt="Trade tracking interface"
            imageOnRight={true}
          />

          <FeatureSection
            title="Analyze Your Performance"
            summary="Keep detailed records of your trades, improve strategies, and manage risk."
            description={[
              "Generate detailed performance reports and analytics",
              "Identify patterns in your trading behavior",
              "Track your progress and growth over time"
            ]}
            imagePath="/images/landing/analyze-performance.jpg"
            imageAlt="Performance analytics dashboard"
            imageOnRight={false}
          />

          <FeatureSection
            title="Master Top-Down Analysis"
            summary="Gain a comprehensive market sentiments by analyzing higher time frames, identifying trends, key levels of support and resistance, and managing risk for better trading decisions."
            description={[
              "Analyze multiple timeframes efficiently",
              "Document market structure and key levels",
              "Build and validate trading strategies"
            ]}
            imagePath="/images/landing/top-down-analysis.jpg"
            imageAlt="Market analysis tools"
            imageOnRight={true}
          />

          <FeatureSection
            title="Stay Organized and Focused"
            summary="Keep your trading journey organized and efficient with our intuitive interface and powerful features."
            description={[
              "Create custom watchlists and trade plans",
              "Set alerts for important price levels",
              "Review and learn from your trading history"
            ]}
            imagePath="/images/landing/powerful-insights.jpg"
            imageAlt="Organization and planning tools"
            imageOnRight={false}
          />
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your Path to Trading Success
        </h2>
        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
          Develop discipline and insight for consistent trading success.
          Leverage powerful tools to understand trading patterns and market behaviors.
        </p>
                 {!isAuthenticated && (
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              size="lg"
              onClick={() => router.push("/register")}
              className="text-lg py-6 px-8"
            >
              Start Your Journey
            </Button>
          </div>
        )}
      </div>

        {/* Feedback Carousel */}
        <FeedbackCarousel />

      {/* Footer */}
      <footer className="mt-6 border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Company Info */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Trader's Journal</h3>
              <p className="text-sm text-muted-foreground">
                Your comprehensive trading companion for better market analysis and performance tracking.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Quick Links</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Log In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Legal</h3>
              <ul className="space-y-1">
                <li>
                    <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                    <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
                    Trading Disclaimer
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Support</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/feedback" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Feedback
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {new Date().getFullYear()} Trader's Journal. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
                  Privacy
                </Link>
                  <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
                  Terms
                </Link>
                <Link href="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
                  Cookies
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}