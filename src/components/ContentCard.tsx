import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type CardVariant = "default" | "primary" | "orange" | "pink" | "mint" | "teal" | "alert";

interface ContentCardProps {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
  hover?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-card text-card-foreground",
  primary: "bg-primary text-primary-foreground",
  orange: "bg-orange text-orange-foreground",
  pink: "bg-pink text-pink-foreground",
  mint: "bg-mint text-mint-foreground",
  teal: "bg-teal text-teal-foreground",
  alert: "bg-destructive/20 text-foreground border border-destructive/50",
};

export function ContentCard({
  variant = "default",
  className,
  children,
  hover = true,
  onClick,
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6",
        variantStyles[variant],
        hover && "card-hover cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
