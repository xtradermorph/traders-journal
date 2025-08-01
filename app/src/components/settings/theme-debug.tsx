'use client';

import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function ThemeDebug() {
  const { theme, setTheme, themes } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we can safely show the theme UI
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Theme</Label>
            <div className="text-sm text-muted-foreground">
              {theme || 'system'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Available Themes</Label>
            <div className="text-sm text-muted-foreground">
              {themes.join(', ')}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Change Theme</Label>
            <Select value={theme || 'system'} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="original-dark">Original Dark</SelectItem>
                <SelectItem value="original-light">Original Light</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Theme Preview</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 w-4 bg-primary rounded" />
                    <div className="h-4 w-4 bg-secondary rounded" />
                    <div className="h-4 w-4 bg-accent rounded" />
                    <div className="h-4 w-4 bg-destructive rounded" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="text-sm">Text Colors</div>
                    <div className="text-primary">Primary Text</div>
                    <div className="text-secondary">Secondary Text</div>
                    <div className="text-muted-foreground">Muted Text</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 