// 云端激活码门禁 —— 仅用于校验，不存任何用户隐私数据
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LS_STATUS = "vip_status"; // 'lifetime' | 'week'
const LS_EXPIRE = "vip_expire_time"; // ISO string，仅 week 有
const LS_CODE = "vip_code";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let _client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export type VipState =
  | { kind: "lifetime" }
  | { kind: "week"; expireAt: number }
  | { kind: "expired" }
  | { kind: "none" };

export function readVipState(): VipState {
  if (typeof window === "undefined") return { kind: "none" };
  const status = localStorage.getItem(LS_STATUS);
  if (status === "lifetime") return { kind: "lifetime" };
  if (status === "week") {
    const exp = localStorage.getItem(LS_EXPIRE);
    const t = exp ? Date.parse(exp) : 0;
    if (!t) return { kind: "none" };
    if (Date.now() > t) return { kind: "expired" };
    return { kind: "week", expireAt: t };
  }
  return { kind: "none" };
}

export function clearVip() {
  localStorage.removeItem(LS_STATUS);
  localStorage.removeItem(LS_EXPIRE);
  localStorage.removeItem(LS_CODE);
}

export async function activateCode(
  rawCode: string,
): Promise<{ ok: true; state: VipState } | { ok: false; error: string }> {
  const code = rawCode.trim();
  if (!code) return { ok: false, error: "请输入激活码" };
  const sb = getSupabase();
  if (!sb)
    return {
      ok: false,
      error: "未配置云端数据库，请先在 Netlify 设置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY",
    };

  const { data, error } = await sb
    .from("active_cards")
    .select("code,type,is_used,activated_at")
    .eq("code", code)
    .maybeSingle();

  if (error) return { ok: false, error: "网络异常，请稍后再试" };
  if (!data) return { ok: false, error: "该激活码无效或已被他人使用！" };
  if (data.is_used) return { ok: false, error: "该激活码无效或已被他人使用！" };

  const type = String(data.type || "").toUpperCase();
  const nowIso = new Date().toISOString();

  const { error: upErr } = await sb
    .from("active_cards")
    .update({ is_used: true, activated_at: nowIso })
    .eq("code", code)
    .eq("is_used", false); // 防并发抢用
  if (upErr) return { ok: false, error: "激活失败，请稍后再试" };

  localStorage.setItem(LS_CODE, code);
  if (type === "LIFETIME") {
    localStorage.setItem(LS_STATUS, "lifetime");
    localStorage.removeItem(LS_EXPIRE);
    return { ok: true, state: { kind: "lifetime" } };
  }
  if (type === "WEEK") {
    const expireAt = Date.now() + WEEK_MS;
    localStorage.setItem(LS_STATUS, "week");
    localStorage.setItem(LS_EXPIRE, new Date(expireAt).toISOString());
    return { ok: true, state: { kind: "week", expireAt } };
  }
  return { ok: false, error: "未知的激活码类型" };
}
