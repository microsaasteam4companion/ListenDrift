import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type TileVariant = "orange" | "pink" | "mint" | "teal" | "primary";

interface InsightTileProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  variant?: TileVariant;
  className?: string;
}

const variantStyles: Record<TileVariant, string> = {
  orange: "bg-orange text-orange-foreground",
  pink: "bg-pink text-pink-foreground",
  mint: "bg-mint text-mint-foreground",
  teal: "bg-teal text-teal-foreground",
  primary: "bg-primary text-primary-foreground",
};

export function InsightTile({
  icon: Icon,
  title,
  value,
  variant = "primary",
  className,
}: InsightTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 card-hover",
        variantStyles[variant],
        className
      )}
    >
      <Icon className="w-6 h-6 mb-3" />
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
