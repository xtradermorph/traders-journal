import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: "Trader's Journal - Your Ultimate Trading Companion",
    template: "%s | Trader's Journal"
  },
  description: "Track your trades, analyze performance, and improve your trading strategy with AI-powered insights. Join thousands of traders using Trader's Journal for better market analysis.",
  keywords: [
    "trading journal",
    "trade tracking",
    "trading analysis",
    "AI trading insights",
    "performance analytics",
    "trading community",
    "forex trading",
    "stock trading",
    "crypto trading",
    "trading strategy",
    "market analysis",
    "trading performance"
  ],
  authors: [{ name: "Trader's Journal Team" }],
  creator: "Trader's Journal",
  publisher: "Trader's Journal",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://tradersjournal.pro'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tradersjournal.pro',
    title: "Trader's Journal - Your Ultimate Trading Companion",
    description: "Track your trades, analyze performance, and improve your trading strategy with AI-powered insights. Join thousands of traders using Trader's Journal for better market analysis.",
    siteName: "Trader's Journal",
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: "Trader's Journal - Trading Analysis Platform",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Trader's Journal - Your Ultimate Trading Companion",
    description: "Track your trades, analyze performance, and improve your trading strategy with AI-powered insights.",
    images: ['/images/og-image.jpg'],
    creator: '@tradersjournal',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'finance',
  classification: 'Trading and Investment Tools',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': "Trader's Journal",
    'application-name': "Trader's Journal",
    'msapplication-TileColor': '#000000',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#000000',
  },
};

export const generateMetadata = (title?: string, description?: string): Metadata => {
  return {
    ...metadata,
    title: title ? `${title} | Trader's Journal` : metadata.title,
    description: description || metadata.description,
    openGraph: {
      ...metadata.openGraph,
      title: title ? `${title} | Trader's Journal` : metadata.openGraph?.title,
      description: description || metadata.openGraph?.description,
    },
    twitter: {
      ...metadata.twitter,
      title: title ? `${title} | Trader's Journal` : metadata.twitter?.title,
      description: description || metadata.twitter?.description,
    },
  };
};