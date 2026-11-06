import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      return document.body.classList.contains("light") ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  const [showSidebar, setShowSidebar] = useState(false);

  // Sync class on initial mount and theme change immediately
  useEffect(() => {
    const isLight = theme === "light";
    document.body.classList.toggle("light", isLight);
    document.documentElement.classList.toggle("light", isLight);
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    const isLight = next === "light";
    // Synchronously update DOM classes immediately without waiting for re-render
    document.body.classList.toggle("light", isLight);
    document.documentElement.classList.toggle("light", isLight);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
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

