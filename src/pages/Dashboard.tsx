
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
  LogOut,
  Lock,
  Crown,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import logo from "@/assets/listendrift-logo-new.png";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// --- Types & Default Data ---

type AnalysisState = "idle" | "uploading" | "analyzing" | "complete" | "error";

import { api, AudienceAnalysisResult } from "../services/api";


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

const ZERO_DATA: DashboardData = {
  timeline: [],
  criticalSection: { start: "0:00", end: "0:00", risk: "0%" },
  stats: { dropRisk: "0%", jargonDensity: "0", fillerWords: "0" },
  suggestions: [],
  problematicSection: {
    range: "N/A",
    title: "No analysis yet",
    description: "Upload an audio file to see analysis."
  },
  insights: {
    jargon: { title: "Jargon", desc: "0" },
    explanation: { title: "Explanation", desc: "0" },
    monotone: { title: "Monotone", desc: "0" },
    fillers: { title: "Fillers", desc: "0" },
  },
};

const SuggestionItem = ({ suggestion }: { suggestion: { icon: any; title: string; description: string } }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = suggestion.description.split('\n').filter(line => line.trim());

  return (
    <ContentCard
      variant="default"
      className="p-6 flex items-start gap-4 cursor-pointer hover:scale-[1.01] transition-all"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
        <suggestion.icon className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg mb-1">{suggestion.title}</h3>
        <div className="text-muted-foreground space-y-2">
          {isExpanded ? (
            lines.map((line, idx) => {
              if (line.startsWith('🎯') || line.startsWith('✅') || line.startsWith('💡')) {
                return <p key={idx} className="font-bold text-foreground mt-4 first:mt-0">{line}</p>;
              }
              return <p key={idx} className="whitespace-pre-wrap">{line}</p>;
            })
          ) : (
            <p className="line-clamp-1">{lines[0]}</p>
          )}
        </div>
      </div>
      <div className={cn("transition-transform duration-200", isExpanded && "rotate-180")}>
        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
    </ContentCard>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [state, setState] = useState<AnalysisState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<DashboardData>(ZERO_DATA);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audience analysis state
  const [selectedAudience, setSelectedAudience] = useState<string>("general");
  const [audienceAnalysis, setAudienceAnalysis] = useState<AudienceAnalysisResult | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);

  // Auth & Membership State
  const [isPro, setIsPro] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserEmail(session.user.email || null);

        // 1. Check user metadata (Fastest)
        let proStatus = session.user.user_metadata?.is_pro === true;

        // 2. Check profiles table (Reliable)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile?.role === 'pro') {
            proStatus = true;
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
        }

        setIsPro(proStatus);
      }
    };
    fetchSession();
  }, []);
  useEffect(() => {
    console.log("🔄 Timer effect running, isRecording:", isRecording);

    if (isRecording) {
      console.log("⏱️ Setting up timer interval...");

      // Clear any existing interval first
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      // Create new interval
      const intervalId = setInterval(() => {
        console.log("⏱️ TICK!");
        setRecordingTime(prev => {
          const next = prev + 1;
          console.log(`Timer: ${prev} -> ${next}`);
          return next;
        });
      }, 1000);

      recordingIntervalRef.current = intervalId;
      console.log("✅ Timer interval created:", intervalId);

    } else {
      console.log("⏹️ Clearing timer interval...");
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
        console.log("✅ Timer cleared");
      }
    }

    // Cleanup function
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        console.log("🧹 Timer cleanup");
      }
    };
  }, [isRecording]);



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
    setData(ZERO_DATA);
  };

  // Recording handlers
  const startRecording = async () => {
    try {
      // CLEAR PREVIOUS DATA immediately when recording starts
      setData(ZERO_DATA); // Or null, but keeping structure prevents crash
      setFile(null);
      setJobId(null);
      setState("idle");
      setError(null);
      setProgress(0);
      setAudienceAnalysis(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder with explicit MIME type if possible
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Convert to File object
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm'
        });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Clear interval
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        // Automatically upload and analyze
        // Force state updates to trigger processing UI
        console.log("Recording stopped. Starting upload process...");
        setFile(audioFile);
        setState("uploading");
        setError(null);
        setProgress(0);
        setRecordingTime(0);

        try {
          console.log("Uploading recorded audio...");
          const id = await api.upload(audioFile);
          console.log("Upload success, job id:", id);
          setJobId(id);
          setState("analyzing");
        } catch (err) {
          console.error("Upload failed", err);
          setError("Failed to upload recorded audio. Please try again.");
          setState("error");
        }
      };

      // Start recording with timeslice to collect audio chunks
      console.log("🔴 Starting MediaRecorder...");
      mediaRecorder.start(1000); // Collect data every 1 second
      console.log("✅ MediaRecorder started");

      console.log("Setting isRecording to true");
      setIsRecording(true);
      console.log("Setting recordingTime to 0");
      setRecordingTime(0);
      console.log("Recording state updated");

      // Start timer
      console.log("⏱️ Creating timer interval...");
      recordingIntervalRef.current = setInterval(() => {
        console.log("⏱️ TIMER TICK!");
        setRecordingTime(prev => {
          const newTime = prev + 1;
          console.log(`Timer: ${prev} -> ${newTime}`);
          return newTime;
        });
      }, 1000);
      console.log("✅ Timer interval created", recordingIntervalRef.current);

    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone. Please grant permission and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordClick = () => {
    if (isProcessing) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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

    // Poll immediately, then every 1 second
    poll();
    const intervalId = setInterval(poll, 1000);
    return () => clearInterval(intervalId);
  }, [jobId, state]);

  // Cleanup effect for recording
  useEffect(() => {
    return () => {
      // Stop recording if component unmounts
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      // Clear recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Fetch audience analysis when audience changes or analysis completes
  useEffect(() => {
    const fetchAudienceAnalysis = async () => {
      if (!jobId || state !== "complete") return;

      setAudienceLoading(true);
      try {
        const result = await api.getAudienceAnalysis(jobId, selectedAudience);
        console.log("Audience analysis result:", result);
        console.log("Structural insights:", result.structural_insights);
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="ListenDrift Logo" className="h-10 sm:h-14 w-auto object-contain" />
            <span className="text-lg sm:text-xl font-bold truncate max-w-[120px] sm:max-w-none">ListenDrift</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary p-2 sm:px-3 sm:py-2"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Home</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 p-2 sm:px-3 sm:py-2"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out successfully");
                navigate("/");
              }}
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-8 w-full overflow-x-hidden">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
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
                "p-6 transition-all cursor-pointer hover:scale-[1.02] relative",
                isRecording && "bg-destructive/20 border-destructive border-2"
              )}
              onClick={handleRecordClick}
            >
              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive rounded-full"></div>
                  <span className="text-xs font-bold text-destructive">REC</span>
                </div>
              )}

              <Mic className={cn(
                "w-8 h-8 mb-4 transition-all",
                isRecording && "text-destructive scale-125"
              )} />

              <h3 className="text-xl font-bold mb-2">
                {isRecording ? "🔴 Stop Recording" : "Record Audio"}
              </h3>

              <p className={cn(
                "text-sm opacity-80",
                isRecording && "text-destructive font-bold text-base opacity-100"
              )}>
                {isRecording
                  ? `⏱️ Recording: ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`
                  : "Click to start recording"
                }
              </p>

              {isRecording && (
                <div className="mt-4 text-xs text-muted-foreground">
                  Click again to stop and analyze
                </div>
              )}
            </ContentCard>

            <ContentCard
              variant="primary"
              className={cn(
                "p-6 transition-all cursor-pointer hover:scale-[1.02]"
              )}
              onClick={() => {
                // Reset state for new analysis
                setFile(null);
                setJobId(null);
                setState("idle");
                setError(null);
                setProgress(0);
                setData(ZERO_DATA);
              }}
            >
              <Play className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-bold mb-2">Start New Analysis</h3>
              <p className="text-sm opacity-80">Reset and analyze new audio</p>
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
                    style={{ width: `${progress}%` }}
                  />
                  {/* Indeterminate shimmer for analyzing state */}
                  {state === "analyzing" && progress < 100 && (
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {progress}% {state === "analyzing" && "- Analyzing..."}
                </p>
              </div>
            </div>
          )}

          {/* Results Section (Hidden while processing) */}
          {!isProcessing && !error && (
            <div className="animate-fade-in">
              {/* Audience-Based Analysis Section */}
              {audienceAnalysis && !isProcessing && !error && (
                <div className="mb-8 space-y-6">
                  {/* Audience Selection */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold">Target Audience Analysis</h3>
                    </div>

                    <div className="flex gap-2 p-2 overflow-x-auto no-scrollbar mask-fade-right sm:flex-wrap">
                      {[
                        { key: "general", label: "General", isFree: true },
                        { key: "students", label: "Students", isFree: false },
                        { key: "professionals", label: "Professionals", isFree: false },
                        { key: "interviews", label: "Interviews", isFree: false },
                        { key: "marketing", label: "Marketing / Sales", isFree: false },
                      ].map((audience) => (
                        <div key={audience.key} className="relative group flex-shrink-0">
                          <Button
                            variant={selectedAudience === audience.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (audience.isFree || isPro) {
                                setSelectedAudience(audience.key);
                              } else {
                                navigate("/#pricing");
                                toast.info("Pro Feature", {
                                  description: "Redirecting you to our plans..."
                                });
                              }
                            }}
                            disabled={audienceLoading}
                            className={cn(
                              "transition-all whitespace-nowrap",
                              (!audience.isFree && !isPro) ? "pr-7" : "",
                              selectedAudience === audience.key && "ring-2 ring-primary ring-offset-2",
                              !audience.isFree && !isPro && "opacity-80"
                            )}
                          >
                            {audience.label}
                            {!audience.isFree && !isPro && (
                              <Lock className="w-3 h-3 absolute right-2 text-amber-500" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>

                    {!isPro && selectedAudience !== "general" && (
                      <div className="mt-6 bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center animate-in slide-in-from-top-4 duration-300">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                          <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                        </div>
                        <h4 className="font-bold text-base sm:text-lg mb-1">Pro Feature: {selectedAudience.charAt(0).toUpperCase() + selectedAudience.slice(1)} Analysis</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                          You are currently viewing General Analysis. Upgrade to Pro to see how your speech specifically resonates with {selectedAudience}!
                        </p>
                        <Button
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 shadow-lg shadow-amber-500/20 w-full sm:w-auto"
                          onClick={() => navigate("/#pricing")}
                        >
                          Upgrade to Pro 🚀
                        </Button>
                      </div>
                    )}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                        {audienceAnalysis.mismatches?.length > 0 ? (
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
                        {audienceAnalysis.suggestions?.length > 0 ? (
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
                          {audienceAnalysis.structural_insights && Object.keys(audienceAnalysis.structural_insights).length > 0 ? (
                            Object.entries(audienceAnalysis.structural_insights).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground capitalize">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="font-semibold text-sm">
                                  {typeof value === "number" ? value.toFixed(1) : value}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Loading structural insights...</p>
                          )}
                        </div>
                      </ContentCard>
                    </div>
                  )}
                </div>
              )}

              {/* Critical Alert */}
              <ContentCard variant="alert" className="p-6 mb-8 flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg mb-1">⚠️ Critical Moment Detected</h3>
                  <p className="text-muted-foreground">
                    At <span className="text-foreground font-semibold">{data.criticalSection.start} – {data.criticalSection.end}</span>, your audience is{" "}
                    <span className="text-destructive font-semibold">{data.criticalSection.risk}</span> likely to completely lose attention. This is the WORST moment in your speech.
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
                    <ContentCard variant="default" className="lg:col-span-2 p-4 sm:p-6">
                      <h3 className="text-xl font-bold mb-6">Attention Risk Timeline</h3>
                      <TimelineBlock segments={data.timeline} criticalSection={data.criticalSection} />
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
                  <ContentCard variant="default" className="p-4 sm:p-6 mt-6">
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
                      <SuggestionItem key={index} suggestion={suggestion} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Export */}
              <div className="flex flex-col items-center sm:items-end gap-3 mt-12 border-t border-border pt-8">
                {!isPro && (
                  <div className="flex items-center gap-2 text-sm text-amber-500 font-medium">
                    <Sparkles className="w-4 h-4" />
                    Exporting reports is a Pro feature
                  </div>
                )}

                <Button
                  size="lg"
                  disabled={!jobId && isPro}
                  className={cn(
                    "gap-2 w-full sm:w-auto",
                    !isPro && "border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                  )}
                  onClick={async () => {
                    if (!isPro) {
                      navigate("/#pricing");
                      return;
                    }
                    if (!jobId) return;

                    try {
                      // Download PDF report from backend with current audience selection
                      const downloadUrl = selectedAudience
                        ? `http://localhost:8000/api/download-report/${jobId}?audience=${selectedAudience}`
                        : `http://localhost:8000/api/download-report/${jobId}`;

                      const response = await fetch(downloadUrl);

                      if (!response.ok) {
                        throw new Error('Failed to generate PDF report');
                      }

                      // Get the PDF blob
                      const blob = await response.blob();

                      // Create download link
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `speech-analysis-report-${file?.name || "report"}.pdf`;
                      document.body.appendChild(a);
                      a.click();

                      // Cleanup
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Error downloading PDF:', error);
                      alert('Failed to download PDF report. Please try again.');
                    }
                  }}
                >
                  {isPro ? <Download className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  {isPro ? "Download Detailed Report (PDF)" : "Unlock PDF Export"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

