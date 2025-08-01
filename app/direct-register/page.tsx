"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function DirectRegisterPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const handleDirectSignup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setLogs([]);
    
    try {
      addLog("Starting direct client-side signup process...");
      
      // Step 1: Sign up with Supabase Auth
      addLog("Step 1: Creating auth user with Supabase Auth...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      
      if (authError) {
        addLog(`❌ Auth signup failed: ${authError.message}`);
        setError(`Auth signup failed: ${authError.message}`);
        return;
      }
      
      if (!authData.user) {
        addLog("❌ No user data returned from Auth signup");
        setError("No user data returned from Auth signup");
        return;
      }
      
      addLog(`✅ Auth user created successfully! User ID: ${authData.user.id}`);
      
      // Step 2: Create profile manually
      addLog("Step 2: Creating profile manually...");
      
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          username,
          email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_trades: 0,
          win_rate: 0,
          medal_type: "bronze",
          performance_rank: 0,
          role: "user"
        });
      
      if (profileError) {
        addLog(`❌ Profile creation failed: ${profileError.message}`);
        
        // Try to sign out the user to clean up
        await supabase.auth.signOut();
        
        setError(`Profile creation failed: ${profileError.message}`);
        return;
      }
      
      addLog("✅ Profile created successfully!");
      
      // Step 3: Sign out the user (so they can sign in properly later)
      addLog("Step 3: Signing out user...");
      await supabase.auth.signOut();
      addLog("✅ User signed out successfully");
      
      setSuccess("Registration successful! You can now log in with your credentials.");
    } catch (err: any) {
      addLog(`❌ Unexpected error: ${err.message}`);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Direct Registration</CardTitle>
          <CardDescription>
            Register directly using Supabase client-side auth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            onClick={handleDirectSignup} 
            disabled={loading} 
            className="w-full"
          >
            {loading ? "Processing..." : "Register Directly"}
          </Button>
          
          <div className="w-full mt-4">
            <h3 className="text-sm font-medium mb-2">Debug Logs:</h3>
            <div className="bg-gray-50 p-2 rounded text-xs font-mono h-40 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-400">No logs yet...</p>
              ) : (
                logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
