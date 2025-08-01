import * as React from "react"
import { cn } from "@/lib/utils"

interface EnhancedSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const EnhancedSwitch = React.forwardRef<HTMLButtonElement, EnhancedSwitchProps>(
  ({ checked, onCheckedChange, disabled = false, className, ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        ref={ref}
        className={cn(
          "peer inline-flex h-6 w-20 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 relative",
          checked 
            ? "bg-primary shadow-sm" 
            : "bg-muted border-border shadow-inner",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          onCheckedChange(!checked);
        }}
        data-state={checked ? "checked" : "unchecked"}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform z-10",
            checked 
              ? "translate-x-14 bg-white shadow-md" 
              : "translate-x-0 bg-white shadow-sm"
          )}
          data-state={checked ? "checked" : "unchecked"}
        />
        {/* Status indicator - only show when off */}
        {!checked && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground pointer-events-none">
            OFF
          </span>
        )}
      </button>
    )
  }
)
EnhancedSwitch.displayName = "EnhancedSwitch"

export { EnhancedSwitch } 