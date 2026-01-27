import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (!supabase) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-8 text-center">
                <div className="max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-4">Connection Required</h1>
                    <p className="text-slate-400 mb-6">
                        Please check your <code className="bg-slate-800 px-2 py-1 rounded">.env</code> file.
                        The Supabase URL and Anon Key are missing or incorrect.
                    </p>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-left font-mono text-sm text-blue-400">
                        VITE_SUPABASE_URL=...<br />
                        VITE_SUPABASE_ANON_KEY=...
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};
