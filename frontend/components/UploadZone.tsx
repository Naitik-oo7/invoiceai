"use client";

import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, selectedFile, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors",
            isDragging ? "border-primary bg-accent" : "border-border hover:border-primary/40 hover:bg-muted/40",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <Upload className="h-6 w-6" />
          </span>
          <p className="mb-1.5 text-lg font-semibold text-brand-ink">
            Drop your PDF invoice here
          </p>
          <p className="mb-5 text-sm text-muted-foreground">
            or browse from your computer · max 10MB
          </p>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-brand active:scale-[0.98]">
            Select PDF
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleChange} disabled={disabled} />
          </label>
        </div>

        {selectedFile && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground tnum">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
