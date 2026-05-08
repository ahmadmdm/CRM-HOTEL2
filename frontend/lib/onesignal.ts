import type { User } from "@/types";

declare global {
  interface Window {
    OneSignal?: OneSignalInstance;
    OneSignalDeferred?: Array<(oneSignal: OneSignalInstance) => void>;
    __crmOneSignalInitializedAppId?: string;
    __crmOneSignalExternalId?: string | null;
  }
}

type OneSignalPermission = NotificationPermission | "unsupported";

interface OneSignalNotificationsApi {
  requestPermission: () => Promise<void>;
}

interface OneSignalUserApi {
  externalId?: string | null;
  PushSubscription?: {
    token?: string | null;
    optedIn?: boolean;
  };
  addTag: (key: string, value: string) => Promise<void>;
}

interface OneSignalInstance {
  init: (config: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: OneSignalNotificationsApi;
  User: OneSignalUserApi;
}

const ONESIGNAL_SCRIPT_SRC = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
const ONESIGNAL_WORKER_FILENAME = "OneSignalSDKWorker.js";
const ONESIGNAL_WORKER_ROOT_PATH = `/${ONESIGNAL_WORKER_FILENAME}`;

let scriptPromise: Promise<OneSignalInstance> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function getPermission(): OneSignalPermission {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function ensureServiceWorkerRegistration(): Promise<void> {
  if (!isBrowser() || !("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const existingRegistration = registrations.find((registration) => registration.scope === `${window.location.origin}/`);

  if (existingRegistration) {
    return;
  }

  await navigator.serviceWorker.register(ONESIGNAL_WORKER_ROOT_PATH, { scope: "/" });
}

async function loadScript(): Promise<OneSignalInstance> {
  if (!isBrowser()) {
    throw new Error("OneSignal can only load in the browser");
  }

  if (window.OneSignal) {
    return window.OneSignal;
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<OneSignalInstance>((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push((oneSignal) => resolve(oneSignal));

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${ONESIGNAL_SCRIPT_SRC}"]`);
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = ONESIGNAL_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load OneSignal SDK"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function withOneSignal<T>(callback: (oneSignal: OneSignalInstance) => Promise<T> | T): Promise<T> {
  if (!isBrowser()) {
    throw new Error("OneSignal can only run in the browser");
  }

  await loadScript();

  return new Promise<T>((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (oneSignal) => {
      try {
        resolve(await callback(oneSignal));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function initializeOneSignal(appId: string): Promise<OneSignalInstance | null> {
  if (!isBrowser() || !appId) {
    return null;
  }

  await ensureServiceWorkerRegistration();

  const oneSignal = await loadScript();
  if (window.__crmOneSignalInitializedAppId === appId) {
    return oneSignal;
  }

  try {
    await withOneSignal(async (sdk) => {
      await sdk.init({
        appId,
        path: "/",
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: ONESIGNAL_WORKER_FILENAME,
        allowLocalhostAsSecureOrigin: true,
        autoResubscribe: true,
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            enabled: false,
          },
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already initialized")) {
      throw error;
    }
  }

  window.__crmOneSignalInitializedAppId = appId;
  return oneSignal;
}

export async function syncOneSignalUser(appId: string, user: User | null): Promise<OneSignalPermission> {
  const oneSignal = await initializeOneSignal(appId);
  if (!oneSignal) {
    return getPermission();
  }

  if (!user) {
    await withOneSignal(async (sdk) => {
      await sdk.logout().catch(() => undefined);
    });
    window.__crmOneSignalExternalId = null;
    return getPermission();
  }

  await withOneSignal(async (sdk) => {
    const currentExternalId = sdk.User.externalId ?? window.__crmOneSignalExternalId ?? null;
    if (currentExternalId !== user.id) {
      let loginSucceeded = false;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await sdk.login(user.id);
          loginSucceeded = true;
          break;
        } catch {
          const subscriptionToken = sdk.User.PushSubscription?.token ?? null;
          const optedIn = sdk.User.PushSubscription?.optedIn ?? false;
          if (attempt === 2 || subscriptionToken || optedIn) {
            break;
          }

          await delay(300 * (attempt + 1));
        }
      }

      window.__crmOneSignalExternalId = loginSucceeded ? user.id : currentExternalId;
    } else {
      window.__crmOneSignalExternalId = currentExternalId;
    }

    await sdk.User.addTag("role", user.role);
    await sdk.User.addTag("language", document.documentElement.lang || "ar");
  });

  return getPermission();
}

export async function requestOneSignalPermission(appId: string): Promise<OneSignalPermission> {
  const oneSignal = await initializeOneSignal(appId);
  if (!oneSignal) {
    return getPermission();
  }

  await withOneSignal(async (sdk) => {
    await sdk.Notifications.requestPermission();
  });
  return getPermission();
}

export async function logoutOneSignalUser(appId?: string): Promise<void> {
  if (!isBrowser() || !appId) {
    return;
  }

  await initializeOneSignal(appId);
  await withOneSignal(async (sdk) => {
    await sdk.logout().catch(() => undefined);
  });
  window.__crmOneSignalExternalId = null;
}

export function getOneSignalPermissionState(): OneSignalPermission {
  return getPermission();
}