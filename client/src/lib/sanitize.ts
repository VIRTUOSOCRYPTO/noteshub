import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param content - The HTML content to sanitize
 * @returns Sanitized HTML content
 */
export const sanitizeHtml = (content: string): string => {
  // Configure DOMPurify with strict options
  const purifyConfig = {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 
      'li', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'eval'],
    ALLOW_DATA_ATTR: false,
    ADD_TAGS: [],
    ADD_ATTR: [],
    USE_PROFILES: { html: true },
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    WHOLE_DOCUMENT: false,
    FORCE_BODY: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    SAFE_FOR_TEMPLATES: true
  };

  return DOMPurify.sanitize(content, purifyConfig);
};

/**
 * Sanitizes text for display in UI (removes HTML completely)
 * @param text - The text to sanitize
 * @returns Sanitized text content
 */
export const sanitizeText = (text: string): string => {
  // For plain text, we strip all HTML
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};

/**
 * Sanitizes a URL to prevent javascript: or data: URI exploits
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if unsafe
 */
export const sanitizeUrl = (url: string): string => {
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
};

/**
 * Creates a sanitized anchor attribute object
 * @param href - The href URL
 * @returns Object with safe attributes for anchors
 */
export const sanitizeAnchorProps = (href: string) => {
  const url = sanitizeUrl(href);
  
  // If URL is external, add safety attributes
  const isExternal = url && url.startsWith('http') && !url.includes(window.location.hostname);
  
  return {
    href: url,
    ...(isExternal ? {
      target: '_blank',
      rel: 'noopener noreferrer',
    } : {})
  };
};