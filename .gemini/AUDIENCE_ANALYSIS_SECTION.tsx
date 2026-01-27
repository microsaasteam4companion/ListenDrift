// Audience Analysis Section Component
// This code should be inserted into Dashboard.tsx

// 1. Add this useEffect after the cleanup useEffect (around line 479):

useEffect(() => {
    const fetchAudienceAnalysis = async () => {
        if (!jobId || state !== "complete") return;

        setAudienceLoading(true);
        try {
            const result = await api.getAudienceAnalysis(jobId, selectedAudience);
            setAudienceAnalysis(result);
        } catch (err) {
            console.error("Failed to fetch audience analysis:", err);
            setAudienceAnalysis(null);
        } finally {
            setAudienceLoading(false);
        }
    };

    fetchAudienceAnalysis();
}, [selectedAudience, jobId, state]);

// 2. Add this JSX BEFORE the "Critical Moment Detected" section (before line 657):

{/* Audience-Based Analysis Section */ }
{
    audienceAnalysis && !isProcessing && !error && (
        <div className="mb-8 space-y-6 animate-fade-in">
            {/* Audience Selection */}
            <div>
                <h3 className="text-lg font-semibold mb-3">Target Audience</h3>
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: "students", label: "Students" },
                        { key: "professionals", label: "Professionals" },
                        { key: "interviews", label: "Interviews" },
                        { key: "marketing", label: "Marketing / Sales" },
                        { key: "general", label: "General Audience" },
                    ].map((audience) => (
                        <Button
                            key={audience.key}
                            variant={selectedAudience === audience.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedAudience(audience.key)}
                            disabled={audienceLoading}
                            className={cn(
                                "transition-all",
                                selectedAudience === audience.key && "ring-2 ring-primary ring-offset-2"
                            )}
                        >
                            {audience.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {audienceLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Analyzing for {selectedAudience}...</span>
                </div>
            )}

            {/* Analysis Cards */}
            {!audienceLoading && audienceAnalysis && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Card 1: Audience Fit Score */}
                    <ContentCard variant="default" className="p-6">
                        <h4 className="font-bold text-lg mb-4">Audience Fit Score</h4>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Target Audience</p>
                                <p className="font-semibold capitalize">{audienceAnalysis.audience}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Fit Score</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-500",
                                                audienceAnalysis.fit_score >= 70 ? "bg-green-500" :
                                                    audienceAnalysis.fit_score >= 50 ? "bg-yellow-500" :
                                                        "bg-red-500"
                                            )}
                                            style={{ width: `${audienceAnalysis.fit_score}%` }}
                                        />
                                    </div>
                                    <span className="font-bold text-2xl">{audienceAnalysis.fit_score}</span>
                                </div>
                            </div>
                        </div>
                    </ContentCard>

                    {/* Card 2: Audience Mismatches */}
                    <ContentCard variant="default" className="p-6">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Audience Mismatches
                        </h4>
                        {audienceAnalysis.mismatches.length > 0 ? (
                            <ul className="space-y-2">
                                {audienceAnalysis.mismatches.map((mismatch, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-orange-500 mt-0.5">•</span>
                                        <span className="text-muted-foreground">{mismatch}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No significant mismatches detected.</p>
                        )}
                    </ContentCard>

                    {/* Card 3: Improvement Suggestions */}
                    <ContentCard variant="default" className="p-6">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-primary" />
                            Improvement Suggestions
                        </h4>
                        {audienceAnalysis.suggestions.length > 0 ? (
                            <ul className="space-y-2">
                                {audienceAnalysis.suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">Great job! No specific suggestions at this time.</p>
                        )}
                    </ContentCard>

                    {/* Card 4: Structural Insights */}
                    <ContentCard variant="default" className="p-6">
                        <h4 className="font-bold text-lg mb-4">Structural Insights</h4>
                        <div className="space-y-3">
                            {Object.entries(audienceAnalysis.structural_insights).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground capitalize">
                                        {key.replace(/_/g, " ")}
                                    </span>
                                    <span className="font-semibold text-sm">
                                        {typeof value === "number" ? value.toFixed(1) : value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ContentCard>
                </div>
            )}
        </div>
    )
}
