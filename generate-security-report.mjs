import { generateSecurityReport } from './server/security-report.ts';

// Generate and display the security report
try {
  const report = generateSecurityReport();
  console.log(report);
} catch (error) {
  console.error('Error generating security report:', error);
}