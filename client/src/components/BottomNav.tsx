/**
 * BottomNav — mobile-only bottom navigation bar.
 * Shown only on sm breakpoint and below (hidden sm:flex → actually flex sm:hidden).
 * Receives `isAdmin` and `currentPath` to highlight active tab.
 */
import { Utensils, BarChart3, Shield, Info, Stethoscope } from "lucide-react";

interface BottomNavProps {
  isAdmin: boolean;
  isDoctor?: boolean;
  currentPath: "/" | "/analytics" | "/admin" | "/about" | "/doctor" | string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
}

function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <a
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium
                  transition-colors duration-150
                  ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`h-6 w-6 flex items-center justify-center rounded-lg transition-colors
                        ${active ? "bg-primary/10" : ""}`}
      >
        {icon}
      </span>
      {label}
    </a>
  );
}

export function BottomNav({ isAdmin, isDoctor, currentPath }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex sm:hidden
                 border-t bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Основная навигация"
    >
      <NavItem
        icon={<Utensils className="h-5 w-5" />}
        label="Дневник"
        href="#/"
        active={currentPath === "/" || currentPath === ""}
      />
      <NavItem
        icon={<BarChart3 className="h-5 w-5" />}
        label="Аналитика"
        href="#/analytics"
        active={currentPath === "/analytics"}
      />
      {isAdmin && (
        <NavItem icon={<Shield className="h-5 w-5" />} label="Админ" href="#/admin" active={currentPath === "/admin"} />
      )}
      {(isDoctor || isAdmin) && (
        <NavItem
          icon={<Stethoscope className="h-5 w-5" />}
          label="Врач"
          href="#/doctor"
          active={currentPath === "/doctor"}
        />
      )}
      <NavItem icon={<Info className="h-5 w-5" />} label="О нас" href="#/about" active={currentPath === "/about"} />
    </nav>
  );
}
