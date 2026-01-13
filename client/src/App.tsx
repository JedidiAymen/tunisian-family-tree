"use client";

import { Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getToken, setToken, api } from "@/lib/api";
import type { User } from "@/types";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Dashboard from "@/pages/Dashboard";
import PersonDetail from "@/pages/PersonDetail";
import GraphPage from "@/pages/GraphPage";
import ProgressPage from "@/pages/ProgressPage";
import TimelinePage from "@/pages/TimelinePage";
import ActivityPage from "@/pages/ActivityPage";
import AdminPage from "@/pages/AdminPage";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { TreePine, LayoutDashboard, Network, LogOut, User as UserIcon, TrendingUp, Calendar, Activity, Shield } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (getToken()) {
      api<User>("/api/v1/auth/me")
        .then(setUser)
        .catch(() => setToken(null));
    }
  }, []);

  function handleLogout() {
    setToken(null);
    setUser(null);
    navigate("/login");
  }

  // Not authenticated - show login/register routes
  if (!getToken()) {
    return (
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage onLogin={setUser} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    );
  }

  // Authenticated layout with sidebar
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
              <TreePine className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Family Tree</h1>
              <p className="text-xs text-muted-foreground">Tunisia 🇹🇳</p>
            </div>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          
          <Link to="/graph">
            <Button
              variant={location.pathname === "/graph" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <Network className="h-4 w-4" />
              Family Tree
            </Button>
          </Link>

          <Link to="/progress">
            <Button
              variant={location.pathname === "/progress" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <TrendingUp className="h-4 w-4" />
              Progress
            </Button>
          </Link>

          <Link to="/timeline">
            <Button
              variant={location.pathname === "/timeline" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <Calendar className="h-4 w-4" />
              Timeline
            </Button>
          </Link>

          <Link to="/activity">
            <Button
              variant={location.pathname === "/activity" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <Activity className="h-4 w-4" />
              Activity
            </Button>
          </Link>

          <Link to="/admin">
            <Button
              variant={location.pathname === "/admin" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User Info & Actions */}
        <div className="p-4 space-y-4">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.first_name || user.email?.split('@')[0]}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {user.role}
                </Badge>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              className="flex-1 justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto bg-background">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/person/:id" element={<PersonDetail />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
