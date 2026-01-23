const API_BASE_URL = "http://localhost:8000/api";

export interface UploadResponse {
    job_id: string;
}

export interface StatusResponse {
    status: "queued" | "processing" | "done" | "failed";
    progress?: number;
}

export interface AnalysisResult {
    // Mapping to the expected backend response structure
    drop_risks: Array<{
        start: string;
        end: string;
        risk: string;
        description: string;
    }>;
    timeline: Array<{
        time: string;
        risk: number;
        label?: string;
    }>;
    summary: {
        drop_risk?: string;
        jargon_density?: string;
        filler_words?: string;
        stats?: { // In case it's nested
            dropRisk: string;
            jargonDensity: string;
            fillerWords: string;
        }
        suggestions?: Array<{
            title: string;
            description: string;
            type?: string;
        }>;
        insights?: any;
        problematic_section?: any;
    };
}

export const api = {
    upload: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data: UploadResponse = await response.json();
        return data.job_id;
    },

    getStatus: async (jobId: string): Promise<StatusResponse> => {
        const response = await fetch(`${API_BASE_URL}/status/${jobId}`);
        if (!response.ok) {
            throw new Error(`Status check failed: ${response.statusText}`);
        }
        return response.json();
    },

    getResult: async (jobId: string): Promise<AnalysisResult> => {
        const response = await fetch(`${API_BASE_URL}/result/${jobId}`);
        if (!response.ok) {
            throw new Error(`Result fetch failed: ${response.statusText}`);
        }
        return response.json();
    }
};
