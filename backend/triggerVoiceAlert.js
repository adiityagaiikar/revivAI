const https = require('https');

// Webhook URL provided by the user
const webhookUrl = 'https://healtcare.app.n8n.cloud/webhook-test/voice-alert';

// The payload to send
const payload = JSON.stringify({
  message: "You are missing your today's session. Do it now!",
  patientName: "Alex Mercer", // dummy patient
  urgency: "High",
  timestamp: new Date().toISOString()
});

console.log('Sending webhook to:', webhookUrl);
console.log('Payload:', payload);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(webhookUrl, options, (res) => {
  console.log(`\nStatus Code: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response body:', responseData);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Webhook triggered successfully!');
    } else {
      console.log('⚠️ Webhook triggered, but returned a non-success status code.');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error triggering webhook:', error.message);
});

// Write data to request body
req.write(payload);
req.end();
