'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCircle, AlertCircle, Star } from 'lucide-react';

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    feedbackType: 'general',
    rating: 0,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim() || formData.rating === 0) {
      setSubmitStatus('error');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate form submission (replace with actual API call)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      // Here you would typically send the data to your backend
      console.log('Feedback submitted:', formData);
      
      setSubmitStatus('success');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (_error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-2xl border border-border p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Thank You!</h2>
          <p className="text-muted-foreground mb-6">
            Your feedback has been submitted successfully. We appreciate you taking the time to share your thoughts with us!
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting you back to the homepage...
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-4xl font-bold text-foreground mb-4">Share Your Feedback</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We value your opinion! Help us improve Trader&apos;s Journal by sharing your experience and suggestions.
          </p>
        </div>

        {/* Feedback Form */}
        <div className="bg-card rounded-2xl p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="feedbackType" className="block text-sm font-medium text-foreground mb-2">
                Feedback Type
              </label>
              <select
                id="feedbackType"
                name="feedbackType"
                value={formData.feedbackType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="general">General Feedback</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="improvement">Improvement Suggestion</option>
                <option value="praise">Praise/Compliment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= formData.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.rating === 0 && 'Please select a rating'}
                {formData.rating === 1 && 'Poor'}
                {formData.rating === 2 && 'Fair'}
                {formData.rating === 3 && 'Good'}
                {formData.rating === 4 && 'Very Good'}
                {formData.rating === 5 && 'Excellent'}
              </p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                Your Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Tell us about your experience with Trader&apos;s Journal, what you like, what could be improved, or any suggestions you have..."
              />
            </div>

            {submitStatus === 'error' && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-600">
                  {!formData.name.trim() || !formData.email.trim() || !formData.message.trim() || formData.rating === 0
                    ? 'Please fill out all required fields including the rating.'
                    : 'Something went wrong. Please try again.'}
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 