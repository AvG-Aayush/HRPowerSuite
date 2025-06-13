import { db } from './db';
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
    
    console.log('Session cleanup service disabled - session table structure mismatch');
    
    // Disable cleanup temporarily due to table structure issues
    // TODO: Fix session table structure to match expected schema
    return;
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
      
      // Check if session table exists first
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'session'
        );
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        console.log('Session table does not exist, skipping cleanup');
        return { expiredSessions: 0 };
      }
      
      // Delete expired sessions immediately using raw SQL
      const result = await db.execute(`
        DELETE FROM session 
        WHERE expires_at < '${now.toISOString()}'
        RETURNING id;
      `);
      
      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        console.log(`Immediate session cleanup: removed ${deletedCount} expired sessions`);
      }
      
      return {
        expiredSessions: deletedCount
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
      
      // Check if session table exists first
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'session'
        );
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        console.log('Session table does not exist, skipping cleanup');
        return { expiredSessions: 0, oldSessions: 0 };
      }
      
      // Delete expired sessions
      const expiredResult = await db.execute(`
        DELETE FROM session 
        WHERE expires_at < '${now.toISOString()}'
        RETURNING id;
      `);
      
      const deletedExpired = expiredResult.rowCount || 0;
      
      if (deletedExpired > 0) {
        console.log(`Session cleanup completed: removed ${deletedExpired} expired sessions`);
      }
      
      // Additional cleanup: sessions older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldResult = await db.execute(`
        DELETE FROM session 
        WHERE created_at < '${thirtyDaysAgo.toISOString()}'
        RETURNING id;
      `);
      
      const deletedOld = oldResult.rowCount || 0;
      
      if (deletedOld > 0) {
        console.log(`Session cleanup: removed ${deletedOld} old sessions (30+ days)`);
      }
      
      return {
        expiredSessions: deletedExpired,
        oldSessions: deletedOld
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
      
      // Check if session table exists first
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'session'
        );
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        console.log('Session table does not exist');
        return { total: 0, expired: 0, active: 0 };
      }
      
      // Count total sessions
      const totalResult = await db.execute(`SELECT COUNT(*) as count FROM session;`);
      const total = parseInt(totalResult.rows[0]?.count || '0');
      
      // Count expired sessions
      const expiredResult = await db.execute(`
        SELECT COUNT(*) as count FROM session WHERE expires_at < '${now.toISOString()}';
      `);
      const expired = parseInt(expiredResult.rows[0]?.count || '0');
      
      return {
        total,
        expired,
        active: total - expired
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