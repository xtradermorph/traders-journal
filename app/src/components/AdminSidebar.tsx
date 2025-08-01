"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MonitorCheck, LifeBuoy, Megaphone } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";

const adminNav = [
  {
    name: "Monitoring",
    href: "/admin/monitoring",
    icon: MonitorCheck,
  },
  {
    name: "Support Management",
    href: "/admin/monitoring/support-management",
    icon: LifeBuoy,
  },
  {
    name: "Announcements",
    href: "/admin/announcement",
    icon: Megaphone,
  },
];

export default function AdminSidebar() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (error || !data || !data.role || data.role.toLowerCase() !== "admin") {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    })();
  }, [supabase]);

  if (isAdmin === null) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return null;
  }

  return (
    <aside className="hidden lg:block w-64 bg-background border-r border-border h-full overflow-y-auto">
      <div className="py-6">
        <div className="px-6 mb-8">
          <Link href="/admin/monitoring" className="flex items-center">
            <span className="ml-2 text-xl font-bold text-primary">Admin Panel</span>
          </Link>
        </div>
        <nav className="space-y-1 px-2">
          {adminNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
} 