import { ArrowLeft, Shield, Lock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navbar removed */}

            <main className="pt-12 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </button>

                    <div className="text-center mb-16">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Privacy Policy</h1>
                        <p className="text-xl text-muted-foreground">
                            We care about your data. Here's how we protect it.
                        </p>
                    </div>

                    <div className="grid gap-8">
                        <div className="bg-card border border-border rounded-2xl p-8">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-secondary rounded-xl">
                                    <Eye className="w-6 h-6 text-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">Data Collection</h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        We collect only the essential information needed to provide our services.
                                        This includes account details used for login and the audio files you upload for analysis.
                                        We do not sell your personal data to third parties.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-8">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-secondary rounded-xl">
                                    <Lock className="w-6 h-6 text-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">Data Security</h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Your data is encrypted in transit and at rest. We use industry-standard security measures
                                        to ensure your information remains private and secure. Audio files are processed securely
                                        and are only accessible by you.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-8">
                            <h2 className="text-xl font-bold mb-4">Contact Us</h2>
                            <p className="text-muted-foreground mb-4">
                                If you have any questions about our privacy practices, please contact us.
                            </p>
                            <a href="mailto:business@entrext.in" className="text-primary font-medium hover:underline text-lg">
                                business@entrext.in
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t border-border py-8 text-center text-muted-foreground text-sm">
                © 2026 ListenDrift. All rights reserved.
            </footer>
        </div>
    );
}
