"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { summarizeEmployeeNotes } from "@/ai/flows/summarize-employee-notes-flow";

interface NoteSummarizerProps {
  notes: string;
  onSummarized: (summary: string) => void;
  disabled?: boolean;
}

export function NoteSummarizer({ notes, onSummarized, disabled }: NoteSummarizerProps) {
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!notes || loading) return;
    setLoading(true);
    try {
      const result = await summarizeEmployeeNotes({ notes });
      onSummarized(result.summary);
    } catch (error) {
      console.error("Summarization failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 hover:text-accent"
      onClick={handleSummarize}
      disabled={disabled || !notes || loading}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
      )}
      AI Summarize Notes
    </Button>
  );
}
