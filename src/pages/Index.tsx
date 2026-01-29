import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { HeroSection } from "@/components/HeroSection";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Zap, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";
import brainIllustration from "@/assets/brain-illustration.png";
import microphoneIllustration from "@/assets/microphone-illustration.png";
import chartIllustration from "@/assets/chart-illustration.png";
import { FAQSection } from "@/components/FAQSection";
import { NewsletterSection } from "@/components/NewsletterSection";
import { SocialIcons } from "@/components/SocialIcons";
import logo from "@/assets/listendrift-logo-new.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section - Card Collage */}
      <HeroSection />

      {/* Newsletter Section */}
      <NewsletterSection />

      {/* Problem Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-h1 mb-12 text-center">The problem with speaking tools</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <ContentCard variant="pink" className="p-8">
              <Users className="w-10 h-10 mb-4" />
              <h3 className="text-2xl font-bold mb-3">People stop listening</h3>
              <p className="opacity-80">
                65% of audiences mentally disengage within the first 10 minutes of any presentation.
              </p>
            </ContentCard>

            <ContentCard variant="mint" className="p-8">
              <Zap className="w-10 h-10 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Pacing tools won't tell you when</h3>
              <p className="opacity-80">
                Traditional tools analyze speed and grammar, not cognitive engagement patterns.
              </p>
            </ContentCard>

            <ContentCard variant="primary" className="p-8">
              <Target className="w-10 h-10 mb-4" />
              <h3 className="text-2xl font-bold mb-3">This predicts the drop</h3>
              <p className="opacity-80">
                Our AI identifies jargon density, monotone sections, and complexity that kills attention.
              </p>
            </ContentCard>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-h1 mb-12 text-center">How it works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <ContentCard variant="orange" className="p-8 relative overflow-hidden">
              <span className="text-6xl font-bold opacity-20 absolute top-4 right-6">1</span>
              <img src={microphoneIllustration} alt="Microphone" className="w-24 h-24 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Upload or record</h3>
              <p className="opacity-80">
                Drop an audio file or record directly. We support all major formats.
              </p>
            </ContentCard>

            <ContentCard variant="teal" className="p-8 relative overflow-hidden">
              <span className="text-6xl font-bold opacity-20 absolute top-4 right-6">2</span>
              <img src={brainIllustration} alt="Brain" className="w-24 h-24 mb-6" />
              <h3 className="text-2xl font-bold mb-3">AI analyzes structure</h3>
              <p className="opacity-80">
                Our model detects jargon, monotone sections, and complexity patterns.
              </p>
            </ContentCard>

            <ContentCard variant="pink" className="p-8 relative overflow-hidden">
              <span className="text-6xl font-bold opacity-20 absolute top-4 right-6">3</span>
              <img src={chartIllustration} alt="Chart" className="w-24 h-24 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Get your timeline</h3>
              <p className="opacity-80">
                See exactly when attention drops with actionable improvement suggestions.
              </p>
            </ContentCard>
          </div>
        </div>
      </section>

      {/* Why Different */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <ContentCard variant="primary" className="p-12 text-center">
            <h2 className="text-display mb-6">
              "At 2:30, your audience mentally checks out."
            </h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto mb-8">
              Most tools tell you that you speak too fast. We tell you exactly when people stop caring — and why.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Confidence before presenting</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Actionable insights</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Real-time predictions</span>
              </div>
            </div>
          </ContentCard>
        </div>
      </section>

      {/* Testimonial Carousel */}
      <TestimonialCarousel />

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Premium Footer - Black + Blue */}
      {/* Premium Footer - Light Mode */}
      <footer className="bg-muted/30 border-t border-border">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="ListenDrift Logo" className="h-12 w-auto object-contain" />
                <span className="font-bold text-foreground">ListenDrift</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Predict attention drop before it happens.
              </p>

              <div className="mt-8">
                <span className="text-xs font-semibold text-foreground/80 mb-4 block">Community</span>
                <SocialIcons className="justify-start gap-4" iconClassName="w-5 h-5" />
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    Why it works
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link to="/blog" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/privacy" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-xs">
              © 2026 ListenDrift. All rights reserved.
            </p>
            <p className="text-muted-foreground/60 text-xs">
              Built for speakers, creators, and educators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
