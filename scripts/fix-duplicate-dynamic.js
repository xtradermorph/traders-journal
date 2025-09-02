#!/usr/bin/env node

/**
 * Script to remove duplicate 'export const dynamic' declarations from API routes
 * This fixes the "name 'dynamic' is defined multiple times" error
 */

import fs from 'fs';
import glob from 'glob';

// Find all API route files
const apiRoutes = glob.sync('app/api/**/*.ts');

console.log(`Found ${apiRoutes.length} API route files`);

let fixedCount = 0;

apiRoutes.forEach(routePath => {
  try {
    const content = fs.readFileSync(routePath, 'utf8');
    
    // Check if file has multiple dynamic exports
    const dynamicMatches = content.match(/export const dynamic = ['"]force-dynamic['"]/g);
    
    if (dynamicMatches && dynamicMatches.length > 1) {
      console.log(`🔧 ${routePath} - Found ${dynamicMatches.length} dynamic exports, fixing...`);
      
      // Remove all dynamic exports and add one at the top after imports
      let lines = content.split('\n');
      
      // Find the last import statement
      let insertIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i;
        }
      }
      
      // Remove all existing dynamic exports
      lines = lines.filter(line => !line.includes('export const dynamic ='));
      
      // Add one dynamic export after imports
      if (insertIndex !== -1) {
        lines.splice(insertIndex + 1, 0, '', '// Force dynamic rendering to prevent static generation issues', 'export const dynamic = "force-dynamic";', '');
      }
      
      const newContent = lines.join('\n');
      fs.writeFileSync(routePath, newContent);
      
      console.log(`✅ ${routePath} - Fixed duplicate dynamic exports`);
      fixedCount++;
    } else if (dynamicMatches && dynamicMatches.length === 1) {
      console.log(`✅ ${routePath} - Already has single dynamic export`);
    } else {
      console.log(`⏭️  ${routePath} - No dynamic export found`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${routePath}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} API route files with duplicate dynamic exports`);
console.log('✅ All duplicate dynamic exports removed, ready for Netlify build');
