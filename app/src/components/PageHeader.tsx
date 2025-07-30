"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  mainScrollRef?: React.RefObject<HTMLDivElement>;
  showBackButton?: boolean;
  onBackClick?: () => void;
  backUrl?: string;
}

const PageHeader = ({ title, description, mainScrollRef, showBackButton, onBackClick, backUrl }: PageHeaderProps) => {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Scroll handling for header visibility
  useEffect(() => {
    // Skip scroll handling if mainScrollRef is not provided
    if (!mainScrollRef) return;
    
    const handleScroll = () => {
      if (!mainScrollRef.current) return;

      const currentScrollY = mainScrollRef.current.scrollTop;
      const isScrollingDown = currentScrollY > lastScrollY;

      setIsHeaderVisible(!isScrollingDown || currentScrollY < 10);
      setLastScrollY(currentScrollY);
    };

    const scrollContainer = mainScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY, mainScrollRef]);

  return (
    <div
      className={`sticky top-0 z-50 w-full transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20"
              onClick={onBackClick}
              asChild={!onBackClick}
            >
              {onBackClick ? (
                <div className="flex items-center justify-center">
                  <div className="relative flex items-center justify-center rounded-full bg-orange-500/10 p-2.5">
                    <ArrowLeft className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="sr-only">Back</span>
                </div>
              ) : (
                <Link href={backUrl || "/dashboard"} className="flex items-center justify-center">
                  <div className="relative flex items-center justify-center rounded-full bg-orange-500/10 p-2.5">
                    <ArrowLeft className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="sr-only">Back</span>
                </Link>
              )}
            </Button>
            <div>
              <h1 className="text-2xl font-semibold gradient-heading">{title}</h1>
              {description && <p className="text-sm text-gray-500">{description}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PageHeader };
