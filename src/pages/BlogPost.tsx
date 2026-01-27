import { Navbar } from "@/components/Navbar";
import { BLOG_POSTS } from "@/data/blogs";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Share2, Facebook, Twitter, Linkedin, ArrowRight, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/ContentCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logo from "@/assets/listendrift-logo-new.png";
import { SocialIcons } from "@/components/SocialIcons";
import { useEffect } from "react";

const BlogPost = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const post = BLOG_POSTS.find(p => p.slug === slug);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    if (!post) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
                    <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
                </div>
            </div>
        );
    }

    const relatedPosts = BLOG_POSTS.filter(p => post.relatedSlugs.includes(p.slug)).slice(0, 3);

    return (
        <div className="min-h-screen bg-background">
            <div className="absolute top-6 left-6 z-50">
                <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border text-sm font-medium hover:bg-accent transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>

            <main className="pt-20 pb-20 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Back Link - redundant if we have the button, but keeping it as Breadcrumb style pointing to blog index or home */}
                    <Link to="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Knowledge Base
                    </Link>

                    {/* Post Header */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 text-xs font-bold text-primary uppercase tracking-widest mb-4">
                            <span className="px-3 py-1 bg-primary/10 rounded-full">{post.category}</span>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                {post.date}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] mb-6">
                            {post.title}
                        </h1>
                        <p className="text-xl text-muted-foreground font-medium leading-relaxed italic border-l-4 border-primary/20 pl-6">
                            {post.description}
                        </p>
                    </div>

                    {/* Featured Image */}
                    <div className="rounded-[2.5rem] overflow-hidden aspect-[16/9] mb-12 shadow-2xl">
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Article Content */}
                    <div className="prose prose-slate dark:prose-invert max-w-none mb-20 px-2 sm:px-0">
                        {post.content.split('\n\n').map((paragraph, idx) => (
                            <p key={idx} className="text-lg leading-relaxed text-slate-400 mb-6">
                                {paragraph}
                            </p>
                        ))}

                        <div className="mt-12 bg-card/30 border border-border p-8 rounded-3xl">
                            <h3 className="text-xl font-bold mb-4">Why this matters for your next talk:</h3>
                            <p className="text-muted-foreground italic">
                                By applying these insights, you can move away from guessing how your audience feels. AI-powered attention forecasting allows you to strategically place stories, pauses, and key takeaways exactly where they will have the most impact.
                            </p>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    {post.faqs.length > 0 && (
                        <div className="mb-20">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <MessageCircleQuestion className="w-6 h-6 text-orange-500" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight">Common Questions</h2>
                            </div>
                            <ContentCard className="p-4 sm:p-8 bg-card/20 backdrop-blur-sm border-border">
                                <Accordion type="single" collapsible className="w-full">
                                    {post.faqs.map((faq, idx) => (
                                        <AccordionItem key={idx} value={`faq-${idx}`} className="border-b-border/50">
                                            <AccordionTrigger className="text-lg font-bold hover:text-primary transition-colors text-left py-6">
                                                {faq.question}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                                                {faq.answer}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </ContentCard>
                        </div>
                    )}

                    {/* Related Hub Section */}
                    <div className="border-t border-border pt-20">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-2xl font-black tracking-tight uppercase">Related Articles</h2>
                            <Link to="/blog" className="text-primary text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all">
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedPosts.map(p => (
                                <Link key={p.id} to={`/blog/${p.slug}`} className="group">
                                    <ContentCard className="h-full flex flex-col p-0 border-border/50 hover:border-primary/20 transition-all bg-card/10 overflow-hidden">
                                        <div className="aspect-video w-full overflow-hidden">
                                            <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <h4 className="font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">{p.title}</h4>
                                            <div className="mt-auto text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-1">
                                                Read More <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </ContentCard>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Same Footer as Index */}
            <footer className="bg-muted/30 border-t border-border">
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-3 mb-4">
                                <img src={logo} alt="ListenDrift Logo" className="h-6 w-auto object-contain" />
                                <span className="font-bold text-foreground">ListenDrift</span>
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Predict attention drop before it happens. Elevate your speaking impact with AI-powered forecasting.
                            </p>
                            <div className="mt-8">
                                <SocialIcons className="justify-start gap-4" iconClassName="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-widest text-[10px]">Product</h4>
                            <ul className="space-y-3">
                                <li><Link to="/#features" className="text-muted-foreground text-sm hover:text-primary transition-colors">Features</Link></li>
                                <li><Link to="/#pricing" className="text-muted-foreground text-sm hover:text-primary transition-colors">Pricing</Link></li>
                                <li><Link to="/blog" className="text-primary text-sm font-bold">Blog</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-widest text-[10px]">Legal</h4>
                            <ul className="space-y-3">
                                <li><Link to="/privacy" className="text-muted-foreground text-sm hover:text-primary transition-colors">Privacy Policy</Link></li>
                                <li><Link to="/terms" className="text-muted-foreground text-sm hover:text-primary transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="border-t border-border py-6 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-widest">© 2026 ListenDrift. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default BlogPost;
