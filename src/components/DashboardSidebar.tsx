import { Brain, LayoutDashboard, Upload, Mic, LogOut, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Upload, label: "Upload Audio", href: "/dashboard" },
  { icon: Mic, label: "Record", href: "/dashboard" },
  { icon: FileText, label: "Reports", href: "/dashboard" },
];



export function DashboardSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 p-6 border-b border-sidebar-border">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Brain className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-sidebar-foreground">DropZone</span>
      </Link>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Items */}
      <div className="p-4 border-t border-sidebar-border space-y-2">

        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-sidebar-accent transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log out</span>
        </Link>
      </div>
    </aside>
  );
}
