import { pgTable, text, serial, timestamp, boolean, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// List of valid departments for validation
export const VALID_DEPARTMENTS = [
  "NT", "EEE", "ECE", "CSE", "ISE", "AIML", "AIDS", "MECH", 
  "CH", "IEM", "ETE", "CVE", "BTE", "EIE"
];

// Mapping between USN department codes and department values
export const DEPARTMENT_CODES: Record<string, string> = {
  // Common department codes
  "CS": "CSE",    // Computer Science
  "EC": "ECE",    // Electronics and Communication
  "IS": "ISE",    // Information Science
  "EE": "EEE",    // Electrical Engineering
  "ME": "MECH",   // Mechanical Engineering
  "CH": "CH",     // Chemical Engineering
  "NT": "NT",     // Nanotechnology
  "IM": "IEM",    // Industrial Engineering and Management
  "ET": "ETE",    // Electronics and Telecommunication
  "CI": "AIML",   // Artificial Intelligence and Machine Learning
  "AD": "AIDS",   // AI and Data Science
  "CV": "CVE",    // Civil Engineering
  "BT": "BTE",    // Biotechnology
  "EI": "EIE",    // Electronics and Instrumentation
};

// List of top engineering colleges in Karnataka
export const KARNATAKA_COLLEGES = [
  { value: "rvce", label: "R.V. College of Engineering, Bengaluru" },
  { value: "msrit", label: "M.S. Ramaiah Institute of Technology, Bengaluru" },
  { value: "bmsce", label: "B.M.S. College of Engineering, Bengaluru" },
  { value: "pesit", label: "PES University, Bengaluru" },
  { value: "dsce", label: "Dayananda Sagar College of Engineering, Bengaluru" },
  { value: "nie", label: "National Institute of Engineering, Mysuru" },
  { value: "sit", label: "Siddaganga Institute of Technology, Tumkuru" },
  { value: "ait", label: "Acharya Institute of Technology, Bengaluru" },
  { value: "jssate", label: "JSS Academy of Technical Education, Bengaluru" },
  { value: "sjbit", label: "SJB Institute of Technology, Bengaluru" },
  { value: "sjce", label: "Sri Jayachamarajendra College of Engineering, Mysuru" },
  { value: "nmit", label: "Nitte Meenakshi Institute of Technology, Bengaluru" },
  { value: "biet", label: "Bapuji Institute of Engineering and Technology, Davangere" },
  { value: "cmrit", label: "CMR Institute of Technology, Bengaluru" },
  { value: "rnsit", label: "RNS Institute of Technology, Bengaluru" },
  { value: "other", label: "Other Institution" }
];

// Mapping between USN college codes and college values
export const COLLEGE_CODES: Record<string, string> = {
  "RV": "rvce",    // R.V. College of Engineering
  "MS": "msrit",   // M.S. Ramaiah Institute of Technology
  "BM": "bmsce",   // B.M.S. College of Engineering
  "PI": "pesit",    // PES Institute of Technology
  "DS": "dsce",    // Dayananda Sagar College of Engineering
  "NI": "nie",     // National Institute of Engineering
  "SI": "sit",     // Siddaganga Institute of Technology
  "AY": "ait",     // Acharya Institute of Technology
  "JS": "jssate",  // JSS Academy of Technical Education
  "JB": "sjbit",   // SJB Institute of Technology
  "JC": "sjce",    // Sri Jayachamarajendra College of Engineering
  "NT": "nmit",    // Nitte Meenakshi Institute of Technology
  "BD": "biet",    // Bapuji Institute of Engineering
  "CR": "cmrit",   // CMR Institute of Technology
  "RN": "rnsit",   // RNS Institute of Technology
};

// Valid academic years
export const VALID_YEARS = [1, 2, 3, 4];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  usn: text("usn").notNull().unique(),
  email: text("email").notNull().unique(), // Added email field for password reset
  department: text("department").notNull(),
  college: text("college"),  // Added college field
  year: integer("year").notNull(), // Added year field (1-4 for undergraduate)
  password: text("password").notNull(),
  profilePicture: text("profile_picture"),
  notifyNewNotes: boolean("notify_new_notes").default(true),
  notifyDownloads: boolean("notify_downloads").default(false),
  resetToken: text("reset_token"), // Token for password reset
  resetTokenExpiry: timestamp("reset_token_expiry"), // Expiry time for reset token
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // 2FA fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  // JWT refresh token
  refreshToken: text("refresh_token"),
  refreshTokenExpiry: timestamp("refresh_token_expiry"),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  usn: text("usn").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  year: integer("year").notNull(), // Added year field (1-4 for undergraduate)
  // semester: integer("semester"), // Commented out since this column doesn't exist in the database yet
  subject: text("subject").notNull(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isFlagged: boolean("is_flagged").default(false),
  flagReason: text("flag_reason"),
  reviewedAt: timestamp("reviewed_at"),
  isApproved: boolean("is_approved").default(true), // Added to match code usage
});

// Table for bookmarking notes (feature #4)
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  noteId: integer("note_id").notNull().references(() => notes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table for direct messages between users (feature #3)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  attachment: text("attachment"), // For file attachments (optional)
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

// Registration schema with validation
export const registerUserSchema = createInsertSchema(users)
  .pick({
    usn: true,
    email: true,
    department: true,
    college: true,
    year: true,
    password: true,
  })
  .extend({
    usn: z.string()
      .refine(
        (value) => {
          // Accept all format variations: standard, hyphenated, and comma-separated
          // Standard format: 1SI20CS045 
          // Hyphenated: 1SI20CI-AI045 
          // Comma-separated: 1SI20CI,BT045
          // Multiple comma-separated: 1SI20CI,BT,IM,CV,EI045
          // Short formats: 22EC101, 22CI-ML101, 22CI,BT101
          
          // Support standard pattern with standard, hyphenated, or comma-separated department codes
          const standardFormat = /^[0-9][A-Za-z]{2}[0-9]{2}([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)[0-9]{3}$/;
          
          // Support short pattern (without college code) with standard, hyphenated, or comma-separated department codes
          const shortFormat = /^[0-9]{2}([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)[0-9]{3}$/;
          
          return standardFormat.test(value) || shortFormat.test(value);
        },
        {
          message: "USN must be in correct format (eg: 1SI22CI060, 1SI22CI-AI060, 1SI22CI,BT060, 22EC101)"
        }
      ),
    email: z.string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    department: z.enum(VALID_DEPARTMENTS as [string, ...string[]], {
      errorMap: () => ({ message: "Please select a valid department" })
    }),
    college: z.string().min(1, "Please select your college"),
    year: z.number({
      required_error: "Please select your academic year",
      invalid_type_error: "Year must be a number"
    }).min(1, "Please select your academic year").max(4, "Invalid year selected"),
    customCollegeName: z.string().optional(),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], 
  })
  .refine((data) => {
    // Extract department code from USN using regex patterns with support for hyphenated codes and comma formats
    // Standard format: 1SI20CS045 or 1SI20CI-AI045 or 1SI20CI,BT,IM,CV,EI045
    const standardUsnPattern = /^[0-9][A-Za-z]{2}[0-9]{2}([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)[0-9]{3}$/;
    // Short format: 22EC101 or 22CI-ML101 or 22CI,BT,IM101
    const shortUsnPattern = /^[0-9]{2}([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)[0-9]{3}$/;
    
    let match = data.usn.match(standardUsnPattern);
    
    if (!match) {
      // Try the short format if standard format doesn't match
      match = data.usn.match(shortUsnPattern);
      if (!match) return true; // Allow if neither pattern matches (other validators will catch this)
    }
    
    // The department code is in the first capture group for both patterns
    const usnDeptCode = match[1];
    
    // Log for debugging
    console.log(`Validating USN department code: '${usnDeptCode}', selected department: '${data.department}'`);
    console.log(`Department mapping found: ${DEPARTMENT_CODES[usnDeptCode] || 'none'}`);
    
    // If the department code is not in our mapping, allow it to continue
    if (!DEPARTMENT_CODES[usnDeptCode]) {
      console.log(`Warning: Unknown department code '${usnDeptCode}' in USN.`);
      return true;
    }
    
    // Check if the department code in USN matches the selected department
    return DEPARTMENT_CODES[usnDeptCode] === data.department;
  }, {
    message: "USN department code doesn't match selected department",
    path: ["usn"],
  })
  .refine((data) => {
    // Don't validate if college is 'other'
    if (data.college === 'other') return true;
    
    // We only check college code for standard format USNs (short format doesn't have college code)
    // Updated to handle hyphenated and comma-separated department codes with any number of comma-separated values
    const usnPattern = /^[0-9]([A-Za-z]{2})[0-9]{2}[A-Za-z]{2}(?:[-,][A-Za-z]{2})*[0-9]{3}$/;
    const match = data.usn.match(usnPattern);
    
    if (!match) return true; // If not standard USN format, skip this validation
    
    // The college code is in the first capture group
    const usnCollegeCode = match[1];
    
    // Log for debugging
    console.log(`Validating USN college code: '${usnCollegeCode}', selected college: '${data.college}'`);
    console.log(`College mapping found: ${COLLEGE_CODES[usnCollegeCode] || 'none'}`);
    
    // If there's no matching college code, allow it
    if (!COLLEGE_CODES[usnCollegeCode]) return true;
    
    // Check if the college code in USN matches the selected college
    return COLLEGE_CODES[usnCollegeCode] === data.college;
  }, {
    message: "The college code in your USN doesn't match the selected college",
    path: ["college"],
  });

// Login schema
export const loginUserSchema = z.object({
  usn: z.string()
    .refine(
      (value) => {
        // Accept all format variations: standard, hyphenated, and comma-separated
        // Standard format: 1SI20CS045 
        // Hyphenated: 1SI20CI-AI045 
        // Comma-separated with multiple codes: 1SI20CI,BT,IM,CV,EI045
        // Short format variations: 22EC101, 22CI-ML101, 22CI,BT,IM101
          
        // Support standard pattern with standard, hyphenated, or comma-separated department codes
        const standardFormat = /^[0-9][A-Za-z]{2}[0-9]{2}([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)[0-9]{3}$/;
          
        // Support short pattern (without college code) with standard, hyphenated, or comma-separated department codes
        const shortFormat = /^[0-9]{2}([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)[0-9]{3}$/;
          
        return standardFormat.test(value) || shortFormat.test(value);
      },
      {
        message: "USN must be in correct format (eg: 1SI22CI060, 1SI22CI-AI060, 1SI22CI,BT060, 22EC101)"
      }
    ),
  password: z.string().min(1, "Password is required"),
});

// Note insertion schema
export const insertNoteSchema = createInsertSchema(notes).pick({
  usn: true,
  title: true,
  department: true,
  year: true,
  subject: true,
  filename: true,
  originalFilename: true,
});

// Search schema with user-specific filters
export const searchNotesSchema = z.object({
  department: z.string().optional(),
  subject: z.string().optional(),
  year: z.number().optional(), // Kept for backward compatibility with DB
  userDepartment: z.string().optional(), // Added to filter by user department
  userCollege: z.string().optional(), // Added to filter by user college
  userYear: z.number().optional(), // Kept for backward compatibility with DB
  showAllDepartments: z.boolean().optional(), // Added to control showing all departments
  showAllColleges: z.boolean().optional(), // Added to control showing notes from all colleges
  showAllYears: z.boolean().optional(), // Kept for backward compatibility with DB
  userId: z.number().optional(), // Added to filter notes by a specific user ID
});

// User settings update schema
export const updateUserSettingsSchema = z.object({
  notifyNewNotes: z.boolean().optional(),
  notifyDownloads: z.boolean().optional(),
});

// Password update schema
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmNewPassword: z.string().min(8, "Password confirmation must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match",
  path: ["confirmNewPassword"],
});

// Forgot password request schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Create schema for the bookmark feature
export const bookmarkSchema = createInsertSchema(bookmarks).pick({
  userId: true,
  noteId: true,
});

// Create schema for sending messages
export const messageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  attachment: true,
});

// Add semesters for each year 
export const SEMESTERS_BY_YEAR: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8]
};

// Types
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type InsertUser = Omit<RegisterUser, "confirmPassword" | "customCollegeName"> & {
  notifyNewNotes?: boolean,
  notifyDownloads?: boolean
};
export type User = typeof users.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;
export type SearchNotesParams = z.infer<typeof searchNotesSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;
export type UpdatePassword = z.infer<typeof updatePasswordSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
// Google authentication schema
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
  // Optional fields that can be extracted from the Google profile
  name: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  photoURL: z.string().url("Invalid photo URL").optional(),
});

export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type GoogleAuth = z.infer<typeof googleAuthSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof bookmarkSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof messageSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Table for storing drawings
export const drawings = pgTable("drawings", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").references(() => notes.id),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content"), // SVG/Canvas data
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false),
});

// Drawing schema
export const insertDrawingSchema = createInsertSchema(drawings)
  .pick({
    noteId: true,
    userId: true,
    title: true,
    content: true,
    thumbnailUrl: true,
    isPublic: true,
  });

export type InsertDrawing = z.infer<typeof insertDrawingSchema>;
export type Drawing = typeof drawings.$inferSelect;
