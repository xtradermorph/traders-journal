'use client'

import { useState, useEffect } from 'react';

const VersionDisplay = () => {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Get version from package.json or environment variable
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
    setVersion(appVersion);
  }, []);

  if (!version) return null;

  return (
    <div className="text-xs text-muted-foreground text-center py-2 border-t border-border/50">
      <span>v{version}</span>
    </div>
  );
};

export default VersionDisplay; 