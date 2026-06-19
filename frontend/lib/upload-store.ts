import { create } from "zustand";

interface UploadStore {
  file: File | null;
  objectUrl: string | null;
  setFile: (file: File) => void;
  clear: () => void;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  file: null,
  objectUrl: null,
  setFile: (file: File) => {
    const prev = get().objectUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file, objectUrl: URL.createObjectURL(file) });
  },
  clear: () => {
    const prev = get().objectUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file: null, objectUrl: null });
  },
}));
