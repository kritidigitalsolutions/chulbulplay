import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [theme, setTheme] = useState("dark"); // "dark" | "light"
  const [showSidebar, setShowSidebar] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.classList.toggle("light", next === "light");
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar
        theme={theme}
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
        closeSidebar={() => setShowSidebar(false)}
      />

      <div className="page-shell">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          toggleSidebar={toggleSidebar}
        />

        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

