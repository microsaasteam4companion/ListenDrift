import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelineSegment {
  time: string;
  risk: number; // 0-100
  label?: string;
}

interface TimelineBlockProps {
  segments: TimelineSegment[];
  criticalSection?: { start: string; end: string };
  className?: string;
}

function getRiskColor(risk: number): string {
  if (risk < 30) return "bg-mint";
  if (risk < 50) return "bg-primary";
  if (risk < 70) return "bg-orange";
  return "bg-destructive";
}

function getRiskLabel(risk: number): string {
  if (risk < 30) return "Low Risk";
  if (risk < 50) return "Medium Risk";
  if (risk < 70) return "High Risk";
  return "Critical";
}

function parseTime(timeStr: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.trim().split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return -1;
}

export function TimelineBlock({ segments, criticalSection, className }: TimelineBlockProps) {
  const criticalStart = criticalSection ? parseTime(criticalSection.start) : -1;
  const criticalEnd = criticalSection ? parseTime(criticalSection.end) : -1;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-1 h-32">
        {segments.map((segment, index) => {
          const segmentTime = parseTime(segment.time);
          const isCritical = criticalSection && criticalStart !== -1 && criticalEnd !== -1 && segmentTime >= criticalStart && segmentTime <= criticalEnd;

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex-1 rounded-t-md transition-all duration-300 cursor-pointer hover:opacity-80",
                    isCritical ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]" : getRiskColor(segment.risk),
                    "animate-timeline-block"
                  )}
                  style={{
                    height: `${Math.max(20, segment.risk)}%`,
                    animationDelay: `${index * 50}ms`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border">
                <div className="text-sm">
                  <p className="font-semibold">{segment.time}</p>
                  <p className="text-muted-foreground">{getRiskLabel(segment.risk)}: {segment.risk}%</p>
                  {segment.label && <p className="text-xs mt-1">{segment.label}</p>}
                  {isCritical && <p className="text-xs mt-1 font-bold text-destructive">Critical Section</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {/* specific labels for 0, 25%, 50%, 75%, 100% of the timeline */}
        <span>{segments[0]?.time || "0:00"}</span>
        <span>{segments[Math.floor(segments.length * 0.25)]?.time}</span>
        <span>{segments[Math.floor(segments.length * 0.5)]?.time}</span>
        <span>{segments[Math.floor(segments.length * 0.75)]?.time}</span>
        <span>{segments[segments.length - 1]?.time}</span>
      </div>
    </div >
  );
}
