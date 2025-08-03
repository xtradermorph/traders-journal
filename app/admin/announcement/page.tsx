"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";

export default function AdminAnnouncementPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();

  const supabase = createClientComponentClient();

  useEffect(() => {
    // Check if user is admin
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
      if (error || !data || !data.role || data.role.toUpperCase() !== "ADMIN") {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    })();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/send-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message })
      });
      if (res.ok) {
        toast({ title: "Announcement sent!", description: "Your announcement was emailed to all opted-in users." });
        setSubject("");
        setMessage("");
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to send announcement." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send announcement." });
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin === null) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return <div className="flex items-center justify-center h-64 text-destructive font-semibold text-lg">Access denied: Admins only</div>;
  }

  return (
    <div className="container mx-auto py-8 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Send Project Announcement</CardTitle>
          <CardDescription>Send a plain text update to all users who have opted in for project updates and features.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="subject">Subject</label>
              <Input
                id="subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                maxLength={120}
                placeholder="Announcement subject"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="message">Message</label>
              <Textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={7}
                maxLength={2000}
                placeholder="Type your announcement here..."
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !subject || !message}>
              {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Sending...</> : "Send Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 