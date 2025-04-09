import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useState } from "react";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors duration-200 shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        bronze: "bg-amber-700 text-amber-50",
        silver: "bg-slate-400 text-slate-50",
        gold: "bg-amber-400 text-amber-950",
        diamond: "bg-gradient-to-r from-blue-400 to-purple-500 text-white",
      },
      size: {
        default: "h-10 w-10 text-xs",
        sm: "h-8 w-8 text-xs",
        lg: "h-16 w-16 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AchievementBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon: React.ReactNode;
  label: string;
  description: string;
  progress?: {
    current: number;
    total: number;
  };
}

export function AchievementBadge({
  className,
  variant,
  size,
  icon,
  label,
  description,
  progress,
  ...props
}: AchievementBadgeProps) {
  return (
    <div 
      className="relative inline-flex flex-col items-center gap-1"
      {...props}
    >
      <div 
        className={cn(badgeVariants({ variant, size, className }))}
      >
        {icon}
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
      
      {progress && (
        <div className="w-full max-w-[60px] mt-1">
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}