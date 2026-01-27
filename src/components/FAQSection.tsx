
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ContentCard } from "@/components/ContentCard";

const faqs = [
    {
        question: "What is ListenDrift?",
        answer: "ListenDrift helps you understand where your audience mentally checks out — not just how fast you speak. We analyze your audio to predict attention drops.",
    },
    {
        question: "Is this a pacing or filler-word tool?",
        answer: "No. ListenDrift focuses on attention and engagement patterns (like complexity and tone), not just speed or grammar.",
    },
    {
        question: "What happens when I upload audio?",
        answer: "Your audio is analyzed to detect moments where attention is likely to drop, along with clarity insights and specific improvement suggestions.",
    },
    {
        question: "Who is ListenDrift for?",
        answer: "Speakers, founders, educators, creators, and anyone who presents ideas out loud and wants to keep their audience engaged.",
    },
    {
        question: "Do I need to prepare anything before uploading?",
        answer: "No — just upload your audio file (MP3, WAV, M4A) and let ListenDrift do the rest.",
    },
];

export function FAQSection() {
    return (
        <section id="faq" className="py-20 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-h1 mb-4">Frequently asked questions</h2>
                    <p className="text-muted-foreground text-lg">
                        Everything you need to know about ListenDrift.
                    </p>
                </div>

                <ContentCard variant="default" className="p-8">
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border-b-border/50">
                                <AccordionTrigger className="text-lg font-medium text-left hover:text-primary transition-colors">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ContentCard>
            </div>
        </section>
    );
}
