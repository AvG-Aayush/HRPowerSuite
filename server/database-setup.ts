import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface SetupResult {
  success: boolean;
  message: string;
  adminUser?: any;
}

export async function setupDatabase(): Promise<SetupResult> {
  try {
    console.log('Setting up database...');

    // Check if database is accessible
    try {
      await db.select().from(users).limit(1);
      console.log('Database connection verified');
    } catch (error) {
      console.error('Database connection failed:', error);
      return {
        success: false,
        message: 'Database connection failed. Please check DATABASE_URL environment variable.'
      };
    }

    // Run schema migrations
    try {
      await db.execute(sql`ALTER TABLE projects DROP COLUMN IF EXISTS estimated_hours`);
      console.log('Removed estimated_hours column from projects table');
    } catch (migrationError) {
      console.log('Migration already applied or column does not exist');
    }

    // Check if any users exist at all
    const allUsers = await db.select().from(users);

    if (allUsers.length === 0) {
      console.log('No users found in database, creating default admin user...');
      
      // Create default admin user with username: admin, password: admin123
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const [adminUser] = await db
        .insert(users)
        .values({
          username: 'admin',
          email: 'admin@hrplatform.com',
          password: hashedPassword,
          fullName: 'System Administrator',
          role: 'admin',
          department: 'Administration',
          position: 'System Administrator',
          isActive: true,
        })
        .returning();

      console.log('Default admin user created with credentials: admin / admin123');
      return {
        success: true,
        message: 'Database setup completed. Default admin user created with username: admin, password: admin123',
        adminUser: {
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role
        }
      };
    } else {
      // Check if admin user exists
      const existingAdmin = allUsers.find(user => user.role === 'admin');
      
      if (!existingAdmin) {
        console.log('Users exist but no admin user found, creating default admin...');
        
        // Create default admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const [adminUser] = await db
          .insert(users)
          .values({
            username: 'admin',
            email: 'admin@hrplatform.com',
            password: hashedPassword,
            fullName: 'System Administrator',
            role: 'admin',
            department: 'Administration',
            position: 'System Administrator',
            isActive: true,
          })
          .returning();

        console.log('Default admin user created with credentials: admin / admin123');
        return {
          success: true,
          message: 'Default admin user created with username: admin, password: admin123',
          adminUser: {
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role
          }
        };
      } else {
        console.log('Admin user already exists');
        return {
          success: true,
          message: 'Database already configured.',
          adminUser: {
            username: existingAdmin.username,
            email: existingAdmin.email,
            role: existingAdmin.role
          }
        };
      }
    }
  } catch (error) {
    console.error('Database setup failed:', error);
    return {
      success: false,
      message: `Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function validateAuthenticationSystem(): Promise<SetupResult> {
  try {
    console.log('Validating authentication system...');

    // Test database connection
    const connectionTest = await db.select().from(users).limit(1);
    console.log('Database connection: OK');

    // Check if any users exist
    const userCount = await db.select().from(users);
    console.log(`Total users in database: ${userCount.length}`);

    if (userCount.length === 0) {
      return {
        success: false,
        message: 'No users found in database. Please run database setup.'
      };
    }

    // Test admin user authentication
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));

    if (adminUsers.length === 0) {
      return {
        success: false,
        message: 'No admin users found. Please create an admin user.'
      };
    }

    console.log('Authentication system validation: OK');
    return {
      success: true,
      message: 'Authentication system is properly configured.',
      adminUser: {
        username: adminUsers[0].username,
        email: adminUsers[0].email,
        role: adminUsers[0].role
      }
    };
  } catch (error) {
    console.error('Authentication validation failed:', error);
    return {
      success: false,
      message: `Authentication validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}