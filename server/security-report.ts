import fs from 'fs';
import path from 'path';

/**
 * Security Report Generator
 * 
 * This module provides a comprehensive overview of the security measures
 * implemented in the NotesHub application. It is designed to be run on-demand
 * to generate a security posture report.
 */

interface SecurityMeasure {
  category: string;
  name: string;
  description: string;
  implemented: boolean;
  notes?: string;
}

const securityMeasures: SecurityMeasure[] = [
  // Authentication Security
  {
    category: 'Authentication',
    name: 'Password Complexity Requirements',
    description: 'Enforces strong password requirements including minimum length, special characters, and case sensitivity',
    implemented: true,
    notes: 'Implemented via Zod validation schema with regex pattern'
  },
  {
    category: 'Authentication',
    name: 'Account Lockout',
    description: 'Locks user accounts after multiple failed login attempts',
    implemented: true,
    notes: '5 failed attempts results in 15-minute lockout'
  },
  {
    category: 'Authentication',
    name: 'Two-Factor Authentication (2FA)',
    description: 'Provides an additional layer of security through TOTP-based verification',
    implemented: true,
    notes: 'Using otplib with QR code generation for setup'
  },
  {
    category: 'Authentication',
    name: 'Secure Session Management',
    description: 'Implements session expiration, rotation, and secure cookie settings',
    implemented: true,
    notes: 'Using express-session with PostgreSQL session store'
  },
  {
    category: 'Authentication',
    name: 'JWT-based API Authentication',
    description: 'Implements secure JWT tokens with short expiry and refresh mechanism',
    implemented: true,
    notes: 'Access tokens expire in 15 minutes, refresh tokens in 7 days'
  },
  
  // Access Control
  {
    category: 'Access Control',
    name: 'Role-based Access Control',
    description: 'Restricts access to features based on user roles',
    implemented: false,
    notes: 'Currently using basic authenticated vs. unauthenticated distinction only'
  },
  {
    category: 'Access Control',
    name: 'Academic Year Restrictions',
    description: 'Restricts access to notes based on academic year matching',
    implemented: true,
    notes: 'Users can only access notes from their own academic year'
  },
  {
    category: 'Access Control',
    name: 'Department-based Filtering',
    description: 'Filters available notes based on user department',
    implemented: true,
    notes: 'Users can only see notes from their own department by default'
  },
  
  // Data Protection
  {
    category: 'Data Protection',
    name: 'Password Hashing',
    description: 'Securely hashes passwords using modern algorithms',
    implemented: true,
    notes: 'Using bcrypt with appropriate work factor'
  },
  {
    category: 'Data Protection',
    name: 'File Upload Security',
    description: 'Validates, sanitizes, and safely stores uploaded files',
    implemented: true,
    notes: 'Includes type checking, virus scanning, and metadata stripping'
  },
  {
    category: 'Data Protection',
    name: 'SQL Injection Protection',
    description: 'Prevents SQL injection attacks through parameterized queries',
    implemented: true,
    notes: 'Using Drizzle ORM with parameterized queries'
  },
  {
    category: 'Data Protection',
    name: 'XSS Protection',
    description: 'Prevents cross-site scripting attacks through input sanitization and CSP',
    implemented: true,
    notes: 'Using Content-Security-Policy headers and DOMPurify for HTML'
  },
  
  // Communication Security
  {
    category: 'Communication Security',
    name: 'HTTPS Enforcement',
    description: 'Enforces secure HTTPS connections',
    implemented: true,
    notes: 'Using Strict-Transport-Security headers in production'
  },
  {
    category: 'Communication Security',
    name: 'CORS Policy',
    description: 'Controls which domains can interact with the API',
    implemented: true,
    notes: 'Restricts to known domains with proper options'
  },
  {
    category: 'Communication Security', 
    name: 'Content Security Policy',
    description: 'Restricts resource loading to trusted sources',
    implemented: true,
    notes: 'CSP implemented with appropriate directives'
  },
  {
    category: 'Communication Security',
    name: 'Secure File Downloads',
    description: 'Implements proper Content-Disposition headers for file downloads',
    implemented: true,
    notes: 'Using attachment disposition and content type validation'
  },
  
  // Operational Security
  {
    category: 'Operational Security',
    name: 'Rate Limiting',
    description: 'Prevents abuse through request rate limiting',
    implemented: true,
    notes: 'Using express-rate-limit with different thresholds for different endpoints'
  },
  {
    category: 'Operational Security',
    name: 'Security Logging',
    description: 'Logs security events for monitoring and incident response',
    implemented: true,
    notes: 'Comprehensive security event logging with severity levels'
  },
  {
    category: 'Operational Security',
    name: 'Input Validation',
    description: 'Validates all input data before processing',
    implemented: true,
    notes: 'Using Zod for schema validation'
  },
  {
    category: 'Operational Security',
    name: 'Error Handling',
    description: 'Properly handles errors without leaking sensitive information',
    implemented: true,
    notes: 'Global error handler with appropriate information disclosure'
  }
];

/**
 * Generate a security report showing implemented measures
 */
export function generateSecurityReport(): string {
  // Get unique categories without using Set iteration
  const categoryMap: Record<string, boolean> = {};
  securityMeasures.forEach(m => categoryMap[m.category] = true);
  const categories = Object.keys(categoryMap);
  
  let report = `
# NotesHub Security Report
Generated: ${new Date().toISOString()}

## Summary
- Total Security Measures: ${securityMeasures.length}
- Implemented: ${securityMeasures.filter(m => m.implemented).length}
- Pending: ${securityMeasures.filter(m => !m.implemented).length}
- Implementation Rate: ${Math.round((securityMeasures.filter(m => m.implemented).length / securityMeasures.length) * 100)}%

## Security Measures by Category
`;

  // Generate report by category
  for (const category of categories) {
    const measures = securityMeasures.filter(m => m.category === category);
    const implementedCount = measures.filter(m => m.implemented).length;
    
    report += `
### ${category}
Implementation: ${implementedCount}/${measures.length} (${Math.round((implementedCount / measures.length) * 100)}%)

| Security Measure | Status | Notes |
|------------------|--------|-------|
`;
    
    for (const measure of measures) {
      report += `| ${measure.name} | ${measure.implemented ? '✅ Implemented' : '❌ Pending'} | ${measure.notes || ''} |\n`;
    }
    
    report += '\n';
  }
  
  // Add recommendations section
  const pendingMeasures = securityMeasures.filter(m => !m.implemented);
  if (pendingMeasures.length > 0) {
    report += `
## Recommended Improvements

The following security measures are recommended for future implementation:

`;
    
    for (const measure of pendingMeasures) {
      report += `1. **${measure.name}**: ${measure.description}\n`;
    }
  }
  
  return report;
}

/**
 * Save the security report to a file
 */
export function saveSecurityReport(outputPath?: string): string {
  try {
    const report = generateSecurityReport();
    const filePath = outputPath || path.join(process.cwd(), 'security-report.md');
    
    fs.writeFileSync(filePath, report, 'utf8');
    console.log(`Security report saved to ${filePath}`);
    console.log(`Current working directory: ${process.cwd()}`);
    
    return filePath;
  } catch (error) {
    console.error('Error saving security report:', error);
    throw error;
  }
}

// Export functions
export default {
  generateSecurityReport,
  saveSecurityReport
};

// Auto-run if file is executed directly
if (process.argv[1] === import.meta.url) {
  saveSecurityReport();
}