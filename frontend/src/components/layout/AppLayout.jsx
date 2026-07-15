import {
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Button } from "../ui/Button.jsx";
import { useAuth } from "../../lib/useAuth.js";
import { cn } from "../../lib/utils.js";
import { branding } from "../../config/branding.js";
import { useTheme } from "../../lib/useTheme.js";

const adminItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/learning-path", label: "Learning Path", icon: BookOpen },
  { to: "/admin/assessments", label: "Assessments", icon: ClipboardList },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const studentItems = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/modules", label: "Subjects", icon: BookOpen },
  { to: "/student/assessments", label: "Assessments", icon: ClipboardList },
  { to: "/student/profile", label: "Profile", icon: UserRound },
];

export function AppLayout({ role }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-collapsed") === "true";
  });
  const navigate = useNavigate();
  const items = role === "ADMIN" ? adminItems : studentItems;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const roleLabel = role === "ADMIN" ? branding.nav.adminLabel : branding.nav.studentLabel;
  const userName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  useEffect(() => {
    window.localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 backdrop-blur-xl transition-[width] duration-200 lg:block",
          sidebarCollapsed ? "w-[5.25rem]" : "w-64",
        )}
      >
        <div className={cn("flex h-20 items-center gap-3 border-b border-slate-200 px-4", sidebarCollapsed && "justify-center px-3")}>
          <div className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <GraduationCap size={23} />
          </div>
          <div className={cn("min-w-0", sidebarCollapsed && "hidden")}>
            <p className="text-sm font-semibold text-slate-950">{branding.appName}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <SidebarNav items={items} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="app-sidebar h-full w-[min(20rem,calc(100vw-2rem))] border-r border-slate-200 p-3 shadow-2xl dark:border-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex h-14 items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-blue-600 text-white">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{branding.shortName}</p>
                  <p className="text-xs text-slate-500">{roleLabel}</p>
                </div>
              </div>
              <Button variant="ghost" className="h-9 px-2" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className={cn("transition-[padding] duration-200", sidebarCollapsed ? "lg:pl-[5.25rem]" : "lg:pl-64")}>
        <header className="app-header sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 px-4 backdrop-blur-xl dark:border-slate-800 sm:px-6 lg:h-20">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" className="h-10 px-2 lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </Button>
            <Button
              variant="ghost"
              className="hidden h-10 px-2 lg:inline-flex"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{userName || roleLabel}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-10 px-3" aria-label="Toggle color theme" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>
            <Button variant="secondary" className="h-10 px-3" aria-label="Logout" onClick={handleLogout}>
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ items, collapsed = false, onNavigate }) {
  return (
    <nav className="space-y-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "app-nav-link flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition",
                collapsed && "justify-center px-2",
                isActive ? "app-nav-link-active bg-blue-50 text-blue-700 shadow-sm" : "hover:bg-slate-100",
              )
            }
          >
            <Icon size={18} />
            <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

