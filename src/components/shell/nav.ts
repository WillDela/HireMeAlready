import { FileText, FolderOpen, Mic, Settings, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

export const navItems: NavItem[] = [
  { href: "/practice", label: "Practice", icon: Mic, match: (p) => p.startsWith("/practice") },
  { href: "/friends", label: "Friends", icon: Users, match: (p) => p.startsWith("/friends") },
  { href: "/history", label: "History", icon: FolderOpen, match: (p) => p.startsWith("/history") },
  { href: "/resume", label: "Resume", icon: FileText, match: (p) => p.startsWith("/resume") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];
