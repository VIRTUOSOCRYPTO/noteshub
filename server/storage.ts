import { 
  users, type User, type InsertUser, type LoginUser,
  notes, type Note, type InsertNote, type SearchNotesParams,
  bookmarks, type Bookmark, type InsertBookmark,
  messages, conversations, type Message, type InsertMessage, type Conversation
} from "@shared/schema";
import * as bcrypt from 'bcryptjs';
import { db } from "./db";
import { eq, desc, and, or, SQL, sql, gt, asc } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
// Import the MemStorage implementation
import { MemStorage } from './mem-storage';

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUSN(usn: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  registerUser(userData: InsertUser): Promise<User>;
  validateLogin(loginData: LoginUser): Promise<User | null>;
  authenticateWithGoogle(email: string): Promise<User | null>; // Google authentication
  updateUserSettings(userId: number, settings: { notifyNewNotes?: boolean, notifyDownloads?: boolean }): Promise<User>;
  updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;
  updateProfilePicture(userId: number, profilePicture: string): Promise<User>;
  searchUsers(query: string): Promise<User[]>; // For direct messaging user search
  
  // Password reset methods
  createPasswordResetToken(email: string): Promise<string | null>; // Returns token or null if email not found
  validateResetToken(token: string): Promise<User | null>; // Returns user if token is valid
  resetPassword(token: string, newPassword: string): Promise<boolean>; // Sets new password if token is valid
  
  // JWT refresh token methods
  storeRefreshToken(userId: number, token: string): Promise<void>;
  validateRefreshToken(token: string): Promise<User | null>;
  revokeRefreshToken(userId: number): Promise<void>;
  
  // 2FA methods
  setupTwoFactor(userId: number): Promise<{ secret: string, qrCodeUrl: string }>;
  verifyAndEnableTwoFactor(userId: number, token: string): Promise<boolean>;
  disableTwoFactor(userId: number): Promise<boolean>;
  isTwoFactorEnabled(userId: number): Promise<boolean>;
  validateTwoFactorToken(userId: number, token: string): Promise<boolean>;
  
  // Notes related methods
  getNotes(params: SearchNotesParams): Promise<Note[]>;
  getNoteById(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote, userId: number): Promise<Note>;
  deleteNote(id: number): Promise<boolean>;
  incrementNoteViewCount(noteId: number): Promise<void>;
  incrementNoteDownloadCount(noteId: number): Promise<void>;
  
  // Content moderation methods
  flagNote(noteId: number, reason: string): Promise<Note>;
  getFlaggedNotes(): Promise<Note[]>;
  reviewFlaggedNote(noteId: number, approved: boolean): Promise<Note>;
  
  // Bookmark feature
  createBookmark(userId: number, noteId: number): Promise<Bookmark>;
  deleteBookmark(userId: number, noteId: number): Promise<boolean>;
  getUserBookmarks(userId: number): Promise<Note[]>;
  isNoteBookmarked(userId: number, noteId: number): Promise<boolean>;
  
  // Messaging feature
  sendMessage(senderId: number, receiverId: number, content: string, attachment?: string): Promise<Message>;
  getUserMessages(userId: number, otherUserId: number): Promise<Message[]>;
  markMessagesAsRead(userId: number, otherUserId: number): Promise<void>;
  getUserConversations(userId: number): Promise<{conversation: Conversation, otherUser: User, lastMessage: Message}[]>;
}

export class DatabaseStorage implements IStorage {
  
  // JWT Refresh Token methods
  async storeRefreshToken(userId: number, token: string): Promise<void> {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 7); // 7 days from now
    
    try {
      await db
        .update(users)
        .set({
          refreshToken: token,
          refreshTokenExpiry: expiry
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw error;
    }
  }
  
  async validateRefreshToken(token: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.refreshToken, token),
            gt(users.refreshTokenExpiry!, new Date())
          )
        );
      
      return user || null;
    } catch (error) {
      console.error('Error validating refresh token:', error);
      return null;
    }
  }
  
  async revokeRefreshToken(userId: number): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          refreshToken: null,
          refreshTokenExpiry: null
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw error;
    }
  }
  
  // 2FA methods
  async setupTwoFactor(userId: number): Promise<{ secret: string, qrCodeUrl: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Import here to avoid circular dependencies
    const { generateSecret, generateQRCode } = await import('./two-factor');
    
    // Generate new secret
    const secret = generateSecret();
    
    // Generate QR code
    const qrCodeUrl = await generateQRCode(user, secret);
    
    // Store secret (but don't enable 2FA yet)
    await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorEnabled: false
      })
      .where(eq(users.id, userId));
    
    return { secret, qrCodeUrl };
  }
  
  async verifyAndEnableTwoFactor(userId: number, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.twoFactorSecret) {
      return false;
    }
    
    // Import here to avoid circular dependencies
    const { verifyToken } = await import('./two-factor');
    
    // Verify the token
    const isValid = verifyToken(token, user.twoFactorSecret);
    
    if (isValid) {
      // Enable 2FA
      await db
        .update(users)
        .set({
          twoFactorEnabled: true
        })
        .where(eq(users.id, userId));
      
      return true;
    }
    
    return false;
  }
  
  async disableTwoFactor(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }
    
    try {
      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return false;
    }
  }
  
  async isTwoFactorEnabled(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    return !!user?.twoFactorEnabled;
  }
  
  async validateTwoFactorToken(userId: number, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      return false;
    }
    
    // Import here to avoid circular dependencies
    const { verifyToken } = await import('./two-factor');
    
    // Verify the token
    return verifyToken(token, user.twoFactorSecret);
  }
  
  // User search method for messaging feature
  async searchUsers(query: string): Promise<User[]> {
    try {
      // Search by USN, email, or department (case insensitive)
      return await db
        .select()
        .from(users)
        .where(
          or(
            sql`LOWER(${users.usn}) LIKE ${`%${query.toLowerCase()}%`}`,
            sql`LOWER(${users.email}) LIKE ${`%${query.toLowerCase()}%`}`,
            sql`LOWER(${users.department}) LIKE ${`%${query.toLowerCase()}%`}`
          )
        )
        .limit(10); // Limit search results
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
  
  // Bookmarks methods
  async createBookmark(userId: number, noteId: number): Promise<Bookmark> {
    try {
      // Check if bookmark already exists
      const existingBookmark = await db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.noteId, noteId)
          )
        )
        .limit(1);
        
      if (existingBookmark.length > 0) {
        return existingBookmark[0];
      }
      
      // Create new bookmark
      const [bookmark] = await db
        .insert(bookmarks)
        .values({
          userId,
          noteId
        })
        .returning();
        
      return bookmark;
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw error;
    }
  }
  
  async deleteBookmark(userId: number, noteId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.noteId, noteId)
          )
        );
      
      return result !== undefined && result !== null;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      throw error;
    }
  }
  
  async getUserBookmarks(userId: number): Promise<Note[]> {
    try {
      // Join bookmarks and notes tables to get the bookmarked notes
      const result = await db
        .select({
          note: notes
        })
        .from(bookmarks)
        .innerJoin(notes, eq(bookmarks.noteId, notes.id))
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.createdAt));
      
      return result.map(row => row.note);
    } catch (error) {
      console.error('Error fetching user bookmarks:', error);
      return [];
    }
  }
  
  async isNoteBookmarked(userId: number, noteId: number): Promise<boolean> {
    try {
      const bookmark = await db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.noteId, noteId)
          )
        )
        .limit(1);
      
      return bookmark.length > 0;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }
  
  // Messaging methods
  async sendMessage(senderId: number, receiverId: number, content: string, attachment?: string): Promise<Message> {
    try {
      // Check that both users exist
      const sender = await this.getUser(senderId);
      const receiver = await this.getUser(receiverId);
      
      if (!sender || !receiver) {
        throw new Error('Sender or receiver not found');
      }
      
      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          senderId,
          receiverId,
          content,
          attachment: attachment || null,
          isRead: false
        })
        .returning();
      
      // Update or create conversation
      const sortedUserIds = [senderId, receiverId].sort((a, b) => a - b);
      const user1Id = sortedUserIds[0];
      const user2Id = sortedUserIds[1];
      
      // Check if conversation exists
      const existingConversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.user1Id, user1Id),
            eq(conversations.user2Id, user2Id)
          )
        )
        .limit(1);
      
      if (existingConversation.length > 0) {
        // Update existing conversation
        await db
          .update(conversations)
          .set({
            lastMessageAt: new Date()
          })
          .where(
            and(
              eq(conversations.user1Id, user1Id),
              eq(conversations.user2Id, user2Id)
            )
          );
      } else {
        // Create new conversation
        await db
          .insert(conversations)
          .values({
            user1Id,
            user2Id,
            lastMessageAt: new Date()
          });
      }
      
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  async getUserMessages(userId: number, otherUserId: number): Promise<Message[]> {
    try {
      // Get all messages between the two users
      return await db
        .select()
        .from(messages)
        .where(
          or(
            and(
              eq(messages.senderId, userId),
              eq(messages.receiverId, otherUserId)
            ),
            and(
              eq(messages.senderId, otherUserId),
              eq(messages.receiverId, userId)
            )
          )
        )
        .orderBy(asc(messages.sentAt));
    } catch (error) {
      console.error('Error fetching user messages:', error);
      return [];
    }
  }
  
  async markMessagesAsRead(userId: number, otherUserId: number): Promise<void> {
    try {
      // Mark all messages from the other user as read
      await db
        .update(messages)
        .set({
          isRead: true
        })
        .where(
          and(
            eq(messages.senderId, otherUserId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        );
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }
  
  async getUserConversations(userId: number): Promise<{conversation: Conversation, otherUser: User, lastMessage: Message}[]> {
    try {
      // Get all conversations this user is part of
      const userConversations = await db
        .select()
        .from(conversations)
        .where(
          or(
            eq(conversations.user1Id, userId),
            eq(conversations.user2Id, userId)
          )
        )
        .orderBy(desc(conversations.lastMessageAt));
      
      if (userConversations.length === 0) {
        return [];
      }
      
      // Get the details for each conversation
      const conversationsWithDetails = await Promise.all(
        userConversations.map(async (conversation) => {
          // Determine which user is the "other" user
          const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
          
          // Get the other user's details
          const otherUser = await this.getUser(otherUserId);
          
          if (!otherUser) {
            return null;
          }
          
          // Get the most recent message in this conversation
          const [lastMessage] = await db
            .select()
            .from(messages)
            .where(
              or(
                and(
                  eq(messages.senderId, userId),
                  eq(messages.receiverId, otherUserId)
                ),
                and(
                  eq(messages.senderId, otherUserId),
                  eq(messages.receiverId, userId)
                )
              )
            )
            .orderBy(desc(messages.sentAt))
            .limit(1);
          
          if (!lastMessage) {
            return null;
          }
          
          return {
            conversation,
            otherUser,
            lastMessage
          };
        })
      );
      
      // Filter out any null results
      return conversationsWithDetails.filter(item => item !== null) as {
        conversation: Conversation;
        otherUser: User;
        lastMessage: Message;
      }[];
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      return [];
    }
  }
  // Password reset methods
  async createPasswordResetToken(email: string): Promise<string | null> {
    try {
      // Find user by email
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        // No user found with this email
        console.log(`No user found with email: ${email}`);
        return null;
      }
      
      // Generate a unique token
      const token = uuidv4();
      
      // Set token expiry for 1 hour from now
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 1);
      
      console.log(`Setting reset token for user: ${user.id}, email: ${email}, token: ${token.slice(0, 8)}...`);
      
      // Save token to database
      try {
        await db
          .update(users)
          .set({
            resetToken: token,
            resetTokenExpiry: tokenExpiry
          })
          .where(eq(users.id, user.id));
        
        console.log('Reset token set successfully');
        return token;
      } catch (updateError) {
        console.error('Error updating reset token:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error in createPasswordResetToken:', error);
      throw error;
    }
  }
  
  async validateResetToken(token: string): Promise<User | null> {
    try {
      console.log(`Validating reset token: ${token.slice(0, 8)}...`);
      
      // Find user with this token and check it isn't expired
      const query = db
        .select()
        .from(users)
        .where(
          and(
            eq(users.resetToken, token),
            // Use coalesce to handle null values for reset_token_expiry
            gt(users.resetTokenExpiry, new Date())
          )
        );
      
      console.log('Reset token validation query:', query.toSQL());
      
      const [user] = await query;
      
      if (!user) {
        console.log('No user found with this reset token or token expired');
        return null; // Token invalid or expired
      }
      
      console.log(`Reset token valid for user: ${user.id}, email: ${user.email}`);
      return user;
    } catch (error) {
      console.error('Error validating reset token:', error);
      throw error;
    }
  }
  
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      console.log(`Attempting to reset password with token: ${token.slice(0, 8)}...`);
      
      // Validate the token
      const user = await this.validateResetToken(token);
      
      if (!user) {
        console.log('Reset password failed: Invalid or expired token');
        return false; // Invalid or expired token
      }
      
      console.log(`Resetting password for user: ${user.id}, email: ${user.email}`);
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password and remove token
      try {
        const updateQuery = db
          .update(users)
          .set({
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
          })
          .where(eq(users.id, user.id));
          
        console.log('Reset password update query:', updateQuery.toSQL());
        
        await updateQuery;
        console.log('Password reset successfully');
        return true;
      } catch (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUSN(usn: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(sql`LOWER(${users.usn})`, usn.toLowerCase()));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(sql`LOWER(${users.email})`, email.toLowerCase()));
    return user;
  }

  async registerUser(userData: InsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByUSN(userData.usn);
    if (existingUser) {
      throw new Error("USN already registered");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create new user
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
        notifyNewNotes: true,
        notifyDownloads: false
      })
      .returning();
    
    return user;
  }

  // Track failed login attempts
  private loginAttempts = new Map<string, { count: number, lastAttempt: Date }>();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

  async validateLogin(loginData: LoginUser): Promise<User | null> {
    const user = await this.getUserByUSN(loginData.usn);
    
    // If user doesn't exist, return null but don't track attempts 
    // (to prevent username enumeration)
    if (!user) {
      return null;
    }
    
    // Check if account is locked due to too many failed attempts
    const attempts = this.loginAttempts.get(user.usn);
    if (attempts && attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = new Date(attempts.lastAttempt.getTime() + this.LOCKOUT_DURATION);
      if (new Date() < lockoutTime) {
        // Account is still locked
        throw new Error(`Account temporarily locked due to too many failed login attempts. Please try again later or reset your password.`);
      } else {
        // Lockout period has expired, reset attempts
        this.loginAttempts.delete(user.usn);
      }
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    
    if (!isPasswordValid) {
      // Track failed attempt
      if (!attempts) {
        this.loginAttempts.set(user.usn, { count: 1, lastAttempt: new Date() });
      } else {
        this.loginAttempts.set(user.usn, { 
          count: attempts.count + 1, 
          lastAttempt: new Date() 
        });
      }
      return null;
    }

    // Successful login, clear any failed attempts
    this.loginAttempts.delete(user.usn);
    return user;
  }
  
  /**
   * Authenticates a user with Google
   * @param email - The user's email address from Google profile
   * @returns The user object if authentication is successful, null otherwise
   */
  async authenticateWithGoogle(email: string): Promise<User | null> {
    try {
      // First check if the user already exists with this email
      const user = await this.getUserByEmail(email);
      
      if (user) {
        // User exists, return the user object
        return user;
      }
      
      // User doesn't exist in our system yet, create a new account
      // Extract domain from email to determine college/department if possible
      const domain = email.split('@')[1];
      
      // Generate a unique USN for Google users
      const googlePrefix = 'G';
      const randomCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const usn = `${googlePrefix}${randomCode}`;
      
      // Determine department if possible (default to Computer Science)
      const department = 'Computer Science';
      
      // Create a random secure password for Google users
      // (they'll never use this password directly)
      const password = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create the new user
      const newUser = await this.registerUser({
        usn,
        email,
        password: hashedPassword,
        department,
        college: "", // Can be determined later if needed
        year: 1, // Default to first year for Google users
        notifyNewNotes: true,
        notifyDownloads: true
      });
      
      return newUser;
    } catch (error) {
      console.error('Error authenticating with Google:', error);
      return null;
    }
  }

  async getNotes(params: SearchNotesParams): Promise<Note[]> {
    console.log('Storage getNotes params:', params);
    
    // Filter by specific userId if provided (for user stats)
    if (params.userId !== undefined) {
      console.log('Filtering by user ID:', params.userId);
      try {
        // When filtering by user ID, we need to make sure we're not filtering by year
        // This is important for user stats so they can see all their notes
        const userNotes = await db
          .select()
          .from(notes)
          .where(eq(notes.userId, params.userId))
          .execute();
        
        return userNotes;
      } catch (error) {
        console.error('Error fetching user notes:', error);
        return [];
      }
    }
    
    // COLLEGE FILTERING
    // Check if showing notes from all colleges or just the user's college
    const showAllColleges = params.showAllColleges === true;
    // If not showing all colleges and user's college is provided, filter by it
    if (!showAllColleges && params.userCollege) {
      console.log('Filtering by user college:', params.userCollege);
      
      // Build our conditions array for college filtering
      let collegeConditions: SQL[] = [eq(users.college, params.userCollege!)];
      
      // Add department filtering conditions if needed
      const showAllDepts = params.showAllDepartments === true;
      
      if (!showAllDepts) {
        // Not showing all departments, apply department filters
        if (params.department) {
          console.log('Filtering by selected department:', params.department);
          collegeConditions.push(eq(notes.department, params.department));
        } else if (params.userDepartment) {
          console.log('Filtering by user department:', params.userDepartment);
          collegeConditions.push(eq(notes.department, params.userDepartment));
        }
      } else if (params.department) {
        // If showing all departments but a specific one is selected
        console.log('Showing all departments but filtering by selected:', params.department);
        collegeConditions.push(eq(notes.department, params.department));
      }
      
      // Add year filtering for backward compatibility
      const showAllYears = params.showAllYears === true;
      if (!showAllYears && params.year && params.year > 0) {
        console.log('Filtering by year:', params.year);
        collegeConditions.push(eq(notes.year, params.year));
      } else if (!showAllYears && params.userYear && params.userYear > 0) {
        console.log('Filtering by user year:', params.userYear);
        collegeConditions.push(eq(notes.year, params.userYear));
      }
      
      // Add subject filter if provided
      if (params.subject) {
        console.log('Filtering by subject:', params.subject);
        collegeConditions.push(eq(notes.subject, params.subject));
      }
      
      try {
        // Join with users table to get the college information
        const result = await db
          .select()
          .from(notes)
          .innerJoin(users, eq(notes.userId, users.id))
          .where(and(...collegeConditions))
          .orderBy(desc(notes.uploadedAt));
        
        // Return notes without modifications
        return result.map(row => ({
          ...row.notes
        }));
      } catch (error) {
        console.error('Error in getNotes college filtering query:', error);
        // Fallback to a more basic query if there are column issues
        const fallbackResult = await db
          .select()
          .from(notes)
          .orderBy(desc(notes.uploadedAt));
          
        return fallbackResult;
      }
    } 
    
    // If showing all colleges or no user college provided, use the standard filtering approach
    
    // DEPARTMENT FILTERING
    const showAllDepts = params.showAllDepartments === true;
    const standardConditions: SQL[] = [];
    
    if (showAllDepts) {
      console.log('🚀 Showing all departments, no department filter applied');
      // If department is explicitly selected even with showAllDepartments=true, we still filter by it
      if (params.department) {
        console.log('But still filtering by selected department:', params.department);
        standardConditions.push(eq(notes.department, params.department));
      }
    } else {
      // Not showing all departments, apply department filters
      if (params.department) {
        console.log('Filtering by selected department:', params.department);
        standardConditions.push(eq(notes.department, params.department));
      } else if (params.userDepartment) {
        console.log('Filtering by user department:', params.userDepartment);
        standardConditions.push(eq(notes.department, params.userDepartment));
      }
    }
    
    // YEAR FILTERING - Only show notes from the same year as the user
    // This is crucial for the academic year restriction feature
    const showAllYears = params.showAllYears === true;
    
    // If not showing all years, we filter by year
    if (!showAllYears) {
      if (params.year && params.year > 0) {
        // If a specific year is provided in the query, use that
        console.log('Filtering by specific year:', params.year);
        standardConditions.push(eq(notes.year, params.year));
      } else if (params.userYear && params.userYear > 0) {
        // Otherwise use the logged-in user's year
        console.log('Filtering by user year:', params.userYear);
        standardConditions.push(eq(notes.year, params.userYear));
      } else {
        console.log('Year filtering requested but no year provided - defaulting to all years');
      }
    } else {
      console.log('Showing notes from all years');
    }
    
    // Add subject filter if provided
    if (params.subject) {
      console.log('Filtering by subject:', params.subject);
      standardConditions.push(eq(notes.subject, params.subject));
    }
    
    try {
      // Execute query with conditions (if any)
      let result: Note[];
      if (standardConditions.length > 0) {
        const query = db.select().from(notes).where(and(...standardConditions)).orderBy(desc(notes.uploadedAt));
        console.log('SQL Query with conditions:', query.toSQL());
        result = await query;
      } else {
        const query = db.select().from(notes).orderBy(desc(notes.uploadedAt));
        console.log('SQL Query without conditions:', query.toSQL());
        result = await query;
      }
      
      console.log('Query result count:', result.length);
      return result;
    } catch (error) {
      console.error('Error in getNotes standard query:', error);
      // Return empty array if there's an error
      return [];
    }
  }

  async getNoteById(id: number): Promise<Note | undefined> {
    try {
      const [note] = await db.select().from(notes).where(eq(notes.id, id));
      
      if (!note) return undefined;
      
      return note;
    } catch (error) {
      console.error('Error in getNoteById:', error);
      return undefined;
    }
  }

  async createNote(insertNote: InsertNote, userId: number): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values({
        ...insertNote,
        userId,
      })
      .returning();
      
    return note;
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await db.delete(notes).where(eq(notes.id, id));
    // For postgres-js, we just check if the operation was successful
    return result !== undefined && result !== null;
  }

  async updateUserSettings(userId: number, settings: { notifyNewNotes?: boolean, notifyDownloads?: boolean }): Promise<User> {
    // Update user settings
    const [updatedUser] = await db
      .update(users)
      .set(settings)
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    // Get the user
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword
      })
      .where(eq(users.id, userId));
    
    return true;
  }

  async updateProfilePicture(userId: number, profilePicture: string): Promise<User> {
    // Update profile picture and return updated user
    const [updatedUser] = await db
      .update(users)
      .set({
        profilePicture
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  async flagNote(noteId: number, reason: string): Promise<Note> {
    const [flaggedNote] = await db
      .update(notes)
      .set({
        isFlagged: true,
        flagReason: reason
      })
      .where(eq(notes.id, noteId))
      .returning();
    
    if (!flaggedNote) {
      throw new Error("Note not found");
    }
    
    return flaggedNote;
  }
  
  async getFlaggedNotes(): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.isFlagged, true))
      .orderBy(desc(notes.uploadedAt));
  }
  
  async reviewFlaggedNote(noteId: number, approved: boolean): Promise<Note> {
    const note = await this.getNoteById(noteId);
    
    if (!note) {
      throw new Error("Note not found");
    }
    
    if (approved) {
      // If approved, unflag the note
      const [updatedNote] = await db
        .update(notes)
        .set({
          isFlagged: false,
          flagReason: null,
          reviewedAt: new Date()
        })
        .where(eq(notes.id, noteId))
        .returning();
      
      return updatedNote;
    } else {
      // If not approved, delete the note
      await this.deleteNote(noteId);
      return note;
    }
  }

  async incrementNoteViewCount(noteId: number): Promise<void> {
    console.log(`View count would be incremented for note ${noteId}`);
    // Placeholder for future viewCount implementation
    return;
  }
  
  async incrementNoteDownloadCount(noteId: number): Promise<void> {
    console.log(`Download count would be incremented for note ${noteId}`);
    // Placeholder for future downloadCount implementation
    return;
  }
}

// Switch to database storage
// Try to use database storage, but fall back to in-memory storage if there's an issue
let isUsingFallbackStorage = false;
let storageInstance: IStorage;

try {
  storageInstance = new DatabaseStorage();
  console.log('Using database storage for data persistence');
} catch (error) {
  console.error('Database storage initialization failed, falling back to in-memory storage:', error);
  // Create a proper implementation of IStorage that meets all interface requirements
  storageInstance = new MemStorage() as unknown as IStorage;
  isUsingFallbackStorage = true;
  console.log('Using in-memory storage as fallback');
}

export const storage = storageInstance;
export const isFallbackStorage = () => isUsingFallbackStorage;
