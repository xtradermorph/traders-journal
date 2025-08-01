'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, Quote } from 'lucide-react';

interface Feedback {
  id: string;
  name: string;
  message: string;
  rating: number;
  date: string;
  feedbackType: 'general' | 'praise' | 'bug';
}

// Mock feedback data - replace with actual data from your backend
const mockFeedback: Feedback[] = [
  {
    id: '1',
    name: 'Alex Thompson',
    message: 'Trader\'s Journal has completely transformed my trading approach. The AI insights are incredibly helpful and the social features keep me motivated.',
    rating: 5,
    date: '2024-01-15',
    feedbackType: 'praise'
  },
  {
    id: '2',
    name: 'Sarah Chen',
    message: 'Finally found a platform that combines journaling with real analytics. The performance tracking is spot-on and the community is amazing.',
    rating: 5,
    date: '2024-01-10',
    feedbackType: 'praise'
  },
  {
    id: '3',
    name: 'Mike Rodriguez',
    message: 'The AI analysis feature is a game-changer. It helps me identify patterns I never noticed before. Highly recommend for serious traders.',
    rating: 5,
    date: '2024-01-08',
    feedbackType: 'general'
  },
  {
    id: '4',
    name: 'Emma Wilson',
    message: 'Love how easy it is to record trades and get instant feedback. The mobile experience is seamless and the insights are valuable.',
    rating: 5,
    date: '2024-01-05',
    feedbackType: 'praise'
  },
  {
    id: '5',
    name: 'David Kim',
    message: 'Best trading journal I\'ve used. The social features help me learn from other traders and the analytics are comprehensive.',
    rating: 5,
    date: '2024-01-03',
    feedbackType: 'general'
  },
  {
    id: '6',
    name: 'Lisa Park',
    message: 'Found a bug in the mobile app where charts don\'t load properly on iOS. Otherwise, great platform!',
    rating: 4,
    date: '2024-01-02',
    feedbackType: 'bug'
  },
  {
    id: '7',
    name: 'John Smith',
    message: 'The platform is amazing! The AI insights have helped me improve my win rate significantly.',
    rating: 5,
    date: '2024-01-01',
    feedbackType: 'praise'
  }
];

export default function FeedbackCarousel() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0.003); // Slightly faster
  const [scrollDirection] = useState(1); // Always right
  const dragStartX = useRef<number | null>(null);
  const dragStartScroll = useRef<number>(0);
  const isDragging = useRef(false);

  // Filter feedback to only show general, praise, and bug report types
  const allowedFeedbackTypes: ('general' | 'praise' | 'bug')[] = ['general', 'praise', 'bug'];
  const filteredFeedback = mockFeedback.filter(feedback => 
    allowedFeedbackTypes.includes(feedback.feedbackType)
  ) || [];
  const duplicatedFeedback = [...filteredFeedback, ...filteredFeedback];

  // Continuous scroll animation
  useEffect(() => {
    if (isHovered || isDragging.current || !filteredFeedback.length) return;
    const animation = () => {
      setScrollPosition((prev) => {
        let newPosition = prev + (scrollSpeed * scrollDirection);
        if (newPosition >= filteredFeedback.length) {
          newPosition = 0;
        } else if (newPosition < 0) {
          newPosition = filteredFeedback.length - 1;
        }
        return newPosition;
      });
    };
    const interval = setInterval(animation, 40); // Smooth, slightly faster
    return () => clearInterval(interval);
  }, [isHovered, filteredFeedback.length, scrollSpeed, scrollDirection]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartScroll.current = scrollPosition;
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || dragStartX.current === null || !filteredFeedback.length) return;
    const deltaX = e.clientX - dragStartX.current;
    // Lower drag sensitivity for smoother scroll
    const dragSensitivity = 2.5; // Higher = slower drag
    const cardWidth = e.currentTarget.offsetWidth / filteredFeedback.length;
    setScrollPosition((prev) => {
      let newPos = dragStartScroll.current - deltaX / (cardWidth * dragSensitivity);
      if (newPos < 0) newPos = filteredFeedback.length + newPos;
      if (newPos >= filteredFeedback.length) newPos = newPos - filteredFeedback.length;
      return newPos;
    });
  };
  const handlePointerUp = () => {
    isDragging.current = false;
    dragStartX.current = null;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  // Don't render if no feedback is available
  if (!filteredFeedback.length) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          What Our Traders Say
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join thousands of traders who are already improving their performance with Trader's Journal
        </p>
      </div>
      <div
        className="relative select-none overflow-x-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(-${scrollPosition * 370}px)`, // 350px card + 20px gap
            transition: isDragging.current ? 'none' : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {duplicatedFeedback.map((feedback, index) => (
            <div
              key={`${feedback.id}-${index}`}
              className="flex-shrink-0 mx-4"
              style={{ width: 350 }}
            >
              <div className="bg-card rounded-2xl p-3 border border-border shadow-lg h-full flex flex-col justify-between">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Quote className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(feedback.rating)}
                    </div>
                    <p className="text-base text-muted-foreground mb-4 italic">
                      "{feedback.message}"
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {feedback.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(feedback.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Dots Indicator */}
      <div className="flex justify-center mt-8 space-x-2">
        {filteredFeedback.map((_, index) => (
          <button
            key={index}
            onClick={() => setScrollPosition(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              Math.floor(scrollPosition / 1) === index
                ? 'bg-primary'
                : 'bg-muted hover:bg-muted-foreground'
            }`}
          />
        ))}
      </div>
      {/* Call to Action section removed as requested */}
    </div>
  );
} 