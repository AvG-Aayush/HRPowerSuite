import { db } from './db';
import { sessions } from '../shared/schema';
import { lt } from 'drizzle-orm';

export class SessionCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private immediateCleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly IMMEDIATE_CLEANUP_INTERVAL = 60 * 1000; // 1 minute for immediate cleanup
  
  start() {
    if (this.cleanupInterval) {
      console.log('Session cleanup service already running');
      return;
    }
    
    console.log('Session cleanup service started - immediate cleanup every minute, full cleanup every hour');
    
    // Run initial cleanup
    this.performCleanup();
    
    // Schedule immediate cleanup for expired sessions (every minute)
    this.immediateCleanupInterval = setInterval(() => {
      this.performImmediateCleanup();
    }, this.IMMEDIATE_CLEANUP_INTERVAL);
    
    // Schedule regular full cleanup (every hour)
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.immediateCleanupInterval) {
      clearInterval(this.immediateCleanupInterval);
      this.immediateCleanupInterval = null;
    }
    console.log('Session cleanup service stopped');
  }
  
  private async performImmediateCleanup() {
    try {
      const now = new Date();
      
      // Delete expired sessions immediately
      const deletedSessions = await db
        .delete(sessions)
        .where(lt(sessions.expiresAt, now))
        .returning();
      
      if (deletedSessions.length > 0) {
        console.log(`Immediate session cleanup: removed ${deletedSessions.length} expired sessions`);
      }
      
      return {
        expiredSessions: deletedSessions.length
      };
    } catch (error) {
      console.error('Immediate session cleanup failed:', error);
      return {
        expiredSessions: 0
      };
    }
  }

  private async performCleanup() {
    try {
      const now = new Date();
      
      // Delete expired sessions
      const deletedSessions = await db
        .delete(sessions)
        .where(lt(sessions.expiresAt, now))
        .returning();
      
      if (deletedSessions.length > 0) {
        console.log(`Session cleanup completed: removed ${deletedSessions.length} expired sessions`);
      }
      
      // Additional cleanup: sessions older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldSessions = await db
        .delete(sessions)
        .where(lt(sessions.createdAt, thirtyDaysAgo))
        .returning();
      
      if (oldSessions.length > 0) {
        console.log(`Session cleanup: removed ${oldSessions.length} old sessions (30+ days)`);
      }
      
      return {
        expiredSessions: deletedSessions.length,
        oldSessions: oldSessions.length
      };
    } catch (error) {
      console.error('Session cleanup failed:', error);
      return {
        expiredSessions: 0,
        oldSessions: 0
      };
    }
  }
  
  async runCleanup() {
    return await this.performCleanup();
  }
  
  async getSessionStats() {
    try {
      const now = new Date();
      
      // Count total sessions
      const totalSessions = await db.select().from(sessions);
      
      // Count expired sessions
      const expiredSessions = await db
        .select()
        .from(sessions)
        .where(lt(sessions.expiresAt, now));
      
      return {
        total: totalSessions.length,
        expired: expiredSessions.length,
        active: totalSessions.length - expiredSessions.length
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return {
        total: 0,
        expired: 0,
        active: 0
      };
    }
  }
}

export const sessionCleanupService = new SessionCleanupService();