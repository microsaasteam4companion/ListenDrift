import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Kim",
    role: "Keynote Speaker",
    quote: "This helped me understand exactly where attention dropped — without guessing.",
    avatar: "SK",
  },
  {
    id: "2",
    name: "Marcus Rodriguez",
    role: "Podcast Host",
    quote: "I restructured my intros after seeing the attention data. Retention jumped significantly.",
    avatar: "MR",
  },
  {
    id: "3",
    name: "Dr. Anna Liu",
    role: "University Professor",
    quote: "Student engagement improved after I optimized my lecture structure using this tool.",
    avatar: "AL",
  },
  {
    id: "4",
    name: "James Chen",
    role: "Startup Founder",
    quote: "Investors stopped zoning out during my pitch. Closed our Series A two weeks later.",
    avatar: "JC",
  },
  {
    id: "5",
    name: "Emily Foster",
    role: "Sales Director",
    quote: "Our pitch close rate improved after we identified and fixed the attention drop points.",
    avatar: "EF",
  },
  {
    id: "6",
    name: "David Park",
    role: "Corporate Trainer",
    quote: "Training completion rates doubled once I knew which modules lost people.",
    avatar: "DP",
  },
  {
    id: "7",
    name: "Rachel Green",
    role: "Content Creator",
    quote: "Watch time on my videos increased. Now I know exactly when to hook viewers back in.",
    avatar: "RG",
  },
  {
    id: "8",
    name: "Michael Torres",
    role: "Executive Coach",
    quote: "My clients present with more confidence knowing they've fixed weak spots in advance.",
    avatar: "MT",
  },
];

interface TestimonialCardProps {
  testimonial: Testimonial;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

function TestimonialCard({ testimonial, isHovered, onHover, onLeave }: TestimonialCardProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-[320px] md:w-[380px] rounded-2xl p-6 transition-all duration-300 ease-out cursor-grab active:cursor-grabbing select-none",
        "bg-[#181818] border border-[#2a2a2a]",
        isHovered && "scale-[1.02] -translate-y-1"
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Avatar and Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center font-semibold text-sm text-muted-foreground grayscale">
          {testimonial.avatar}
        </div>
        <div>
          <p className="font-semibold text-white">{testimonial.name}</p>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>

      {/* Quote */}
      <p className={cn(
        "text-sm leading-relaxed text-muted-foreground transition-all duration-300",
        isHovered ? "text-white" : "line-clamp-2"
      )}>
        "{testimonial.quote}"
      </p>
    </div>
  );
}

interface InfiniteRowProps {
  items: Testimonial[];
  direction: "left" | "right";
  isPaused: boolean;
  onCardHover: (id: string | null) => void;
  hoveredId: string | null;
}

function InfiniteRow({ items, direction, isPaused, onCardHover, hoveredId }: InfiniteRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const animationRef = useRef<number>();
  const positionRef = useRef(0);
  const velocityRef = useRef(direction === "left" ? 0.4 : -0.4);

  // Triple the items for seamless loop
  const tripleItems = [...items, ...items, ...items];

  const animate = useCallback(() => {
    if (!scrollRef.current || isPaused || isDragging) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const scrollWidth = scrollRef.current.scrollWidth / 3;
    positionRef.current += velocityRef.current;

    // Reset position for seamless loop
    if (direction === "left" && positionRef.current >= scrollWidth) {
      positionRef.current = 0;
    } else if (direction === "right" && positionRef.current <= 0) {
      positionRef.current = scrollWidth;
    }

    scrollRef.current.style.transform = `translateX(-${positionRef.current}px)`;
    animationRef.current = requestAnimationFrame(animate);
  }, [isPaused, isDragging, direction]);

  useEffect(() => {
    // Initialize position for right-moving row
    if (direction === "right" && scrollRef.current) {
      const scrollWidth = scrollRef.current.scrollWidth / 3;
      positionRef.current = scrollWidth;
    }

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, direction]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX);
    setScrollLeft(positionRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (startX - x) * 1.5;
    positionRef.current = scrollLeft + walk;
    if (scrollRef.current) {
      scrollRef.current.style.transform = `translateX(-${positionRef.current}px)`;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX);
    setScrollLeft(positionRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX;
    const walk = (startX - x) * 1.5;
    positionRef.current = scrollLeft + walk;
    if (scrollRef.current) {
      scrollRef.current.style.transform = `translateX(-${positionRef.current}px)`;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={scrollRef}
        className="flex gap-5 will-change-transform"
        style={{ width: 'max-content' }}
      >
        {tripleItems.map((testimonial, index) => (
          <TestimonialCard
            key={`${testimonial.id}-${index}`}
            testimonial={testimonial}
            isHovered={hoveredId === `${testimonial.id}-${index}`}
            onHover={() => onCardHover(`${testimonial.id}-${index}`)}
            onLeave={() => onCardHover(null)}
          />
        ))}
      </div>
    </div>
  );
}

export function TestimonialCarousel() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const firstRow = testimonials.slice(0, 4);
  const secondRow = testimonials.slice(4);

  const handleCardHover = (id: string | null) => {
    setHoveredId(id);
    setIsPaused(id !== null);
  };

  return (
    <section className="py-20 px-6 overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-foreground">
          Trusted by speakers, creators, and educators
        </h2>
      </div>

      <div className="space-y-5">
        {/* First Row - Left to Right */}
        <InfiniteRow
          items={firstRow}
          direction="left"
          isPaused={isPaused}
          onCardHover={handleCardHover}
          hoveredId={hoveredId}
        />

        {/* Second Row - Right to Left */}
        <InfiniteRow
          items={secondRow}
          direction="right"
          isPaused={isPaused}
          onCardHover={handleCardHover}
          hoveredId={hoveredId}
        />
      </div>
    </section>
  );
}
