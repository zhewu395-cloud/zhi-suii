import { useEffect, useState } from "react";
import { activateCode, readVipState, type VipState } from "@/lib/activation";

// 占位购买链接 —— 后续替换为正式链接
const BUY_WEEK_URL = "";
const BUY_LIFETIME_URL = "";

function formatExpire(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ActivationGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VipState | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setState(readVipState());
  }, []);

  if (state === null) {
    return <div className="h-[100dvh] w-full bg-[oklch(0.94_0.03_145)]" />;
  }

  const unlocked = state.kind === "lifetime" || state.kind === "week";
  if (unlocked) return <>{children}</>;

  const expiredHint = state.kind === "expired";

  const onVerify = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const res = await activateCode(code);
    setBusy(false);
    if (res.ok) {
      setMsg("✓ 激活成功");
      setTimeout(() => setState(res.state), 400);
    } else {
      setMsg("✗ " + res.error);
    }
  };

  const openBuy = (url: string) => {
    if (!url) {
      setMsg("购买链接尚未配置");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{
        backgroundImage:
          "linear-gradient(160deg, oklch(0.96 0.025 145) 0%, oklch(0.90 0.045 145) 55%, oklch(0.84 0.055 145) 100%)",
      }}
    >
      <div
        className="w-full max-w-[400px] rounded-3xl px-7 py-9 text-center"
        style={{
          backgroundColor: "oklch(0.985 0.012 145 / 0.92)",
          boxShadow: "0 24px 60px -24px oklch(0.45 0.08 145 / 0.45)",
          border: "1px solid oklch(0.85 0.04 145 / 0.55)",
        }}
      >
        <div className="text-[28px] tracking-[0.25em] font-semibold text-[oklch(0.36_0.10_145)]">
          织 岁
        </div>
        <div className="mt-2 text-sm text-[oklch(0.40_0.06_145)]/80">
          {expiredHint
            ? "您的 7 天体验已到期，请购买 19.9 元终身版解锁全部功能"
            : "请输入激活码解锁《织岁》全功能"}
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="请输入激活码"
          className="mt-6 w-full rounded-2xl border bg-white/80 px-4 py-3 text-center text-base tracking-widest outline-none focus:ring-2"
          style={{
            borderColor: "oklch(0.80 0.05 145 / 0.7)",
          }}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />

        <button
          onClick={onVerify}
          disabled={busy}
          className="mt-4 w-full rounded-2xl py-3 text-base font-medium text-white shadow active:scale-[0.98] transition disabled:opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(135deg, oklch(0.58 0.10 145), oklch(0.45 0.12 145))",
          }}
        >
          {busy ? "验证中…" : "验证"}
        </button>

        {msg && (
          <div className="mt-3 text-sm text-[oklch(0.38_0.10_145)]">{msg}</div>
        )}

        <div className="mt-7 grid grid-cols-1 gap-3">
          <button
            onClick={() => openBuy(BUY_WEEK_URL)}
            className="rounded-2xl border px-4 py-3 text-sm text-[oklch(0.36_0.10_145)] bg-white/70 active:scale-[0.98] transition"
            style={{ borderColor: "oklch(0.80 0.05 145 / 0.7)" }}
          >
            购买 3 元一星期体验卡
          </button>
          <button
            onClick={() => openBuy(BUY_LIFETIME_URL)}
            className="rounded-2xl px-4 py-3 text-sm font-medium text-white active:scale-[0.98] transition"
            style={{
              backgroundImage:
                "linear-gradient(135deg, oklch(0.50 0.11 145), oklch(0.38 0.12 145))",
            }}
          >
            购买 19.9 元终身买断卡
          </button>
        </div>

        <div className="mt-6 text-[11px] leading-relaxed text-[oklch(0.45_0.04_145)]/75">
          您的日记 / 待办 / 时间线 / 复盘等所有数据
          <br />
          100% 仅保存在本机，云端不留任何隐私痕迹
        </div>
      </div>
    </div>
  );
}
