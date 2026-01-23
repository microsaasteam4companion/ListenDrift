
import { useState, useRef, useEffect } from "react";
import { ContentCard } from "@/components/ContentCard";
import { TimelineBlock } from "@/components/TimelineBlock";
import { InsightTile } from "@/components/InsightTile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Mic,
  Play,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  Volume2,
  Hash,
  Download,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileAudio,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import logo from "@/assets/listendrift-logo-new.png";

// --- Types & Default Data ---

type AnalysisState = "idle" | "uploading" | "analyzing" | "complete" | "error";

import { api } from "../services/api";


interface DashboardData {
  timeline: { time: string; risk: number; label?: string }[];
  criticalSection: { start: string; end: string; risk: string };
  stats: {
    dropRisk: string;
    jargonDensity: string;
    fillerWords: string;
  };
  suggestions: { icon: any; title: string; description: string }[];
  problematicSection: {
    range: string;
    title: string;
    description: React.ReactNode;
  };
  insights: {
    jargon: { title: string; desc: string };
    explanation: { title: string; desc: string };
    monotone: { title: string; desc: string };
    fillers: { title: string; desc: string };
  };
}

const DEMO_DATA: DashboardData = {
  timeline: [
    { time: "0:00", risk: 15 },
    { time: "0:15", risk: 18 },
    { time: "0:30", risk: 22 },
    { time: "0:45", risk: 25 },
    { time: "1:00", risk: 30 },
    { time: "1:15", risk: 28 },
    { time: "1:30", risk: 35 },
    { time: "1:45", risk: 42 },
    { time: "2:00", risk: 55 },
    { time: "2:15", risk: 68 },
    { time: "2:30", risk: 85, label: "Critical drop detected" },
    { time: "2:45", risk: 78 },
    { time: "3:00", risk: 72 },
    { time: "3:15", risk: 58 },
    { time: "3:30", risk: 45 },
    { time: "3:45", risk: 38 },
    { time: "4:00", risk: 32 },
  ],
  criticalSection: { start: "2:30", end: "3:00", risk: "65%" },
  stats: { dropRisk: "65%", jargonDensity: "High", fillerWords: "12" },
  suggestions: [
    {
      icon: Lightbulb,
      title: "Simplify the concept",
      description: "Break down the technical explanation at 2:30 into smaller, digestible pieces.",
    },
    {
      icon: MessageSquare,
      title: "Add a relatable example",
      description: "Insert a real-world analogy to make the abstract concept more concrete.",
    },
    {
      icon: Volume2,
      title: "Pause and re-engage",
      description: "Add a brief pause or question to recapture attention before the dense section.",
    },
  ],
  problematicSection: {
    range: "2:30 – 3:00",
    title: "Problematic Section",
    description: (
      <>
        Dense, technical language with <strong>no clear examples</strong>. This section uses multiple industry-specific terms without explanation, causing cognitive overload.
      </>
    ),
  },
  insights: {
    jargon: { title: "Complex Jargon Detected", desc: "8 technical terms used without explanation in 30 seconds." },
    explanation: { title: "Long Explanation", desc: "45-second continuous explanation without audience engagement." },
    monotone: { title: "Monotone Section", desc: "Pitch variation dropped 60% during technical explanation." },
    fillers: { title: "Filler Word Frequency", desc: "'Um' and 'like' used 12 times, highest density at 2:30." },
  },
};

const ANALYZED_DATA: DashboardData = {
  timeline: [
    { time: "0:00", risk: 10 },
    { time: "0:30", risk: 15 },
    { time: "1:00", risk: 45 },
    { time: "1:30", risk: 82, label: "Engagement lost" },
    { time: "2:00", risk: 70 },
    { time: "2:30", risk: 55 },
    { time: "3:00", risk: 40 },
    { time: "3:30", risk: 25 },
    { time: "4:00", risk: 20 },
    { time: "4:30", risk: 15 },
    { time: "5:00", risk: 30 },
  ],
  criticalSection: { start: "1:30", end: "2:00", risk: "82%" },
  stats: { dropRisk: "82%", jargonDensity: "Medium", fillerWords: "4" },
  suggestions: [
    {
      icon: Volume2,
      title: "Vary your tone",
      description: "The section at 1:30 is very monotone. Try adding emphasis to key words.",
    },
    {
      icon: MessageSquare,
      title: "Faster pacing needed",
      description: "You slowed down significantly at 1:45, causing engagement to drift.",
    },
    {
      icon: Lightbulb,
      title: "Stronger hook",
      description: "Consider opening this segment with a question to re-engage listeners.",
    },
  ],
  problematicSection: {
    range: "1:30 - 2:00",
    title: "Monotone Delivery",
    description: (
      <>
        Your vocal variety dropped significantly here. <strong>Combined with slow pacing</strong>, this caused a major dip in audience attention.
      </>
    ),
  },
  insights: {
    jargon: { title: "Good Clarity", desc: "Low jargon usage detected. Your language is accessible." },
    explanation: { title: "Pacing Issue", desc: "Speaking rate dropped below 110 wpm for 40 seconds." },
    monotone: { title: "Flat Delivery", desc: "Pitch variation near zero at 1:30." },
    fillers: { title: "Clean Speech", desc: "Very few filler words detected. Great job!" },
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [state, setState] = useState<AnalysisState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<DashboardData>(DEMO_DATA);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);


  // Actions
  const handleUploadClick = () => {
    if (state === "uploading" || state === "analyzing") return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File picker change event detected");
    const selectedFile = e.target.files?.[0];

    // Reset input so the same file can be selected again if needed
    e.target.value = "";

    if (selectedFile) {
      console.log("File selected:", selectedFile.name);

      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit check
        setError("File size too large (max 50MB)");
        return;
      }
      setFile(selectedFile);
      setState("uploading");
      setError(null);
      setProgress(0);

      try {
        console.log("Starting upload...");
        const id = await api.upload(selectedFile);
        console.log("Upload success, job id:", id);
        setJobId(id);
        setState("analyzing");
      } catch (err) {
        console.error("Upload failed", err);
        setError("Failed to upload audio file. Please ensure the backend is running.");
        setState("error");
      }
    } else {
      console.log("No file selected (user cancelled?)");
    }
  };

  const handleRetry = () => {
    setFile(null);
    setJobId(null);
    setState("idle");
    setError(null);
  };

  // Polling Effect
  useEffect(() => {
    if (!jobId || state === "complete" || state === "error" || state === "idle") return;

    const poll = async () => {
      try {
        const statusRes = await api.getStatus(jobId);
        console.log("Poll status:", statusRes);

        if (statusRes.status === "failed") {
          setError("Analysis failed on server.");
          setState("error");
          return;
        }

        // Update progress if available (assuming 0.0 - 1.0 or 0-100)
        if (typeof statusRes.progress === "number") {
          // Normalize to 0-100
          const p = statusRes.progress <= 1 ? statusRes.progress * 100 : statusRes.progress;
          setProgress(Math.floor(p));
        }

        if (statusRes.status === "done") {
          const result = await api.getResult(jobId);
          console.log("Analysis result:", result);

          // Map result to DashboardData
          // We intentionally map fields loosely to prevent crashes if backend schema differs slightly
          const mappedData: DashboardData = {
            timeline: result.timeline?.map((t: any) => ({
              time: t.time || "0:00",
              risk: t.risk || 0,
              label: t.label
            })) || [],
            criticalSection: {
              start: result.drop_risks?.[0]?.start || "0:00",
              end: result.drop_risks?.[0]?.end || "0:00",
              risk: result.drop_risks?.[0]?.risk || "0%"
            },
            stats: {
              dropRisk: result.summary?.drop_risk || result.summary?.stats?.dropRisk || "N/A",
              jargonDensity: result.summary?.jargon_density || result.summary?.stats?.jargonDensity || "N/A",
              fillerWords: result.summary?.filler_words || result.summary?.stats?.fillerWords || "0"
            },
            // Use honest fallbacks if backend omits specific fields
            suggestions: result.summary?.suggestions?.map((s: any) => ({
              icon: Lightbulb,
              title: s.title || "Suggestion",
              description: s.description || ""
            })) || [],

            problematicSection: {
              range: result.summary?.problematic_section?.range || "N/A",
              title: result.summary?.problematic_section?.title || "No critical section detected",
              description: result.summary?.problematic_section?.description || "Your speech flow looks good."
            },
            insights: {
              jargon: result.summary?.insights?.jargon || { title: "Jargon", desc: "No data available" },
              explanation: result.summary?.insights?.explanation || { title: "Explanation", desc: "No data available" },
              monotone: result.summary?.insights?.monotone || { title: "Monotone", desc: "No data available" },
              fillers: result.summary?.insights?.fillers || { title: "Fillers", desc: "No data available" },
            }
          };

          setData(mappedData);
          setState("complete");
        }
      } catch (e) {
        console.error("Polling error", e);
        // Don't fail immediately on network glitch, wait for next poll
      }
    };

    const intervalId = setInterval(poll, 2000);
    return () => clearInterval(intervalId);
  }, [jobId, state]);


  const isProcessing = state === "uploading" || state === "analyzing";

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="audio/*,.mp3,.wav,.m4a"
        onChange={handleFileChange}
      />

      {/* Dashboard Navbar / Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ListenDrift Logo" className="h-8 w-auto object-contain" />
            <span className="text-xl font-bold">ListenDrift</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="p-8 w-full">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-h1 mb-2">
              {state === "complete" && file ? `Analysis: ${file.name}` : "Attention Analysis"}
            </h1>
            <p className="text-muted-foreground">
              {state === "complete" ? "Here is the breakdown of your uploaded file." : "Find out where your audience checks out"}
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <ContentCard
              variant="orange"
              className={cn(
                "p-6 transition-all",
                isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"
              )}
              onClick={handleUploadClick}
            >
              <Upload className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-bold mb-2">Upload Audio</h3>
              <p className="text-sm opacity-80">Drop MP3, WAV, or M4A files</p>
            </ContentCard>

            <ContentCard
              variant="teal"
              className={cn(
                "p-6 transition-all",
                isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"
              )}
            // Record is non-functional per instructions
            >
              <Mic className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-bold mb-2">Record Audio</h3>
              <p className="text-sm opacity-80">Coming soon</p>
            </ContentCard>

            <ContentCard
              variant="primary"
              className={cn(
                "p-6 transition-all",
                isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"
              )}
            >
              <Play className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-bold mb-2">View Demo</h3>
              <p className="text-sm opacity-80">See a sample analysis</p>
            </ContentCard>
          </div>

          {/* Processing / Error UI */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-destructive" />
                <div>
                  <h3 className="font-bold text-destructive">Upload Failed</h3>
                  <p className="text-sm text-foreground/80">{error}</p>
                </div>
              </div>
              <Button onClick={handleRetry} variant="outline" size="sm">Retry</Button>
            </div>
          )}

          {isProcessing && (
            <div className="bg-card border border-border rounded-xl p-12 mb-8 text-center animate-fade-in">
              <div className="max-w-md mx-auto">
                <div className="flex justify-center mb-6">
                  {state === "uploading" ? (
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                      <FileAudio className="w-8 h-8 text-primary" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-2">
                  {state === "uploading" ? "Uploading audio..." : "Analyzing attention patterns..."}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {state === "uploading" ? file?.name : "Our AI is detecting jargon, pacing, and tone..."}
                </p>

                {/* Progress Bar */}
                <div className="bg-secondary rounded-full h-2 w-full overflow-hidden relative">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{ width: `${state === 'uploading' ? progress : 100}%` }}
                  />
                  {/* Indeterminate shimmer for analyzing state */}
                  {state === "analyzing" && (
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {state === "uploading" ? `${progress}%` : "Processing..."}
                </p>
              </div>
            </div>
          )}

          {/* Results Section (Hidden while processing) */}
          {!isProcessing && !error && (
            <div className="animate-fade-in">
              {/* Critical Alert */}
              <ContentCard variant="alert" className="p-6 mb-8 flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Critical Moment Detected</h3>
                  <p className="text-muted-foreground">
                    At <span className="text-foreground font-semibold">{data.criticalSection.start} – {data.criticalSection.end}</span>,{" "}
                    <span className="text-destructive font-semibold">{data.criticalSection.risk}</span> of your audience is likely to lose focus.
                  </p>
                </div>
              </ContentCard>

              {/* Main Analysis Tabs */}
              <Tabs defaultValue="overview" className="mb-8">
                <TabsList className="bg-card border border-border mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Timeline */}
                    <ContentCard variant="default" className="lg:col-span-2 p-6">
                      <h3 className="text-xl font-bold mb-6">Attention Risk Timeline</h3>
                      <TimelineBlock segments={data.timeline} />
                      <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-mint" />
                          <span>Low Risk</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-primary" />
                          <span>Medium</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-orange" />
                          <span>High</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-destructive" />
                          <span>Critical</span>
                        </div>
                      </div>
                    </ContentCard>

                    {/* Stats */}
                    <div className="space-y-4">
                      <InsightTile
                        icon={AlertTriangle}
                        title="Drop Risk"
                        value={data.stats.dropRisk}
                        variant="orange"
                      />
                      <InsightTile
                        icon={BookOpen}
                        title="Jargon Density"
                        value={data.stats.jargonDensity}
                        variant="pink"
                      />
                      <InsightTile
                        icon={Hash}
                        title="Filler Words"
                        value={data.stats.fillerWords}
                        variant="teal"
                      />
                    </div>
                  </div>

                  {/* Problematic Section */}
                  <ContentCard variant="default" className="p-6 mt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge variant="destructive">{data.problematicSection.range}</Badge>
                      <span className="text-muted-foreground">Problematic Section</span>
                    </div>
                    <p className="text-lg">
                      {data.problematicSection.description}
                    </p>
                  </ContentCard>
                </TabsContent>

                <TabsContent value="insights">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <ContentCard variant="orange" className="p-6">
                      <BookOpen className="w-8 h-8 mb-4" />
                      <h3 className="font-bold mb-2">{data.insights.jargon.title}</h3>
                      <p className="text-sm opacity-80">
                        {data.insights.jargon.desc}
                      </p>
                    </ContentCard>

                    <ContentCard variant="pink" className="p-6">
                      <MessageSquare className="w-8 h-8 mb-4" />
                      <h3 className="font-bold mb-2">{data.insights.explanation.title}</h3>
                      <p className="text-sm opacity-80">
                        {data.insights.explanation.desc}
                      </p>
                    </ContentCard>

                    <ContentCard variant="teal" className="p-6">
                      <Volume2 className="w-8 h-8 mb-4" />
                      <h3 className="font-bold mb-2">{data.insights.monotone.title}</h3>
                      <p className="text-sm opacity-80">
                        {data.insights.monotone.desc}
                      </p>
                    </ContentCard>

                    <ContentCard variant="mint" className="p-6">
                      <Hash className="w-8 h-8 mb-4" />
                      <h3 className="font-bold mb-2">{data.insights.fillers.title}</h3>
                      <p className="text-sm opacity-80">
                        {data.insights.fillers.desc}
                      </p>
                    </ContentCard>
                  </div>
                </TabsContent>

                <TabsContent value="suggestions">
                  <div className="space-y-4">
                    {data.suggestions.map((suggestion, index) => (
                      <ContentCard key={index} variant="default" className="p-6 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                          <suggestion.icon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{suggestion.title}</h3>
                          <p className="text-muted-foreground">{suggestion.description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </ContentCard>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Export */}
              <div className="flex justify-end">
                <Button size="lg">
                  <Download className="w-5 h-5" />
                  Download Report
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

