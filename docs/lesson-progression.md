# Lesson Progression System

## Overview
The CommutIQ app implements a sequential lesson progression system that ensures users complete lessons in order while providing a smooth learning experience.

## How It Works

### 1. **Lesson Completion**
When a user completes a lesson (either by finishing the audio or clicking "Mark as Completed"):
- The lesson is marked as 100% complete in the database
- The completion timestamp is recorded
- The user sees a success message with a celebration emoji 🎉
- The lesson shows a green "Lesson Completed" badge

### 2. **Course Details Page Updates**
When returning to the course details page after completing a lesson:
- The `useFocusEffect` hook automatically refreshes the progress data
- The completed lesson shows with:
  - Green background (#f0fdf4)
  - Green checkmark icon
  - "Completed" status text
- The next lesson in sequence automatically becomes available with:
  - Blue highlight (#eff6ff)
  - Blue "Start" button that's fully enabled
  - Visual indication that it's the next lesson to take

### 3. **Lesson Unlocking Logic**
The system determines which lessons are available using this logic:
```javascript
const isNextLesson = !isCompleted && lessons.slice(0, index).every(l => isLessonCompleted(l.id));
```

This means:
- The first lesson is always available
- Subsequent lessons are only available if ALL previous lessons are completed
- Users cannot skip ahead to later lessons
- Completed lessons can always be revisited

### 4. **Visual States**

#### **Completed Lesson**
- Background: Light green (#f0fdf4)
- Border: Green accent on left side
- Button: Green checkmark with "Completed" text
- Always clickable to review

#### **Next Available Lesson**
- Background: Light blue (#eff6ff)
- Border: Blue accent on left side
- Button: Blue "Start" button with white text
- Fully enabled and ready to start

#### **Locked Lesson**
- Background: White
- Button: Grayed out with disabled state
- Not clickable until previous lessons are completed
- Shows "Start" text but in disabled color

#### **In-Progress Lesson**
- Shows progress bar with percentage
- Button shows "Continue" instead of "Start"
- Clickable to resume where left off

## User Flow

1. **User enters course** → First lesson is available, others are locked
2. **User completes Lesson 1** → Lesson 2 becomes available
3. **User returns to course page** → Progress automatically refreshes
4. **User sees visual progression** → Clear path through the course
5. **User can review completed lessons** → All completed content remains accessible

## Benefits

- **Structured Learning**: Ensures foundational concepts are learned before advanced topics
- **Clear Progress**: Users always know what to do next
- **Motivation**: Visual progress indicators encourage completion
- **Flexibility**: Can review completed lessons anytime
- **Automatic Updates**: No need to manually refresh - progress updates instantly

## Technical Implementation

### Database
- `user_progress` table tracks completion status
- `progress_percentage` field: 100 = completed
- `completed_at` timestamp records completion time

### State Management
- Course details page maintains `progress` state array
- `isLessonCompleted()` checks if lesson has 100% progress
- `refreshProgress()` reloads data when screen focuses

### Navigation
- Completed lessons → Always navigable
- Next lesson → Enabled when previous lessons complete
- Future lessons → Disabled until prerequisites met

## Edge Cases Handled

1. **Multiple completion attempts** - Prevented with `isCompletingLesson` state
2. **Network failures** - Error messages with retry options
3. **Returning to completed lessons** - Shows completion badge immediately
4. **Progress syncing** - Automatic refresh on screen focus
5. **Manual vs Auto completion** - Both methods properly tracked

## Future Enhancements

Potential improvements could include:
- Skip lesson option for advanced users (with admin permission)
- Prerequisite branching (some lessons unlock multiple paths)
- Achievement badges for completing lesson streaks
- Time-based lesson unlocking (daily lessons)
- Quiz requirements before unlocking next lesson
