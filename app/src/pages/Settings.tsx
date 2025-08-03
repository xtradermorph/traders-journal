"use client"

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save settings logic here
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="Settings" 
        showBackButton={true}
        backUrl="/dashboard"
      />
      
      <Tabs defaultValue="general" className="mt-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your general preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add your general settings here */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add other tab contents */}
      </Tabs>
    </div>
  );
} 