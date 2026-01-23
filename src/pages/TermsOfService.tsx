import { ArrowLeft, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
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
                            <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Terms of Service</h1>
                        <p className="text-xl text-muted-foreground">
                            Simple rules for using our platform.
                        </p>
                    </div>

                    <div className="grid gap-8">
                        <div className="bg-card border border-border rounded-2xl p-8">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-mint" />
                                Usage License
                            </h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                By accessing this website, you are agreeing to be bound by these terms of service and agree that
                                you are responsible for compliance with any applicable local laws.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                <li>Permission is granted to temporarily download copies of the materials.</li>
                                <li>This is the grant of a license, not a transfer of title.</li>
                                <li>You may not modify or copy the materials for commercial purpose.</li>
                            </ul>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-8">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-orange" />
                                Disclaimer
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                The materials on ListenDrift's website are provided on an 'as is' basis. ListenDrift makes no warranties,
                                expressed or implied, and hereby disclaims and negates all other warranties including, without limitation,
                                implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement
                                of intellectual property or other violation of rights.
                            </p>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-8">
                            <h2 className="text-xl font-bold mb-4">Questions?</h2>
                            <p className="text-muted-foreground mb-4">
                                If you have any questions about our Terms of Service, please reach out to us.
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
