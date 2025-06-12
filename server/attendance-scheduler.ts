import { db } from './db.js';
import { attendance, users } from '../shared/schema.js';
import { eq, and, isNull, lt } from 'drizzle-orm';

export class AttendanceScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    // Check every minute for automatic operations
    this.intervalId = setInterval(() => {
      this.performScheduledTasks();
    }, 60 * 1000); // Check every minute

    console.log('Attendance scheduler started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Attendance scheduler stopped');
    }
  }

  private async performScheduledTasks() {
    const now = new Date();
    const isMidnight = now.getHours() === 0 && now.getMinutes() === 0;

    if (isMidnight) {
      await this.handleMidnightReset();
    }
  }

  private async handleMidnightReset() {
    try {
      console.log('Processing midnight attendance reset...');
      
      // Find all uncompleted attendance records from previous day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      const uncompletedRecords = await db
        .select()
        .from(attendance)
        .where(
          and(
            isNull(attendance.checkOut),
            lt(attendance.checkIn, yesterday)
          )
        );

      // Auto-checkout with 0 work hours for incomplete records
      for (const record of uncompletedRecords) {
        if (record.checkIn) {
          await db
            .update(attendance)
            .set({
              checkOut: yesterday,
              checkOutLocation: 'Auto Check-out (Midnight)',
              checkOutNotes: 'Automatically checked out at midnight - no manual checkout recorded',
              workingHours: 0,
              overtimeHours: 0,
              status: 'incomplete',
              adminNotes: 'Auto-checkout due to missing manual checkout',
              updatedAt: new Date()
            })
            .where(eq(attendance.id, record.id));

          console.log(`Auto-checkout applied for user ${record.userId} - attendance ID ${record.id}`);
        }
      }

      console.log(`Processed ${uncompletedRecords.length} incomplete attendance records`);
    } catch (error) {
      console.error('Error in midnight attendance reset:', error);
    }
  }

  // Manual trigger for testing
  async triggerMidnightReset() {
    await this.handleMidnightReset();
  }
}

export const attendanceScheduler = new AttendanceScheduler();