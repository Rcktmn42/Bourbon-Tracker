// Create: backend/test-email-service.js
import emailService from './services/emailService.js';

async function testEmailService() {
  // Test connection
  const connection = await emailService.testConnection();
  console.log('Connection:', connection);
  
  // Test welcome email
  const welcome = await emailService.sendWelcomeEmail(
    'jtlewis42@gmail.com', 
    'Jason Lewis'
  );
  console.log('Welcome email:', welcome);
}

testEmailService();