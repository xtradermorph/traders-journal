"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeleteAccount() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      toast({
        title: "Error",
        description: "Please enter your password to confirm account deletion.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      toast({
        id: "account-deleted",
        title: "Success",
        description: "Your account has been deleted successfully."
      });
      
      // Redirect to landing page
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        id: "account-delete-error",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
      setShowPasswordInput(false);
      setPassword("");
    }
  };

  const handleDeleteClick = () => {
    setShowPasswordInput(true);
    setIsConfirmOpen(true);
  };

  return (
    <div className="mt-4">
      <Button
        variant="destructive"
        onClick={handleDeleteClick}
        disabled={isLoading}
      >
        {isLoading ? "Deleting..." : "Delete Account"}
      </Button>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers, including your profile information,
              trade records, and any other associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {showPasswordInput && (
            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password.trim()) {
                    handleDeleteAccount();
                  }
                }}
              />
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isLoading}
              onClick={() => {
                setShowPasswordInput(false);
                setPassword("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isLoading || !password.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
