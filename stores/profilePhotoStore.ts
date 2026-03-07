import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ProfilePhotoState {
  photos: Record<string, string>; // userId → signed photoUrl
  setPhotos: (entries: Record<string, string>) => void;
  getPhoto: (userId: string) => string | null;
}

export const useProfilePhotoStore = create<ProfilePhotoState>()(
  persist(
    (set, get) => ({
      photos: {},
      setPhotos: (entries) =>
        set((state) => ({ photos: { ...state.photos, ...entries } })),
      getPhoto: (userId) => get().photos[userId] ?? null,
    }),
    {
      name: "hrms-profile-photos",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage
      ),
    }
  )
);
