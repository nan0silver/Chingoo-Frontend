import { Home, Users, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavItem = "home" | "friends" | "settings";

interface BottomNavigationProps {
  activeItem: BottomNavItem | null;
  onItemClick: (item: BottomNavItem) => void;
}

export default function BottomNavigation({
  activeItem,
  onItemClick,
}: BottomNavigationProps) {
  const navItems: Array<{
    id: BottomNavItem;
    label: string;
    icon: LucideIcon;
  }> = [
    { id: "home", label: "홈", icon: Home },
    { id: "friends", label: "내 친구", icon: Users },
    { id: "settings", label: "설정", icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-white border-t border-grey-100 z-40 safe-area-bottom"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 transition-colors",
                "active:bg-grey-50",
                isActive ? "text-orange-accent" : "text-grey-400",
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "w-6 h-6 mb-1 transition-all",
                  isActive && "scale-110",
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all",
                  isActive ? "font-semibold" : "font-normal",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
