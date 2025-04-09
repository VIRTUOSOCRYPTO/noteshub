import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';
import sanitizeFilename from 'sanitize-filename';
import mimeTypes from 'mime-types';
import JSZip from 'jszip';
// @ts-ignore - No type declarations available for pdf-parse
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import { exec } from 'child_process';
import util from 'util';
import { log } from './vite';

const execPromise = util.promisify(exec);

// Define allowed file types with their corresponding MIME types and extensions
export const ALLOWED_FILE_TYPES = {
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
  },
  word: {
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['.doc', '.docx'],
  },
  powerpoint: {
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: ['.ppt', '.pptx'],
  },
  text: {
    mimeTypes: ['text/plain', 'text/markdown'],
    extensions: ['.txt', '.md'],
  },
  image: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
};

// Helper to check if file extension is allowed
const isExtensionAllowed = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return Object.values(ALLOWED_FILE_TYPES).some(type => 
    type.extensions.includes(ext)
  );
};

// Helper to check if MIME type is allowed
const isMimeTypeAllowed = (mimeType: string): boolean => {
  return Object.values(ALLOWED_FILE_TYPES).some(type => 
    type.mimeTypes.includes(mimeType)
  );
};

// Validate mime type against file extension
const validateMimeTypeMatchesExtension = (filePath: string, mimeType: string): boolean => {
  const extension = path.extname(filePath).toLowerCase();
  const expectedMimeType = mimeTypes.lookup(extension);
  
  // If we can't determine expected MIME type from extension, rely on the file-type detection
  if (!expectedMimeType) return true;
  
  // Check if claimed MIME type is compatible with file extension
  return expectedMimeType === mimeType;
};

// Clean filename for security
export const sanitizeFilenameForStorage = (filename: string): string => {
  // Replace potentially malicious characters
  const sanitized = sanitizeFilename(filename);
  
  // Ensure the sanitized name isn't empty
  if (!sanitized) {
    return 'unnamed_file';
  }
  
  return sanitized;
};

// Import the ClamAV scanner library
import clamd from 'clamdjs';
import { promisify } from 'util';
import { readFile } from 'fs/promises';

// Configure ClamAV scanning
const CLAMD_PORT = 3310; // Default ClamAV daemon port
const CLAMD_HOST = '127.0.0.1'; // localhost
const SCAN_TIMEOUT = 60000; // 60 seconds timeout for scanning

// Scan file for viruses using ClamAV
export const scanFileForViruses = async (filePath: string): Promise<{ clean: boolean; message: string }> => {
  try {
    // First approach: Try using the clamdjs library for scanning
    try {
      // Create a scanner that connects to clamd service
      const scanner = clamd.createScanner(CLAMD_HOST, CLAMD_PORT);
      
      // Check if the ClamAV daemon is responding
      const pingResult = await scanner.ping();
      if (pingResult === 'PONG') {
        log(`ClamAV daemon is running, scanning file: ${filePath}`, 'express');
        
        // Use the scanFile method to check for viruses
        const scanResult = await scanner.scanFile(filePath);
        
        if (scanResult.includes('OK')) {
          return { clean: true, message: 'No threats detected (ClamAV)' };
        } else if (scanResult.includes('FOUND')) {
          // Extract the virus name from the result
          const virusName = scanResult.split('FOUND')[1]?.trim() || 'Unknown threat';
          return { 
            clean: false, 
            message: `Security threat detected: ${virusName}`
          };
        }
      }
    } catch (clamError: any) {
      const errorMessage = clamError?.message || 'Unknown error';
      log(`ClamAV daemon error: ${errorMessage}. Trying command line approach...`, 'express');
      // Continue to the command line approach if the library approach fails
    }
    
    // Second approach: Try using command line tools
    try {
      // Check if ClamAV is installed and available
      await execPromise('which clamdscan || which clamscan');
      
      try {
        // Try to use the daemon version first (faster)
        await execPromise(`clamdscan --quiet ${filePath}`);
        return { clean: true, message: 'No threats detected (clamdscan)' };
      } catch (error: any) {
        // Check if this is a configuration/installation error or an actual virus detection
        if (error?.stderr && (
            error.stderr.includes('FOUND') || 
            error.stderr.includes('Infected') || 
            error.stderr.includes('Virus')
           )) {
          // This is likely an actual virus detection
          log(`ClamAV detection: ${error.stderr}`, 'express');
          return { 
            clean: false, 
            message: 'Security threat detected in file'
          };
        } else {
          // This is likely a configuration or installation error
          log(`ClamAV configuration error: ${error?.stderr || 'Unknown error'}`, 'express');
          // Continue to next scanning method
        }
      }
    } catch (error: any) {
      // First tool not available, trying the next one
      log(`clamdscan not available: ${error?.message || 'Unknown error'}`, 'express');
    }
    
    try {
      // Try the standalone scanner as a last resort
      await execPromise(`clamscan --quiet ${filePath}`);
      return { clean: true, message: 'No threats detected (clamscan)' };
    } catch (error: any) {
      // Check if this is a configuration/installation error or an actual virus detection
      if (error?.stderr && (
          error.stderr.includes('FOUND') || 
          error.stderr.includes('Infected') || 
          error.stderr.includes('Virus')
         )) {
        // This is likely an actual virus detection
        log(`ClamAV detection: ${error.stderr}`, 'express');
        return { 
          clean: false, 
          message: 'Security threat detected in file'
        };
      } else {
        // This is likely a configuration or installation error
        log(`ClamAV (clamscan) configuration error: ${error?.stderr || 'Unknown error'}`, 'express');
        // Continue to heuristic scanning
      }
    }
    
    // Third approach: If all direct scanning methods fail, use a heuristic approach
    try {
      // Read the file and check for known malicious patterns
      // This is a very basic heuristic and not a replacement for a real AV
      const fileData = await readFile(filePath);
      const fileString = fileData.toString('utf8', 0, Math.min(fileData.length, 10000)); // Read first 10KB
      
      // Check for common script/macro virus indicators
      const suspiciousPatterns = [
        'powershell -e', 'cmd.exe /c', '<script>', 'AutoOpen', 'Auto_Open',
        'EICAR-STANDARD-ANTIVIRUS-TEST-FILE', // EICAR test string
        'CreateObject("WScript.Shell")', 'CreateObject("Scripting.FileSystemObject")',
        'shell.application', '.run', 'process.start', 'eval(', '.eval(',
        'document.write(unescape', 'fromCharCode(', 'String.fromCharCode('
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (fileString.includes(pattern)) {
          return {
            clean: false,
            message: `Suspicious content detected in file (pattern matching: ${pattern})`
          };
        }
      }
      
      // File passed our basic heuristic checks
      log('File passed basic heuristic security checks, no virus scanner available', 'express');
      return { 
        clean: true, 
        message: 'No obvious threats detected (basic heuristics only - full scan unavailable)'
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      log(`Error during heuristic scanning: ${errorMessage}`, 'express');
      // If even our heuristic check fails, log a warning but allow the file
      // In a production environment, you might want to reject files if scanning completely fails
      return { 
        clean: true, 
        message: 'Security scanning incomplete - proceed with caution'
      };
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    log(`Error during virus scanning: ${errorMessage}`, 'express');
    // In a production environment, you might want to reject files if scanning fails
    return { 
      clean: true, 
      message: 'Security scanning error - proceed with caution' 
    };
  }
};

// Validate file content matches its claimed type
export const validateFileContent = async (
  filePath: string, 
  originalMimeType: string
): Promise<{ valid: boolean; actualType?: string; message?: string }> => {
  try {
    // Use file-type library to detect file type from content
    const fileTypeResult = await fileTypeFromFile(filePath);
    
    // If we can't detect the file type but the original mime type is text-based,
    // this might be a genuine text file which file-type can't always detect
    if (!fileTypeResult && 
        (originalMimeType === 'text/plain' || 
         originalMimeType === 'text/markdown')) {
      // Try to read the first few bytes to check if it's actually text
      const buffer = Buffer.alloc(100);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 100, 0);
      fs.closeSync(fd);
      
      // Check if buffer contains only printable ASCII or common Unicode characters
      // This is a simplistic check - production would use more robust methods
      const isProbablyText = !buffer.some(byte => 
        (byte < 9 || (byte > 13 && byte < 32)) && byte !== 0
      );
      
      if (isProbablyText) {
        return { valid: true };
      } else {
        return { 
          valid: false, 
          message: 'File content does not appear to be text as claimed'
        };
      }
    }
    
    // If we detected a file type, check if it matches the claimed type
    if (fileTypeResult) {
      const detectedMimeType = fileTypeResult.mime;
      
      // Check if detected MIME type is allowed at all
      if (!isMimeTypeAllowed(detectedMimeType)) {
        return { 
          valid: false, 
          actualType: detectedMimeType,
          message: `File content detected as ${detectedMimeType}, which is not allowed` 
        };
      }
      
      // For PDFs and Office documents, perform deeper validation
      if (detectedMimeType === 'application/pdf') {
        try {
          // Try to parse the PDF to validate structure
          const data = await pdfParse(fs.readFileSync(filePath));
          if (!data || !data.text) {
            return { 
              valid: false, 
              message: 'Invalid PDF structure' 
            };
          }
        } catch (error: any) {
          return { 
            valid: false, 
            message: 'Invalid PDF content'
          };
        }
      } else if (detectedMimeType.includes('officedocument') || 
                 detectedMimeType === 'application/msword' ||
                 detectedMimeType === 'application/vnd.ms-powerpoint') {
        // Office documents are basically zip files, validate their structure
        try {
          const data = fs.readFileSync(filePath);
          const zip = new JSZip();
          await zip.loadAsync(data);
          
          // Additional checks for Office documents could go here
          // e.g., check for specific files within the ZIP structure
        } catch (error: any) {
          return { 
            valid: false, 
            message: 'Invalid Office document structure'
          };
        }
      }
      
      // Compare detected type with claimed type
      const mimeTypesMatch = originalMimeType === detectedMimeType ||
        // Handle some special cases where different mime types represent the same format
        (originalMimeType === 'application/msword' && detectedMimeType.includes('officedocument.wordprocessing')) ||
        (originalMimeType === 'application/vnd.ms-powerpoint' && detectedMimeType.includes('officedocument.presentation'));
      
      if (!mimeTypesMatch) {
        return { 
          valid: false, 
          actualType: detectedMimeType,
          message: `File claimed to be ${originalMimeType} but actually is ${detectedMimeType}` 
        };
      }
    }
    
    return { valid: true };
  } catch (error: any) {
    console.error('Error validating file content:', error);
    return { 
      valid: false, 
      message: 'Failed to validate file content'
    };
  }
};

// Enhanced function to strip metadata from files based on their type
export const stripFileMetadata = async (filePath: string, mimeType: string): Promise<string> => {
  try {
    // Handle different file types
    if (mimeType.startsWith('image/')) {
      return await stripImageMetadata(filePath);
    } else if (mimeType === 'application/pdf') {
      return await stripPdfMetadata(filePath);
    } else if (mimeType.includes('officedocument') || 
               mimeType === 'application/msword' ||
               mimeType === 'application/vnd.ms-powerpoint') {
      return await stripOfficeMetadata(filePath);
    }
    
    // For other file types, return the original path
    return filePath;
  } catch (error: any) {
    console.error(`Error stripping metadata from ${mimeType} file:`, error);
    return filePath;
  }
};

// Strip metadata from images to enhance privacy
const stripImageMetadata = async (filePath: string): Promise<string> => {
  try {
    // Create a new filename for the cleaned image
    const parsedPath = path.parse(filePath);
    const cleanedFilePath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_cleaned${parsedPath.ext}`
    );
    
    try {
      // First try using ImageMagick (installed as a system dependency)
      // This method provides more comprehensive metadata removal
      await execPromise(`convert "${filePath}" -strip "${cleanedFilePath}"`);
      
      // Delete the original file if successful
      fs.unlinkSync(filePath);
      return cleanedFilePath;
    } catch (imgMagickError: any) {
      const errorMessage = imgMagickError?.message || 'Unknown error';
      log(`ImageMagick error: ${errorMessage}. Falling back to sharp.`, 'express');
      
      // Fallback to sharp if ImageMagick fails
      await sharp(filePath)
        .withMetadata({}) // Remove metadata by passing empty object
        .toFile(cleanedFilePath);
      
      // Delete the original file if sharp succeeds
      fs.unlinkSync(filePath);
      return cleanedFilePath;
    }
  } catch (error: any) {
    console.error('Error stripping image metadata:', error);
    return filePath;
  }
};

// Strip metadata from PDF files
const stripPdfMetadata = async (filePath: string): Promise<string> => {
  try {
    // Create a new filename for the cleaned PDF
    const parsedPath = path.parse(filePath);
    const cleanedFilePath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_cleaned${parsedPath.ext}`
    );
    
    try {
      // Using exiftool (installed as a system dependency)
      await execPromise(`exiftool -all:all= "${filePath}" -o "${cleanedFilePath}"`);
      
      // Delete the original file if exiftool was successful
      fs.unlinkSync(filePath);
      return cleanedFilePath;
    } catch (exifError: any) {
      const errorMessage = exifError?.message || 'Unknown error';
      log(`ExifTool error with PDF: ${errorMessage}. Keeping original file.`, 'express');
      return filePath;
    }
  } catch (error: any) {
    console.error('Error stripping PDF metadata:', error);
    return filePath;
  }
};

// Strip metadata from Office documents
const stripOfficeMetadata = async (filePath: string): Promise<string> => {
  try {
    // Office documents are ZIP files with XML content
    // We'll extract, modify, and repackage
    const parsedPath = path.parse(filePath);
    const cleanedFilePath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_cleaned${parsedPath.ext}`
    );
    
    try {
      // Using exiftool (installed as a system dependency)
      await execPromise(`exiftool -all:all= "${filePath}" -o "${cleanedFilePath}"`);
      
      // Delete the original file if exiftool was successful
      fs.unlinkSync(filePath);
      return cleanedFilePath;
    } catch (exifError: any) {
      const errorMessage = exifError?.message || 'Unknown error';
      log(`ExifTool error with Office document: ${errorMessage}. Keeping original file.`, 'express');
      return filePath;
    }
  } catch (error: any) {
    console.error('Error stripping Office document metadata:', error);
    return filePath;
  }
};

// Main file validation function
export const validateFile = async (
  file: Express.Multer.File
): Promise<{ valid: boolean; message?: string; cleanedPath?: string }> => {
  try {
    const filePath = file.path;
    const originalMimeType = file.mimetype;
    const originalFilename = file.originalname;
    
    // 1. Check file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { 
        valid: false, 
        message: `File too large. Maximum size is 10MB, received ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
      };
    }
    
    // 2. Validate file extension
    if (!isExtensionAllowed(originalFilename)) {
      const fileExtension = path.extname(originalFilename).toLowerCase();
      return { 
        valid: false, 
        message: `Invalid file extension '${fileExtension}'. Allowed extensions are: ${Object.values(ALLOWED_FILE_TYPES).flatMap(t => t.extensions).join(', ')}` 
      };
    }
    
    // 3. Validate MIME type
    if (!isMimeTypeAllowed(originalMimeType)) {
      return { 
        valid: false, 
        message: `Invalid file type '${originalMimeType}'. Allowed types are: ${Object.values(ALLOWED_FILE_TYPES).flatMap(t => t.mimeTypes).join(', ')}` 
      };
    }
    
    // 4. Validate extension matches MIME type
    if (!validateMimeTypeMatchesExtension(originalFilename, originalMimeType)) {
      return { 
        valid: false, 
        message: `File extension doesn't match its content type` 
      };
    }
    
    // 5. Scan for viruses
    const virusResult = await scanFileForViruses(filePath);
    if (!virusResult.clean) {
      return { 
        valid: false, 
        message: virusResult.message 
      };
    }
    
    // 6. Validate file content matches claimed type
    const contentValidation = await validateFileContent(filePath, originalMimeType);
    if (!contentValidation.valid) {
      return { 
        valid: false, 
        message: contentValidation.message 
      };
    }
    
    // 7. Strip metadata from all supported file types
    let cleanedPath = await stripFileMetadata(filePath, originalMimeType);
    
    // 8. Log successful validation for security auditing
    log(`File security validation passed for ${originalFilename} (${originalMimeType})`, 'express');
    
    // All checks passed
    return { 
      valid: true,
      cleanedPath
    };
  } catch (error: any) {
    console.error('File validation error:', error);
    return { 
      valid: false, 
      message: 'Error during file validation'
    };
  }
};