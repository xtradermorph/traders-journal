import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Clock, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40 original-dark">
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
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
            <h1 className="text-4xl font-bold text-foreground mb-4">Contact Us</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get in touch with our support team
            </p>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="bg-card rounded-2xl p-8 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Get in Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email Support</h3>
                    <p className="text-muted-foreground mb-2">
                      For general inquiries and support
                    </p>
                    <a 
                      href="mailto:support@tradersjournal.pro" 
                      className="text-primary hover:text-primary/80 underline"
                    >
                      support@tradersjournal.pro
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Feedback</h3>
                    <p className="text-muted-foreground mb-2">
                      Share your experience and suggestions
                    </p>
                    <Link 
                      href="/feedback" 
                      className="text-blue-500 hover:text-blue-600 underline"
                    >
                      Submit Feedback
                    </Link>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Clock className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Response Time</h3>
                    <p className="text-muted-foreground">
                      We typically respond within 24-48 hours during business days
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="bg-card rounded-2xl p-8 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Quick Help</h2>
              
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Before reaching out, you might find answers to common questions in our FAQ section.
                </p>
                
                <Link 
                  href="/faq" 
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <MessageSquare className="h-4 w-4" />
                  View FAQ
                </Link>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Common Topics</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Account setup and management</li>
                    <li>• Trade recording and analysis</li>
                    <li>• AI features and insights</li>
                    <li>• Social features and sharing</li>
                    <li>• Technical issues and bugs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 bg-card rounded-2xl p-8 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">What to Include</h2>
            <p className="text-muted-foreground mb-4">
              To help us assist you better, please include the following information when contacting us:
            </p>
            <ul className="list-disc ml-6 text-muted-foreground space-y-2">
              <li>Your username or email address</li>
              <li>A clear description of the issue or question</li>
              <li>Steps to reproduce the problem (if applicable)</li>
              <li>Screenshots or error messages (if relevant)</li>
              <li>Your browser and device information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 