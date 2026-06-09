// Global app store — the wiring that makes the two features a closed loop.
// Holds navigation, OT-approval state, pinned dashboards, and toasts so that
// actions in the chat (approve, pin) reflect on the dashboard and vice versa.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MockEngine } from "./ai/MockEngine";
import type { AIEngine } from "./ai/types";
import { pendingOt } from "./data/mockData";

export type View = "dashboard" | "chat";
export type ApprovalStatus = "approved" | "rejected";

export interface PinnedDashboard {
  title: string;
  tiles: { label: string; value: string; danger?: boolean }[];
  series: number[];
}

interface Store {
  engine: AIEngine;

  view: View;
  setView: (v: View) => void;

  // navigate to chat and auto-send a question
  pendingQuery: string | null;
  openChat: (query?: string) => void;
  consumePendingQuery: () => string | null;

  // OT approvals
  approvals: Record<string, ApprovalStatus>;
  resolveApproval: (id: string, status: ApprovalStatus) => void;
  batchApprove: (ids: string[]) => void;
  unresolvedCount: number;

  // pinned dashboards (generated in chat, shown on dashboard)
  pinned: PinnedDashboard[];
  pinDashboard: (d: PinnedDashboard) => void;
  unpin: (index: number) => void;

  // toasts
  toasts: { id: number; text: string }[];
  toast: (text: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => new MockEngine(), []);
  const [view, setView] = useState<View>("dashboard");
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Record<string, ApprovalStatus>>({});
  const [pinned, setPinned] = useState<PinnedDashboard[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const openChat = useCallback((query?: string) => {
    if (query) setPendingQuery(query);
    setView("chat");
  }, []);

  const consumePendingQuery = useCallback(() => {
    let q: string | null = null;
    setPendingQuery((cur) => {
      q = cur;
      return null;
    });
    return q;
  }, []);

  const resolveApproval = useCallback(
    (id: string, status: ApprovalStatus) => {
      setApprovals((a) => ({ ...a, [id]: status }));
      const p = pendingOt.find((x) => x.id === id);
      toast(status === "approved" ? `已批准 ${p?.name ?? ""} 的 OT ✓` : `已驳回 ${p?.name ?? ""} 的 OT`);
    },
    [toast],
  );

  const batchApprove = useCallback(
    (ids: string[]) => {
      setApprovals((a) => {
        const next = { ...a };
        ids.forEach((id) => (next[id] = "approved"));
        return next;
      });
      toast(`已批量批准 ${ids.length} 笔 OT ✓`);
    },
    [toast],
  );

  const pinDashboard = useCallback(
    (d: PinnedDashboard) => {
      setPinned((p) => (p.some((x) => x.title === d.title) ? p : [...p, d]));
      toast(`已钉到首页:${d.title} 📌`);
    },
    [toast],
  );

  const unpin = useCallback((index: number) => {
    setPinned((p) => p.filter((_, i) => i !== index));
  }, []);

  const unresolvedCount = useMemo(
    () => pendingOt.filter((p) => !approvals[p.id]).length,
    [approvals],
  );

  const value: Store = {
    engine, view, setView,
    pendingQuery, openChat, consumePendingQuery,
    approvals, resolveApproval, batchApprove, unresolvedCount,
    pinned, pinDashboard, unpin,
    toasts, toast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within AppStoreProvider");
  return s;
}
