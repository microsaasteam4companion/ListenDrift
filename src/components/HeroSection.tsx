import { Button } from "@/components/ui/button";
import { Upload, AlertTriangle, Lightbulb, BookOpen, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TimelineBarProps {
  segments: { risk: number; isHighlight?: boolean }[];
}

function MiniTimeline({ segments }: TimelineBarProps) {
  return (
    <div className="flex items-end gap-0.5 h-6">
      {segments.map((segment, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm transition-all duration-150",
            segment.isHighlight
              ? "bg-destructive"
              : segment.risk > 50
                ? "bg-orange/60"
                : "bg-primary/40"
          )}
          style={{ height: `${Math.max(20, segment.risk)}%` }}
        />
      ))}
    </div>
  );
}

// Visual-only card wrapper
function HeroCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out select-none",
        "hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.2)]",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function HeroSection() {
  const compactTimelineData = [
    { risk: 30 }, { risk: 35 }, { risk: 45 }, { risk: 55 },
    { risk: 75 }, { risk: 90, isHighlight: true }, { risk: 85, isHighlight: true },
    { risk: 60 }, { risk: 45 }
  ];

  return (
    <section className="relative pt-32 md:pt-48 pb-20 px-4 md:px-6 overflow-hidden">
      {/* Oversized Background Typography - THE ANCHOR */}
      <div
        className="absolute inset-0 flex items-start justify-center pt-24 md:pt-36 pointer-events-none select-none"
        aria-hidden="true"
      >
        <div className="text-center">
          <span
            className="block text-[14vw] md:text-[11vw] lg:text-[9vw] font-bold leading-[0.85] tracking-tight text-foreground/5 uppercase"
          >
            WHEN DO PEOPLE
          </span>
          <span
            className="block text-[14vw] md:text-[11vw] lg:text-[9vw] font-bold leading-[0.85] tracking-tight text-foreground/5 uppercase"
          >
            STOP LISTENING?
          </span>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">

        {/* Wrapper for Main Card + Side Cards (Anchors side cards to main card) */}
        <div className="relative mt-24 md:mt-32 w-full max-w-lg">

          {/* Micro Timeline Card - LEFT of Main Card */}
          <HeroCard
            className={cn(
              "absolute z-20",
              "top-1/2 -translate-y-1/2",
              "right-full mr-6",
              "bg-surface border border-border/50 rounded-xl p-3.5 w-44",
              "animate-fade-in",
              "hidden lg:block"
            )}
            delay={50}
          >
            <BookOpen className="w-3.5 h-3.5 text-pink mb-2" />
            <p className="text-[11px] font-medium leading-snug text-muted-foreground">
              "High jargon density detected"
            </p>
          </HeroCard>

          {/* Insight Card 1 - RIGHT of Main Card */}
          <HeroCard
            className={cn(
              "absolute z-20",
              "top-1/2 -translate-y-1/2",
              "left-full ml-6",
              "bg-surface border border-border/50 rounded-xl p-3.5 w-44",
              "animate-fade-in",
              "hidden lg:block"
            )}
            delay={100}
          >
            <Lightbulb className="w-3.5 h-3.5 text-orange mb-2" />
            <p className="text-[11px] font-medium leading-snug text-muted-foreground">
              "Long explanation without an example"
            </p>
          </HeroCard>

          {/* 1. Main Hero Card */}
          <HeroCard
            className={cn(
              "relative z-30",
              "bg-primary text-primary-foreground rounded-2xl p-8 md:p-10",
              "w-full text-center md:text-left",
              "animate-fade-in",
              "shadow-[0_0_60px_-12px_hsl(var(--primary)/0.3)]"
            )}
            delay={0}
          >
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-[1.1] mb-4">
              When do people stop listening to you?
            </h1>
            <p className="text-sm md:text-base opacity-90 leading-relaxed">
              Predict attention drop before it happens.
            </p>
          </HeroCard>
        </div>

        {/* 2. Drop Risk Detected Card - Spaced for calm */}
        <HeroCard
          className={cn(
            "relative z-30",
            "bg-surface border border-border/50 rounded-xl p-3.5 w-full max-w-[300px]",
            "mt-8 mb-6", // Increased breathing room
            "animate-fade-in"
          )}
          delay={150}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <span className="text-[9px] font-bold text-destructive uppercase tracking-wide">Drop risk detected</span>
          </div>
          <MiniTimeline segments={compactTimelineData} />
          <div className="flex justify-between mt-1.5 text-[8px] text-muted-foreground">
            <span>0:00</span>
            <span className="text-destructive font-bold">2:30</span>
            <span>5:00</span>
          </div>
        </HeroCard>

        {/* 3. CTA Row - Bottom */}
        <div className="flex flex-wrap justify-center gap-4 relative z-40">

          <Link to="/login">
            <Button variant="outline" size="xl" className="border-border bg-background hover:bg-secondary/50">
              <Upload className="w-5 h-5" />
              Upload Audio
            </Button>
          </Link>
        </div>



        {/* Mobile Supporting Cards - Just the distinct ones not covered by the main flow */}
        <div className="flex gap-3 mt-8 lg:hidden">
          <div className="bg-[#151515] border border-border/50 rounded-xl p-3 flex-1">
            <Lightbulb className="w-3.5 h-3.5 text-orange mb-1.5" />
            <p className="text-[10px] font-medium leading-snug text-muted-foreground">
              "Long explanation"
            </p>
          </div>
          <div className="bg-[#151515] border border-border/50 rounded-xl p-3 flex-1">
            <BookOpen className="w-3.5 h-3.5 text-pink mb-1.5" />
            <p className="text-[10px] font-medium leading-snug text-muted-foreground">
              "High jargon"
            </p>
          </div>
        </div>

      </div>
    </section >
  );
}

