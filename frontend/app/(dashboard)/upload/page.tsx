"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UploadZone } from "@/components/UploadZone";
import { DuplicateWarningDialog } from "@/components/DuplicateWarningDialog";
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
      <h1 className="mb-6 text-2xl font-bold">Upload Invoice</h1>

      <UploadZone
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        disabled={uploading}
      />

      {uploading && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground text-center">{message}</p>
        </div>
      )}

      <Button
        className="mt-4 w-full"
        disabled={!selectedFile || uploading}
        onClick={handleUpload}
      >
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
