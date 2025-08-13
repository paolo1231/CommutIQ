#!/usr/bin/env ts-node

/**
 * Storage System Test Script
 * Tests the Supabase Storage setup and S3 integration
 */

import { storageService } from '../services/storageService';
import StorageManager from '../utils/storageManager';

async function testStorageSetup() {
    console.log('🧪 Testing CommutIQ Storage Setup...\n');

    // Test 1: Configuration Check
    console.log('1️⃣ Checking Configuration...');
    const config = storageService.getConfig();
    console.log('   Storage Configuration:', {
        configured: config.configured,
        baseUrl: config.baseUrl ? 'SET' : 'NOT SET',
        region: config.region,
        buckets: config.buckets
    });

    // Test 2: Health Check
    console.log('\n2️⃣ Running Health Check...');
    const healthCheck = await StorageManager.healthCheck();
    if (healthCheck.data) {
        console.log('   Health Status:', healthCheck.data);
    } else {
        console.error('   Health Check Failed:', healthCheck.error);
    }

    // Test 3: Storage Stats
    console.log('\n3️⃣ Getting Storage Overview...');
    const overview = await StorageManager.getStorageOverview();
    if (overview.data) {
        console.log('   Supabase Stats:', overview.data.supabase);
        console.log('   Cache Stats:', overview.data.cache);
        console.log('   Audio Quality Stats:', overview.data.audioQuality);
    } else {
        console.error('   Storage Overview Failed:', overview.error);
    }

    // Test 4: Test Upload (with dummy data)
    console.log('\n4️⃣ Testing Audio Upload...');
    try {
        // Create a small dummy audio buffer (1KB of zeros)
        const dummyAudioBuffer = new ArrayBuffer(1024);
        const testLessonId = 'test-lesson-' + Date.now();
        const testCourseId = 'test-course-' + Date.now();

        const uploadResult = await StorageManager.uploadAudioWithRedundancy(
            dummyAudioBuffer,
            testLessonId,
            testCourseId,
            {
                quality: 'standard',
                metadata: {
                    test: true,
                    timestamp: new Date().toISOString()
                }
            }
        );

        if (uploadResult.data) {
            console.log('   ✅ Upload successful:', {
                url: uploadResult.data.primaryUrl,
                size: uploadResult.data.size,
                path: uploadResult.data.path
            });

            // Test 5: Test Download
            console.log('\n5️⃣ Testing Audio Download...');
            const downloadResult = await storageService.downloadAudio(uploadResult.data.path);
            if (downloadResult.data) {
                console.log('   ✅ Download successful, size:', downloadResult.data.byteLength);
            } else {
                console.error('   ❌ Download failed:', downloadResult.error);
            }

            // Test 6: Test Metadata
            console.log('\n6️⃣ Testing File Metadata...');
            const metadataResult = await storageService.getFileMetadata(uploadResult.data.path);
            if (metadataResult.data) {
                console.log('   ✅ Metadata retrieved:', metadataResult.data);
            } else {
                console.error('   ❌ Metadata retrieval failed:', metadataResult.error);
            }

            // Cleanup test file
            console.log('\n🧹 Cleaning up test file...');
            const deleteResult = await storageService.deleteAudio(uploadResult.data.path);
            if (deleteResult.data) {
                console.log('   ✅ Test file deleted successfully');
            } else {
                console.error('   ❌ Failed to delete test file:', deleteResult.error);
            }

        } else {
            console.error('   ❌ Upload failed:', uploadResult.error);
        }
    } catch (error) {
        console.error('   ❌ Upload test failed:', error.message);
    }

    // Test 7: Storage Optimization
    console.log('\n7️⃣ Testing Storage Optimization...');
    const optimizeResult = await StorageManager.optimizeStorage();
    if (optimizeResult.data) {
        console.log('   ✅ Optimization completed:', optimizeResult.data);
    } else {
        console.error('   ❌ Optimization failed:', optimizeResult.error);
    }

    // Test 8: Storage Monitoring
    console.log('\n8️⃣ Testing Storage Monitoring...');
    const monitorResult = await StorageManager.monitorStorageUsage();
    if (monitorResult.data) {
        console.log('   Storage Alerts:', monitorResult.data.alerts);
    } else {
        console.error('   ❌ Monitoring failed:', monitorResult.error);
    }

    console.log('\n✅ Storage setup test completed!');
}

// Run the test if this script is executed directly
if (require.main === module) {
    testStorageSetup().catch(console.error);
}

export { testStorageSetup };
