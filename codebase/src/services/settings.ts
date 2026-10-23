import pb from "../lib/pocketbase";
import { SETTINGS_ID } from "../lib/permissions";
import type { SiteSettings } from "../lib/types";

export const getSettings = () =>
  pb.collection("site_settings").getOne<SiteSettings>(SETTINGS_ID, { requestKey: null });

export const updateSettings = (data: Partial<SiteSettings> | FormData) =>
  pb.collection("site_settings").update<SiteSettings>(SETTINGS_ID, data);

export interface SystemInfo {
  appName: string;
  appURL: string;
  senderAddress: string;
  smtpEnabled: boolean;
  serverTime: string;
  counts: Record<string, number>;
}

export const getSystemInfo = () => pb.send<SystemInfo>("/api/lms/system", { requestKey: null });

/** Deployment-specific configuration stored in server settings (no secrets returned). */
export interface ServerConfig {
  appURL: string;
  senderName: string;
  senderAddress: string;
  smtpEnabled: boolean;
  smtpHost: string;
}

export const getServerConfig = () => pb.send<ServerConfig>("/api/lms/config", { requestKey: null });
export const saveServerConfig = (body: Pick<ServerConfig, "appURL" | "senderName" | "senderAddress">) =>
  pb.send<ServerConfig>("/api/lms/config", { method: "POST", body });
export const sendTestEmail = () => pb.send<{ sentTo: string }>("/api/lms/config/test-email", { method: "POST" });

export interface SelfTestResult {
  ok: boolean;
  passed: number;
  total: number;
  durationMs: number;
  results: { group: string; step: string; ok: boolean; detail: string }[];
}

export const runSelfTest = () => pb.send<SelfTestResult>("/api/lms/selftest", { method: "POST", requestKey: null });
