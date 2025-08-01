'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface PerfSummaryCardProps {
  title: string;
  value: string;
  icon: string;
  variant?: "primary" | "secondary" | "accent";
  isLoading?: boolean;
  change?: {
    value: string;
    positive: boolean;
  };
  valueColor?: string;
  highlight?: boolean;
  cardHighlight?: boolean;
  iconWarning?: boolean;
}

const PerfSummaryCard = ({
  title,
  value,
  icon,
  variant = "primary",
  change,
  isLoading = false,
  valueColor,
  highlight = false,
  cardHighlight = false,
  iconWarning = false,
}: PerfSummaryCardProps) => {
  const getVariantClasses = (variant: string) => {
    const baseIconClasses = "text-2xl";
    // Modern, glassy/gradient circular icon background
    const baseContainerClasses =
      "flex-shrink-0 rounded-full p-3 flex items-center justify-center shadow-md border";
    if (iconWarning) {
      return {
        icon: cn(baseIconClasses, "text-red-600 animate-pulse"),
        container: cn(baseContainerClasses, "bg-gradient-to-br from-red-200 via-red-100 to-red-50 border-red-400 ring-2 ring-red-300 animate-pulse")
      };
    }
    switch (variant) {
      case "primary":
        return {
          icon: cn(baseIconClasses, "text-primary"),
          container: cn(baseContainerClasses, "bg-gradient-to-br from-white/80 via-gray-100/80 to-gray-200/80 border-gray-200 ring-2 ring-primary/20")
        };
      case "secondary":
        return {
          icon: cn(baseIconClasses, "text-secondary"),
          container: cn(baseContainerClasses, "bg-gradient-to-br from-white/80 via-gray-100/80 to-gray-200/80 border-gray-200 ring-2 ring-secondary/20")
        };
      case "accent":
        return {
          icon: cn(baseIconClasses, "text-accent"),
          container: cn(baseContainerClasses, "bg-gradient-to-br from-white/80 via-gray-100/80 to-gray-200/80 border-gray-200 ring-2 ring-accent/20")
        };
      default:
        return {
          icon: cn(baseIconClasses, "text-primary"),
          container: cn(baseContainerClasses, "bg-gradient-to-br from-white/80 via-gray-100/80 to-gray-200/80 border-gray-200 ring-2 ring-primary/20")
        };
    }
  };

  const variantClasses = getVariantClasses(variant);

  return (
    <Card
      className={cn(
        cardHighlight &&
          "bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200 border-2 border-yellow-400 shadow-xl animate-pulse",
        !cardHighlight && ""
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={variantClasses.container}>
            {/* Always render Lucide icon as an <i> with the correct className for consistency */}
            <i className={cn(icon, variantClasses.icon)}></i>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-muted-foreground truncate">{title}</dt>
              <dd className="flex items-baseline">
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div
                    className={cn(
                      "text-2xl font-semibold text-foreground",
                      valueColor,
                      highlight &&
                        "bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-50 text-yellow-900 px-3 py-1 rounded-lg shadow font-bold animate-pulse border border-yellow-300"
                    )}
                  >
                    {value}
                  </div>
                )}
                {change && !isLoading && (
                  <div className={cn(
                    "ml-2 flex items-baseline text-sm font-semibold",
                    change.positive ? "text-green-500" : "text-red-500"
                  )}>
                    {change.positive ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    )}
                    <span className="sr-only">{change.positive ? 'Increased by' : 'Decreased by'}</span>
                    {change.value}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerfSummaryCard;
