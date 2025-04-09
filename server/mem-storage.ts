import { 
  users, type User, type InsertUser, type LoginUser,
  notes, type Note, type InsertNote, type SearchNotesParams,
  bookmarks, type Bookmark, type InsertBookmark,
  messages, conversations, type Message, type InsertMessage, type Conversation
} from "../shared/schema";
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { IStorage } from './storage';

// Memory storage implementation for development/testing
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private notesMap: Map<number, Note>;
  private bookmarksMap: Map<number, Bookmark>;
  private messagesMap: Map<number, Message>;
  private conversationsMap: Map<number, Conversation>;
  private userCurrentId: number;
  private noteCurrentId: number;
  private bookmarkCurrentId: number;
  private messageCurrentId: number;
  private conversationCurrentId: number;
  private resetTokens: Map<string, { userId: number, expiry: Date }>;

  constructor() {
    this.users = new Map();
    this.notesMap = new Map();
    this.bookmarksMap = new Map();
    this.messagesMap = new Map();
    this.conversationsMap = new Map();
    this.userCurrentId = 1;
    this.noteCurrentId = 1;
    this.bookmarkCurrentId = 1;
    this.messageCurrentId = 1;
    this.conversationCurrentId = 1;
    this.resetTokens = new Map();
  }
  
  // User search method for messaging feature
  async searchUsers(query: string): Promise<User[]> {
    try {
      const lowerQuery = query.toLowerCase();
      // Search by USN, email, or department (case insensitive)
      return Array.from(this.users.values()).filter(user => 
        user.usn.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery) ||
        user.department.toLowerCase().includes(lowerQuery)
      ).slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
  
  // Bookmarks methods
  async createBookmark(userId: number, noteId: number): Promise<Bookmark> {
    try {
      // Check if bookmark already exists
      const existingBookmark = Array.from(this.bookmarksMap.values()).find(
        bookmark => bookmark.userId === userId && bookmark.noteId === noteId
      );
      
      if (existingBookmark) {
        return existingBookmark;
      }
      
      // Create new bookmark
      const id = this.bookmarkCurrentId++;
      const now = new Date();
      
      const bookmark: Bookmark = {
        id,
        userId,
        noteId,
        createdAt: now
      };
      
      this.bookmarksMap.set(id, bookmark);
      return bookmark;
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw error;
    }
  }
  
  async deleteBookmark(userId: number, noteId: number): Promise<boolean> {
    try {
      // Find the bookmark by userId and noteId
      const bookmark = Array.from(this.bookmarksMap.values()).find(
        bookmark => bookmark.userId === userId && bookmark.noteId === noteId
      );
      
      if (!bookmark) {
        return false;
      }
      
      // Delete the bookmark
      return this.bookmarksMap.delete(bookmark.id);
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      throw error;
    }
  }
  
  async getUserBookmarks(userId: number): Promise<Note[]> {
    try {
      // Get all bookmarks for this user
      const userBookmarks = Array.from(this.bookmarksMap.values())
        .filter(bookmark => bookmark.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Get the corresponding notes
      const bookmarkedNotes = userBookmarks
        .map(bookmark => this.notesMap.get(bookmark.noteId))
        .filter(note => note !== undefined) as Note[];
      
      return bookmarkedNotes;
    } catch (error) {
      console.error('Error fetching user bookmarks:', error);
      return [];
    }
  }
  
  async isNoteBookmarked(userId: number, noteId: number): Promise<boolean> {
    try {
      // Check if bookmark exists
      const bookmark = Array.from(this.bookmarksMap.values()).find(
        bookmark => bookmark.userId === userId && bookmark.noteId === noteId
      );
      
      return !!bookmark;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }
  
  // Messaging methods
  async sendMessage(senderId: number, receiverId: number, content: string, attachment?: string): Promise<Message> {
    try {
      // Check that both users exist
      const sender = this.users.get(senderId);
      const receiver = this.users.get(receiverId);
      
      if (!sender || !receiver) {
        throw new Error('Sender or receiver not found');
      }
      
      // Create message
      const id = this.messageCurrentId++;
      const now = new Date();
      
      const message: Message = {
        id,
        senderId,
        receiverId,
        content,
        attachment: attachment || null,
        isRead: false,
        sentAt: now
      };
      
      this.messagesMap.set(id, message);
      
      // Update or create conversation
      const sortedUserIds = [senderId, receiverId].sort((a, b) => a - b);
      const user1Id = sortedUserIds[0];
      const user2Id = sortedUserIds[1];
      
      // Check if conversation exists
      const existingConversation = Array.from(this.conversationsMap.values()).find(
        conv => conv.user1Id === user1Id && conv.user2Id === user2Id
      );
      
      if (existingConversation) {
        // Update existing conversation
        this.conversationsMap.set(existingConversation.id, {
          ...existingConversation,
          lastMessageAt: now
        });
      } else {
        // Create new conversation
        const convId = this.conversationCurrentId++;
        
        this.conversationsMap.set(convId, {
          id: convId,
          user1Id,
          user2Id,
          lastMessageAt: now
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
      return Array.from(this.messagesMap.values())
        .filter(message => 
          (message.senderId === userId && message.receiverId === otherUserId) ||
          (message.senderId === otherUserId && message.receiverId === userId)
        )
        .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    } catch (error) {
      console.error('Error fetching user messages:', error);
      return [];
    }
  }
  
  async markMessagesAsRead(userId: number, otherUserId: number): Promise<void> {
    try {
      // Mark all messages from the other user as read
      const messages = Array.from(this.messagesMap.entries())
        .filter(([_, message]) => 
          message.senderId === otherUserId && 
          message.receiverId === userId && 
          !message.isRead
        );
      
      for (const [id, message] of messages) {
        this.messagesMap.set(id, {
          ...message,
          isRead: true
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }
  
  async getUserConversations(userId: number): Promise<{conversation: Conversation, otherUser: User, lastMessage: Message}[]> {
    try {
      // Get all conversations this user is part of
      const userConversations = Array.from(this.conversationsMap.values())
        .filter(conv => conv.user1Id === userId || conv.user2Id === userId)
        .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      
      if (userConversations.length === 0) {
        return [];
      }
      
      // Get the details for each conversation
      const conversationsWithDetails = userConversations.map(conversation => {
        // Determine which user is the "other" user
        const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
        
        // Get the other user's details
        const otherUser = this.users.get(otherUserId);
        
        if (!otherUser) {
          return null;
        }
        
        // Get the most recent message in this conversation
        const messages = Array.from(this.messagesMap.values())
          .filter(message => 
            (message.senderId === userId && message.receiverId === otherUserId) ||
            (message.senderId === otherUserId && message.receiverId === userId)
          )
          .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
        
        const lastMessage = messages[0];
        
        if (!lastMessage) {
          return null;
        }
        
        return {
          conversation,
          otherUser,
          lastMessage
        };
      });
      
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
    // Find user by email
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      return null;
    }
    
    // Generate unique token
    const token = uuidv4();
    
    // Set token expiry for 1 hour
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1);
    
    // Update user in map
    this.users.set(user.id, {
      ...user,
      resetToken: token,
      resetTokenExpiry: tokenExpiry
    });
    
    return token;
  }
  
  async validateResetToken(token: string): Promise<User | null> {
    const now = new Date();
    
    // Find user with matching token that hasn't expired
    const user = Array.from(this.users.values()).find(
      (user) => user.resetToken === token && user.resetTokenExpiry && new Date(user.resetTokenExpiry) > now
    );
    
    return user || null;
  }
  
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.validateResetToken(token);
    
    if (!user) {
      return false;
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user
    this.users.set(user.id, {
      ...user,
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });
    
    return true;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUSN(usn: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.usn.toLowerCase() === usn.toLowerCase(),
    );
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
    const id = this.userCurrentId++;
    const user: User = { 
      ...userData, 
      id, 
      password: hashedPassword,
      profilePicture: null,
      notifyNewNotes: true,
      notifyDownloads: false,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }

  async validateLogin(loginData: LoginUser): Promise<User | null> {
    const user = await this.getUserByUSN(loginData.usn);
    
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async getNotes(params: SearchNotesParams): Promise<Note[]> {
    const allNotes = Array.from(this.notesMap.values());
    
    // Filter by specific userId if provided (for user stats)
    if (params.userId !== undefined) {
      return allNotes
        .filter(note => note.userId === params.userId)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    }
    
    return allNotes.filter(note => {
      // Use department filter if provided, otherwise use userDepartment if available
      let departmentMatch = true;
      if (params.department) {
        departmentMatch = note.department === params.department;
      } else if (params.userDepartment) {
        departmentMatch = note.department === params.userDepartment;
      }
      
      // Use year filter if provided, otherwise use userYear if available
      let yearMatch = true;
      if (params.year !== undefined) {
        yearMatch = note.year === params.year;
      } else if (params.userYear !== undefined) {
        yearMatch = note.year === params.userYear;
      }
      
      const subjectMatch = !params.subject || note.subject === params.subject;
      
      return departmentMatch && yearMatch && subjectMatch;
    }).sort((a, b) => {
      // Sort by most recently uploaded
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }

  async getNoteById(id: number): Promise<Note | undefined> {
    return this.notesMap.get(id);
  }

  async createNote(insertNote: InsertNote, userId: number): Promise<Note> {
    const id = this.noteCurrentId++;
    // Create note without the semester field since it doesn't exist in the database yet
    const note = { 
      ...insertNote, 
      id,
      userId,
      uploadedAt: new Date(),
      isFlagged: false,
      flagReason: null,
      reviewedAt: null
    } as Note;
    this.notesMap.set(id, note);
    return note;
  }

  async deleteNote(id: number): Promise<boolean> {
    return this.notesMap.delete(id);
  }

  async updateUserSettings(userId: number, settings: { notifyNewNotes?: boolean, notifyDownloads?: boolean }): Promise<User> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = {
      ...user,
      ...settings
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    
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
    
    // Update user in map
    this.users.set(userId, {
      ...user,
      password: hashedPassword
    });
    
    return true;
  }

  async updateProfilePicture(userId: number, profilePicture: string): Promise<User> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = {
      ...user,
      profilePicture
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Content moderation methods
  async flagNote(noteId: number, reason: string): Promise<Note> {
    const note = this.notesMap.get(noteId);
    
    if (!note) {
      throw new Error("Note not found");
    }
    
    const flaggedNote = {
      ...note,
      isFlagged: true,
      flagReason: reason
    };
    
    this.notesMap.set(noteId, flaggedNote);
    return flaggedNote;
  }
  
  async getFlaggedNotes(): Promise<Note[]> {
    const allNotes = Array.from(this.notesMap.values());
    return allNotes.filter(note => note.isFlagged === true)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  
  async reviewFlaggedNote(noteId: number, approved: boolean): Promise<Note> {
    const note = this.notesMap.get(noteId);
    
    if (!note) {
      throw new Error("Note not found");
    }
    
    if (approved) {
      // If approved, unflag the note
      const updatedNote = {
        ...note,
        isFlagged: false,
        flagReason: null,
        reviewedAt: new Date()
      };
      
      this.notesMap.set(noteId, updatedNote);
      return updatedNote;
    } else {
      // If not approved, delete the note
      this.notesMap.delete(noteId);
      return note;
    }
  }
  
  // These methods are stubs for future implementation
  async incrementNoteViewCount(noteId: number): Promise<void> {
    // Placeholder for future viewCount implementation
    console.log(`View count would be incremented for note ${noteId}`);
    return;
  }
  
  async incrementNoteDownloadCount(noteId: number): Promise<void> {
    // Placeholder for future downloadCount implementation
    console.log(`Download count would be incremented for note ${noteId}`);
    return;
  }
}