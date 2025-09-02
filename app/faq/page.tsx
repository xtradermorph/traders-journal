'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqData = [
    {
      category: "General Questions",
      items: [
        {
          question: "What is Trader's Journal?",
          answer: "Trader's Journal is a comprehensive trading companion that helps you record, analyze, and improve your trading performance. It combines traditional journaling with AI-powered insights and social features to create a complete trading ecosystem."
        },
        {
          question: "Is Trader's Journal free to use?",
          answer: "Yes! Trader's Journal is currently completely free for all users. We're committed to keeping the core functionality free while we develop premium features for the future."
        },
        {
          question: "Do I need to be an experienced trader to use this?",
          answer: "No, Trader's Journal is designed for traders of all experience levels. Whether you're just starting out or you're a seasoned professional, our tools can help you track and improve your trading performance."
        }
      ]
    },
    {
      category: "AI Features",
      items: [
        {
          question: "What AI features does Trader's Journal offer?",
          answer: "Our AI features include performance analysis, pattern recognition, trade scoring, and personalized insights. The AI analyzes your trading data to identify patterns, strengths, and areas for improvement."
        },
        {
          question: "Is the AI analysis financial advice?",
          answer: "No, absolutely not. Our AI tools are for informational and analytical purposes only. They do not provide financial advice, trading recommendations, or signals. All trading decisions are your own responsibility."
        },
        {
          question: "How accurate is the AI analysis?",
          answer: "Our AI provides insights based on your historical data and market patterns, but it should not be used as the sole basis for trading decisions. Always combine AI insights with your own analysis and risk management."
        },
        {
          question: "What are the new Enhanced AI Market Analysis features?",
          answer: "Our enhanced AI features include Market Sentiment Analysis (real-time sentiment scores), Risk Prediction (AI-powered risk assessment), Behavioral Pattern Recognition (trading pattern identification), Market Correlations (currency pair relationships), and Volatility Prediction (market volatility forecasting). These provide comprehensive market insights and actionable recommendations."
        }
      ]
    },
    {
      category: "Social Features",
      items: [
        {
          question: "Can I share my trades with other users?",
          answer: "Yes! You can share your trades with the community, follow other traders, and engage in discussions. You have full control over what you share and who can see your trades."
        },
        {
          question: "How do I connect with other traders?",
          answer: "You can follow other traders, join discussions in the social forum, and share your trading insights. The platform helps you build a network of like-minded traders."
        },
        {
          question: "Is my trading data private?",
          answer: "Your trading data is private by default. You choose what to share with the community. We never share your personal information or trading data without your explicit consent."
        }
      ]
    },
    {
      category: "Mobile & Security Features",
      items: [
        {
          question: "How do I enable biometric authentication?",
          answer: "Go to your Settings page, look for the 'Security' or 'Biometric Authentication' section, click 'Enable Biometric Login', and follow your device's prompts. This works with Face ID, Touch ID, or Windows Hello on compatible devices."
        },
        {
          question: "How does offline mode work?",
          answer: "Offline mode automatically caches your data locally, allowing you to access your trading history and settings without internet. Any changes made offline are synchronized when you're back online, maintaining data integrity."
        },
        {
          question: "What are push notifications?",
          answer: "Push notifications provide instant alerts for trade updates, friend requests, system notifications, and important events. You can customize which notifications you receive in your Settings."
        },
        {
          question: "How secure is my data?",
          answer: "Your data is protected with enterprise-level security including comprehensive audit logging, real-time security monitoring, and encrypted storage. We never share your personal information without explicit consent."
        }
      ]
    },
    {
      category: "Account & Data",
      items: [
        {
          question: "How do I create an account?",
          answer: "Simply click the 'Sign Up' button on our homepage and follow the registration process. You'll need to provide an email address and create a password."
        },
        {
          question: "Can I export my trading data?",
          answer: "Yes, you can export your trade records and performance data in various formats for your own analysis or backup purposes."
        },
        {
          question: "What happens if I delete my account?",
          answer: "When you delete your account, all your data including trades, profile information, and social connections will be permanently removed. This action cannot be undone."
        }
      ]
    },
    {
      category: "Performance & User Experience",
      items: [
        {
          question: "What are Loading Skeletons and Progressive Loading?",
          answer: "Loading Skeletons are visual placeholders that show content structure while loading. Progressive Loading displays content in stages, showing the most important information first. These features make the app feel faster and more responsive."
        },
        {
          question: "How does image optimization work?",
          answer: "Our image optimization automatically converts images to WebP format, generates responsive sizes, and implements lazy loading for faster page loads and better mobile performance."
        },
        {
          question: "What performance improvements have been made?",
          answer: "We've implemented database query optimization, composite indexes, smart caching, code splitting, and progressive loading to significantly improve app performance and responsiveness."
        }
      ]
    },
    {
      category: "Technical Support",
      items: [
        {
          question: "What browsers are supported?",
          answer: "Trader's Journal works on all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using the latest version of your browser."
        },
        {
          question: "Is there a mobile app?",
          answer: "Trader's Journal is a web application that works great on mobile devices. You can access it from any device with a web browser."
        },
        {
          question: "How do I get help if I have issues?",
          answer: "You can contact our support team at support@yourdomain.com or visit our support page for detailed guides and troubleshooting information."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40 original-dark">
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
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
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about Trader&apos;s Journal and its features.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqData.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">{section.category}</h2>
              <div className="space-y-4">
                {section.items.map((item, itemIndex) => {
                  const globalIndex = sectionIndex * 100 + itemIndex;
                  const isOpen = openItems.includes(globalIndex);
                  
                  return (
                    <div key={itemIndex} className="border border-border rounded-lg">
                      <button
                        onClick={() => toggleItem(globalIndex)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium text-foreground">{item.question}</span>
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4">
                          <p className="text-muted-foreground">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="text-center mt-12 bg-card rounded-2xl p-8 border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Still Have Questions?</h2>
          <p className="text-muted-foreground mb-6">
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </p>
          <Link 
            href="/contact" 
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
} 