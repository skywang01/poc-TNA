import { useStore } from "./store";
import { Sidebar, Fab, Toasts } from "./shell/Shell";
import { Dashboard } from "./dashboard/Dashboard";
import { Chatbot } from "./chatbot/Chatbot";

export function App() {
  const { view } = useStore();
  return (
    <div className="app">
      <Sidebar />
      {view === "dashboard" ? <Dashboard /> : <Chatbot />}
      <Fab />
      <Toasts />
    </div>
  );
}
