import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ShieldCheck, Sparkles, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import logo from "@/assets/listendrift-logo-new.png";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { is_pro: false }
                    }
                });
                if (error) throw error;
                toast.success('Sign up successful! Please check your email.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                toast.success('Logged in successfully!');
                navigate('/dashboard');
            }
        } catch (error: any) {
            console.error("Auth Error:", error);
            if (error.status === 429 || error.message?.includes('429')) {
                toast.error("Security: Too many requests", {
                    description: "Please wait a moment before trying again."
                });
            } else {
                toast.error(error.message || 'Authentication failed');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!supabase) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
                <div className="w-full max-w-md bg-slate-900/40 border border-red-500/20 backdrop-blur-2xl p-8 rounded-3xl text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Connection Lost</h2>
                    <p className="text-slate-400 mb-6 text-sm">Supabase credentials are missing from .env</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-[#030408] flex items-center justify-center p-4 relative overflow-hidden selection:bg-blue-500/30">
            {/* Animated Background Mesh */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
            </div>

            {/* Main Auth Container */}
            <div className="w-full max-w-[440px] relative z-10">
                {/* Logo & Branding */}
                <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="relative mb-4 group">
                        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <img src={logo} alt="ListenDrift" className="h-20 w-auto relative z-10 transition-transform active:scale-95 cursor-pointer" onClick={() => navigate('/')} />
                    </div>
                    <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase mb-1">ListenDrift</h1>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        AI Speaker Platform
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white/[0.03] border border-white/10 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-2">
                            {isSignUp ? "Create Account" : "Welcome Back"}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">
                            {isSignUp ? "Start analyzing your reach in minutes." : "Access your speech analytics dashboard."}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">Identity</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-14 bg-white/[0.02] border-white/5 text-white placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-blue-500/10 transition-all rounded-2xl px-5 text-base"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <Label htmlFor="password" title="At least 6 characters" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Security Key</Label>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-14 bg-white/[0.02] border-white/5 text-white placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-blue-500/10 transition-all rounded-2xl px-5 text-base"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 bg-white text-black hover:bg-slate-200 font-black text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-[0.97] shadow-lg shadow-white/5 group mt-4 overflow-hidden relative"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <span className="flex items-center justify-center w-full relative z-10 gap-2">
                                    {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                                    {isSignUp ? "Sign Up" : "Login"}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-xs group flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="font-medium">{isSignUp ? "Already registered?" : "New to ListenDrift?"}</span>
                            <span className="font-black text-blue-500 uppercase tracking-tighter border-b border-blue-500/20 group-hover:border-blue-500 transition-all pb-0.5">
                                {isSignUp ? "Sign In" : "Sign Up"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
