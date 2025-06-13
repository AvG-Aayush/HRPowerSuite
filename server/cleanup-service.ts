import { db } from "./db";
import { announcements, assignments, messages, routines, shifts, leaveRequests, overtimeRequests } from "@shared/schema";
import { lt, sql, and, or, eq, desc, inArray } from "drizzle-orm";

export class CleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  start() {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour

    // Run initial cleanup
    this.performCleanup().catch(console.error);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async performCleanup() {
    console.log('Running automatic cleanup...');
    
    try {
      // Delete expired announcements
      const expiredAnnouncementsResult = await db
        .delete(announcements)
        .where(
          sql`${announcements.expiresAt} IS NOT NULL AND ${announcements.expiresAt} < NOW()`
        );
      
      // Delete overdue assignments (24 hours after due date)
      const overdueAssignmentsResult = await db
        .delete(assignments)
        .where(
          sql`${assignments.dueDate} IS NOT NULL AND ${assignments.dueDate} < NOW() - INTERVAL '1 day' AND ${assignments.status} != 'completed'`
        );

      // Delete expired routines (automatically expire after their date + 1 day)
      const expiredRoutinesResult = await db
        .delete(routines)
        .where(lt(routines.expiresAt, new Date()));

      // Delete messages older than 3 months (temporarily disabled due to schema mismatch)
      // const threeMonthsAgo = new Date();
      // threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      // const oldMessagesResult = await db
      //   .delete(messages)
      //   .where(lt(messages.sentAt, threeMonthsAgo));
      const oldMessagesResult = { rowCount: 0 };

      // Delete completed or cancelled shifts after 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const oldShiftsResult = await db
        .delete(shifts)
        .where(
          and(
            or(
              eq(shifts.status, 'completed'),
              eq(shifts.status, 'cancelled')
            ),
            lt(shifts.createdAt, threeDaysAgo)
          )
        );

      // Cleanup old requests - keep only latest 5 per user for each request type
      const oldLeaveRequestsResult = await this.cleanupOldUserRequests('leave');
      const oldOvertimeRequestsResult = await this.cleanupOldUserRequests('overtime');

      console.log('Cleanup completed:', {
        expiredAnnouncements: expiredAnnouncementsResult.rowCount || 0,
        overdueAssignments: overdueAssignmentsResult.rowCount || 0,
        expiredRoutines: expiredRoutinesResult.rowCount || 0,
        oldMessages: oldMessagesResult.rowCount || 0,
        oldShifts: oldShiftsResult.rowCount || 0,
        oldLeaveRequests: oldLeaveRequestsResult,
        oldOvertimeRequests: oldOvertimeRequestsResult
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // Cleanup old requests - keep only latest 5 per user for each request type
  private async cleanupOldUserRequests(requestType: 'leave' | 'overtime'): Promise<number> {
    try {
      let deletedCount = 0;
      
      if (requestType === 'leave') {
        // Get all users with leave requests
        const usersWithRequests = await db
          .selectDistinct({ userId: leaveRequests.userId })
          .from(leaveRequests);

        for (const { userId } of usersWithRequests) {
          // Get all requests for this user, ordered by creation date (newest first)
          const userRequests = await db
            .select({ id: leaveRequests.id })
            .from(leaveRequests)
            .where(eq(leaveRequests.userId, userId))
            .orderBy(desc(leaveRequests.submittedAt))
            .limit(1000); // Safety limit
          
          // If user has more than 5 requests, delete the oldest ones
          if (userRequests.length > 5) {
            const idsToDelete = userRequests.slice(5).map(req => req.id);
            const result = await db
              .delete(leaveRequests)
              .where(inArray(leaveRequests.id, idsToDelete));
            deletedCount += result.rowCount || 0;
          }
        }
      } else if (requestType === 'overtime') {
        // Get all users with overtime requests
        const usersWithRequests = await db
          .selectDistinct({ userId: overtimeRequests.userId })
          .from(overtimeRequests);

        for (const { userId } of usersWithRequests) {
          // Get all requests for this user, ordered by creation date (newest first)
          const userRequests = await db
            .select({ id: overtimeRequests.id })
            .from(overtimeRequests)
            .where(eq(overtimeRequests.userId, userId))
            .orderBy(desc(overtimeRequests.createdAt))
            .limit(1000); // Safety limit
          
          // If user has more than 5 requests, delete the oldest ones
          if (userRequests.length > 5) {
            const idsToDelete = userRequests.slice(5).map(req => req.id);
            const result = await db
              .delete(overtimeRequests)
              .where(inArray(overtimeRequests.id, idsToDelete));
            deletedCount += result.rowCount || 0;
          }
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error(`Failed to cleanup old ${requestType} requests:`, error);
      return 0;
    }
  }

  // Manual cleanup method for immediate execution
  async runCleanup() {
    await this.performCleanup();
  }
}

export const cleanupService = new CleanupService();