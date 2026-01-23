
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialIcons } from "@/components/SocialIcons";
import { toast } from "sonner";

export const NewsletterSection = () => {
    const [email, setEmail] = useState("");

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();

        // Trigger toast
        toast.success("Thanks for subscribing!");

        // Redirect after delay
        setTimeout(() => {
            window.open("https://linktr.ee/entrext.pro", "_blank");
        }, 1500);
    };

    return (
        <section className="w-full py-16 px-6 relative overflow-hidden">

            <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-8 animate-fade-in relative z-10">

                {/* Heading - Friendly, calm, community-driven */}
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    Stay in the loop & join the ListenDrift community
                </h2>

                {/* Interaction Area */}
                <div className="w-full max-w-md space-y-8">
                    {/* Subscription Form */}
                    <form
                        onSubmit={handleSubscribe}
                        className="flex flex-col sm:flex-row gap-3 w-full"
                    >
                        <Input
                            type="text"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 rounded-full px-6 bg-background/50 border-input focus-visible:ring-primary/20 transition-all"
                        />
                        <Button
                            type="submit"
                            size="lg" // "rounded-full" is usually not default in button, need to check or add it.
                            className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm w-full sm:w-auto shrink-0"
                        >
                            Subscribe
                        </Button>
                    </form>

                    {/* Social Icons Row */}
                    <div className="flex justify-center">
                        <SocialIcons />
                    </div>
                </div>

            </div>
        </section>
    );
};
