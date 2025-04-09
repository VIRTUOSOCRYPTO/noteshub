import sanitizeHtml from 'sanitize-html';

/**
 * Server-side sanitization configuration and utilities
 */

// Shared sanitization options
const baseSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 
    'li', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4'
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    'span': ['class'],
    'div': ['class']
  },
  disallowedTagsMode: 'discard',
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false
};

/**
 * Sanitizes HTML content to remove potential XSS attacks
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeUserHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, baseSanitizeOptions);
}

/**
 * Sanitizes user-provided text by removing all HTML tags
 * @param text - Text to be sanitized
 * @returns Plain text with all HTML removed
 */
export function sanitizeUserText(text: string): string {
  if (!text) return '';
  return sanitizeHtml(text, { allowedTags: [] });
}

/**
 * Sanitizes a user-provided URL
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if unsafe
 */
export function sanitizeUserUrl(url: string): string {
  if (!url) return '';
  
  // Basic URL sanitization to prevent javascript: or data: URI exploits
  const sanitized = url.trim().toLowerCase();
  
  if (
    sanitized.startsWith('javascript:') || 
    sanitized.startsWith('data:') || 
    sanitized.startsWith('vbscript:')
  ) {
    return '';
  }
  
  return url;
}

/**
 * Recursively sanitizes all string properties in an object
 * @param obj - Object to sanitize
 * @returns New object with sanitized values
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const value = result[key];
      
      if (typeof value === 'string') {
        // Sanitize string values
        result[key] = sanitizeUserText(value) as any;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        result[key] = sanitizeObject(value) as any;
      }
    }
  }
  
  return result;
}