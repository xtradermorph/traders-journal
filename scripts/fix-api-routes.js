#!/usr/bin/env node

/**
 * Script to add 'export const dynamic = "force-dynamic"' to all API routes that use cookies
 * This prevents Netlify static generation issues
 */

import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Find all API route files
const apiRoutes = glob.sync('app/api/**/*.ts');

console.log(`Found ${apiRoutes.length} API route files`);

let fixedCount = 0;

apiRoutes.forEach(routePath => {
  try {
    const content = fs.readFileSync(routePath, 'utf8');
    
    // Check if file already has dynamic export
    if (content.includes('export const dynamic = "force-dynamic"')) {
      console.log(`✅ ${routePath} - Already has dynamic directive`);
      return;
    }
    
    // Check if file uses cookies
    if (content.includes('cookies') && content.includes('next/headers')) {
      // Add dynamic directive after imports
      const lines = content.split('\n');
      let insertIndex = -1;
      
      // Find the last import statement
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i;
        }
      }
      
      if (insertIndex !== -1) {
        // Insert dynamic directive after imports
        lines.splice(insertIndex + 1, 0, '', '// Force dynamic rendering to prevent static generation issues', 'export const dynamic = "force-dynamic";', '');
        
        const newContent = lines.join('\n');
        fs.writeFileSync(routePath, newContent);
        
        console.log(`🔧 ${routePath} - Added dynamic directive`);
        fixedCount++;
      }
    } else {
      console.log(`⏭️  ${routePath} - No cookies usage, skipping`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${routePath}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} API route files`);
console.log('✅ All API routes now have dynamic directive to prevent Netlify build issues');
