import { create } from "zustand";

type NotificationPermissionState = NotificationPermission | "unsupported" | "loading";

interface NotificationStore {
  permission: NotificationPermissionState;
  isConfigured: boolean;
  isPrompting: boolean;
  requestPermission: (() => Promise<void>) | null;
  setPermission: (permission: NotificationPermissionState) => void;
  setConfigured: (value: boolean) => void;
  setPrompting: (value: boolean) => void;
  bindRequestPermission: (requestPermission: (() => Promise<void>) | null) => void;
  triggerPermissionRequest: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  permission: "loading",
  isConfigured: false,
  isPrompting: false,
  requestPermission: null,
  setPermission: (permission) => set({ permission }),
  setConfigured: (value) => set({ isConfigured: value }),
  setPrompting: (value) => set({ isPrompting: value }),
  bindRequestPermission: (requestPermission) => set({ requestPermission }),
  triggerPermissionRequest: async () => {
    const requestPermission = get().requestPermission;
    if (!requestPermission) {
      return;
    }

    await requestPermission();
  },
}));