import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
import { BLOG_POSTS } from "@/data/blogs";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Tag, ArrowLeft } from "lucide-react";
import logo from "@/assets/listendrift-logo-new.png";
import { SocialIcons } from "@/components/SocialIcons";

const BlogIndex = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="absolute top-6 left-6 z-50">
                <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border text-sm font-medium hover:bg-accent transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>

            <main className="flex-1 pt-20 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                            <Tag className="w-3 h-3" />
                            Knowledge Base
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
                            Master the Art of <span className="text-primary italic">Attention</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Explore our latest insights on speech analytics, cognitive load, and how to keep any audience hooked from start to finish.
                        </p>
                    </div>

                    {/* Blog Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {BLOG_POSTS.map((post, idx) => (
                            <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                                <ContentCard className="h-full flex flex-col p-0 overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300">
                                    <div className="aspect-[16/9] overflow-hidden relative">
                                        <img
                                            src={post.image}
                                            alt={post.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />

                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {post.date}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                            {post.title}
                                        </h3>
                                        <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                                            {post.description}
                                        </p>
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-tighter group-hover:gap-3 transition-all">
                                            Read Content
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </ContentCard>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>

            {/* Reusable Footer Section */}
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

export default BlogIndex;
