import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
    {
        name: "Starter",
        price: "Free",
        description: "Perfect for trying out the analysis.",
        features: [
            "1 Audio upload per month",
            "Basic attention timeline",
            "Jargon detection",
        ],
        cta: "Get Started",
        popular: false,
    },
    {
        name: "Pro",
        price: "$29",
        period: "/month",
        description: "ForAll serious speakers and creators.",
        features: [
            "Unlimited uploads",
            "Advanced engagement insights",
            "Detailed improvement suggestions",
            "Export PDF reports",
        ],
        cta: "Upgrade to Pro",
        popular: true,
    },
    {
        name: "Team",
        price: "$99",
        period: "/month",
        description: "For agencies and coaching teams.",
        features: [
            "Everything in Pro",
            "Team collaboration",
            "API Access",
            "Priority Support",
        ],
        cta: "Contact Sales",
        popular: false,
    },
];

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 px-6 bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Choose the plan that fits your speaking needs. No hidden fees.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={cn(
                                "relative flex flex-col p-8 rounded-2xl border bg-card transition-all duration-200 hover:shadow-lg",
                                plan.popular ? "border-primary shadow-md ring-1 ring-primary" : "border-border"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                                </div>
                            </div>

                            <div className="flex-1 mb-8">
                                <ul className="space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                                            <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button
                                variant={plan.popular ? "default" : "outline"}
                                className="w-full"
                                size="lg"
                            >
                                {plan.cta}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
