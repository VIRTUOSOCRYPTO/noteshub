const { generateSecurityReport } = require('./server/security-report.ts');

// Generate and display the security report
const report = generateSecurityReport();
console.log(report);