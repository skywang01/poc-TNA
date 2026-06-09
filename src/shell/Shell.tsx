import { useStore } from "../store";

const SUBNAV = ["Clocking", "Roster", "Overtime", "Daily", "Timesheet", "Leave"];

export function Sidebar() {
  const { view, setView } = useStore();
  return (
    <aside className="side">
      <div className="brand"><b>BIPO</b><span>ATTENDANCE</span></div>
      <nav className="nav">
        <div className="item">🏠 Home</div>
        <div className="item group">📅 Attendance ⌄</div>
        <div
          className={`sub ai ${view === "dashboard" ? "active" : ""}`}
          onClick={() => setView("dashboard")}
        >
          AI Dashboard<span className="tagai">AI</span>
        </div>
        <div
          className={`sub ai ${view === "chat" ? "active" : ""}`}
          onClick={() => setView("chat")}
        >
          AI 助手<span className="tagai">AI</span>
        </div>
        {SUBNAV.map((s) => <div className="sub" key={s}>{s}</div>)}
      </nav>
    </aside>
  );
}

export function Fab() {
  const { view, openChat, unresolvedCount } = useStore();
  if (view === "chat") return null;
  return (
    <button className="fab" onClick={() => openChat()} title="问 AI">
      ✨
      {unresolvedCount > 0 && <span className="badge">{unresolvedCount}</span>}
    </button>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((t) => <div className="toast" key={t.id}>{t.text}</div>)}
    </div>
  );
}
