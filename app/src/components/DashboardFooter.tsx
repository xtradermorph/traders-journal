"use client"

import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function DashboardFooter() {
  return (
    <footer className="mt-12 bg-transparent rounded-b-2xl">
      <div className="w-full h-0.5 mb-2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Support
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'true'); } catch {} }}>
            Terms
          </Link>
          <Link href="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'false'); } catch {} }}>
            Cookies
          </Link>
          <Link href="/disclaimer" className="text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => { try { sessionStorage.setItem('fromLanding', 'false'); } catch {} }}>
            Disclaimer
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-2 md:mt-0">
          {new Date().getFullYear()} Trader's Journal. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
