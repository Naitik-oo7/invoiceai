"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { DuplicateWarningDialog } from "@/components/DuplicateWarningDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useUploadStore } from "@/lib/upload-store";
import type { DuplicateSummary, UploadResponse } from "@/types";

const PROGRESS_MESSAGES = [
  "Reading document...",
  "Detecting document type...",
  "Extracting fields with AI...",
  "Validating extracted data...",
];

export default function UploadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const setFile = useUploadStore((s) => s.setFile);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateSummary[]>([]);
  const [showDupDialog, setShowDupDialog] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  const handleFileSelect = (file: File) => setSelectedFile(file);

  const handleUpload = async () => {
    const token = (session as { accessToken?: string })?.accessToken;
    if (!selectedFile || !token) return;

    setUploading(true);
    setProgress(10);

    let msgIndex = 0;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 90));
      setMessage(PROGRESS_MESSAGES[msgIndex % PROGRESS_MESSAGES.length]);
      msgIndex++;
    }, 2000);

    try {
      const result = await api.uploadInvoice(selectedFile, token);
      clearInterval(interval);
      setProgress(100);
      setMessage("Complete!");

      if (result.duplicates.length > 0) {
        setDuplicates(result.duplicates);
        setUploadResult(result);
        setShowDupDialog(true);
      } else {
        setFile(selectedFile);
        router.push(`/review/${result.invoice.id}`);
      }
    } catch (err) {
      clearInterval(interval);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = () => {
    if (uploadResult && selectedFile) {
      setFile(selectedFile);
      router.push(`/review/${uploadResult.invoice.id}`);
    }
    setShowDupDialog(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="New extraction"
        title="Upload Invoice"
        description="Drop a PDF invoice and let InvoiceAI read, validate and score every field for you."
      />

      <UploadZone
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        disabled={uploading}
      />

      {uploading && (
        <div className="mt-5 space-y-2 rounded-lg border bg-card p-4 shadow-card">
          <Progress value={progress} className="h-2" />
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            {message}
          </p>
        </div>
      )}

      <Button
        size="lg"
        className="mt-5 w-full"
        disabled={!selectedFile || uploading}
        onClick={handleUpload}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Extract Invoice Data
      </Button>

      <DuplicateWarningDialog
        open={showDupDialog}
        duplicates={duplicates}
        onContinue={handleContinue}
        onCancel={() => setShowDupDialog(false)}
      />
    </div>
  );
}
