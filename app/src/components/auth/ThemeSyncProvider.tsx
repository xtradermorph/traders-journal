"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Helper to fetch and apply theme
    const applyUserTheme = async (userId: string) => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("theme")
        .eq("user_id", userId)
        .maybeSingle();
      if (data && data.theme) {
        setTheme(data.theme);
      } else {
        setTheme("system");
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await applyUserTheme(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        setTheme("system");
      }
    });

    // On mount, if already logged in, apply theme
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await applyUserTheme(user.id);
      }
    })();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
} 