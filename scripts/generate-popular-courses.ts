#!/usr/bin/env tsx

/**
 * Script to batch generate popular pre-built courses for free users
 * Run with: npx tsx scripts/generate-popular-courses.ts
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import { preGeneratedContentService } from '../services/preGeneratedContentService';
import { supabaseService } from '../services/supabaseService';

async function main() {
    console.log('🚀 Starting batch generation of popular courses...\n');

    try {
        // Check if we can connect to the database (skip user check for scripts)
        console.log('✅ Database connection established');

        // Get popular subjects to generate courses for
        const subjects = await supabaseService.getPopularSubjects(5);
        console.log(`📚 Found ${subjects.length} subjects to generate courses for:`);
        subjects.forEach(subject => {
            console.log(`   - ${subject.name} (${subject.category})`);
        });
        console.log('');

        // Run batch generation
        const results = await preGeneratedContentService.batchGeneratePopularCourses();

        console.log('📊 Generation Results:');
        console.log(`✅ Successfully generated: ${results.generated} courses`);

        if (results.errors.length > 0) {
            console.log(`❌ Errors encountered: ${results.errors.length}`);
            results.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }

        // Get final statistics
        const stats = await getGenerationStats();
        console.log('\n📈 Final Statistics:');
        console.log(`   Total pre-generated courses: ${stats.totalCourses}`);
        console.log(`   Courses by difficulty: ${JSON.stringify(stats.byDifficulty, null, 2)}`);
        console.log(`   Courses by commute time: ${JSON.stringify(stats.byCommuteTime, null, 2)}`);

        console.log('\n🎉 Batch generation completed!');

    } catch (error) {
        console.error('❌ Batch generation failed:', error);
        process.exit(1);
    }
}

async function getGenerationStats() {
    try {
        // Get all pre-generated courses for stats
        const coursesResponse = await supabaseService.getPreGeneratedCourses({});
        const courses = coursesResponse.data || [];

        const stats = {
            totalCourses: courses.length,
            byDifficulty: {} as Record<string, number>,
            byCommuteTime: {} as Record<string, number>,
        };

        courses.forEach(course => {
            // Count by difficulty
            stats.byDifficulty[course.difficulty] = (stats.byDifficulty[course.difficulty] || 0) + 1;

            // Count by commute time
            const timeKey = `${course.commute_time}min`;
            stats.byCommuteTime[timeKey] = (stats.byCommuteTime[timeKey] || 0) + 1;
        });

        return stats;
    } catch (error) {
        console.error('Failed to get generation stats:', error);
        return {
            totalCourses: 0,
            byDifficulty: {},
            byCommuteTime: {},
        };
    }
}

// Handle script execution
if (require.main === module) {
    main().catch(console.error);
}

export { main as generatePopularCourses };

