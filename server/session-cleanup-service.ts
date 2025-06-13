import { db } from './db';
import { sessions } from '../shared/schema';
import { lt } from 'drizzle-orm';

export class SessionCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  start() {
    if (this.cleanupInterval) {
      console.log('Session cleanup service already running');
      return;
    }
    
    console.log('Session cleanup service started - runs every hour');
    
    // Run initial cleanup
    this.performCleanup();
    
    // Schedule regular cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Session cleanup service stopped');
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
      
      return {
        expiredSessions: deletedSessions.length
      };
    } catch (error) {
      console.error('Session cleanup failed:', error);
      return {
        expiredSessions: 0
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