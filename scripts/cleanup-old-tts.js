#!/usr/bin/env node

/**
 * Cleanup script to remove old TTS service files
 * Run this after migrating to the unified TTS service
 */

const fs = require('fs');
const path = require('path');

const filesToRemove = [
  // Old service files
  'services/simpleTTSService.ts',
  'services/ttsService.ts',
  
  // Old documentation
  'docs/TTS_OPTIMIZATION.md',
  
  // Old scripts
  'scripts/deploy-tts-function.sh',
];

console.log('🧹 Cleaning up old TTS service files...\n');

filesToRemove.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
    } else {
      console.log(`⏭️  Skipped (not found): ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error removing ${file}:`, error.message);
  }
});

console.log('\n✨ Cleanup complete!');
console.log('\nRemaining TTS implementation:');
console.log('  - services/ttsService.ts (main service)');
console.log('  - supabase/functions/tts-stream (edge function)');
console.log('\nThe app now uses a single, unified TTS service optimized for React Native!');
