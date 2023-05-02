const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const util = require('util');
const sleep = util.promisify(setTimeout);

// Replace with your own client credentials
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URL = 'YOUR_REDIRECT_URL';

// Replace with your own credentials for Gmail API
const REFRESH_TOKEN = 'YOUR_REFRESH_TOKEN';
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

const oauth2Client = new OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
  access_token: ACCESS_TOKEN
});

const gmail = google.gmail({
  version: 'v1',
  auth: oauth2Client
});

// Set up variables for interval between email checks
const MIN_INTERVAL = 45000; // 45 seconds
const MAX_INTERVAL = 120000; // 120 seconds

async function checkForNewEmails() {
  try {
    // Retrieve the list of messages in the authenticated user's inbox
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10
    });
    
    const messages = res.data.messages;

    if (messages.length) {
      for (const message of messages) {
        // Retrieve the full message data for each message
        const res = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const messageData = res.data;
        const threadId = messageData.threadId;

        // Check if the message has any prior replies
        const headers = messageData.payload.headers;
        const subjectHeader = headers.find(header => header.name === 'Subject');
        const subject = subjectHeader.value;

        const fromHeader = headers.find(header => header.name === 'From');
        const from = fromHeader.value;

        if (!messageData.labelIds.includes('Label_Reply_Sent')) {
          console.log(`Replying to email from ${from} with subject: ${subject}`);
          await sendReply(threadId, from);
        } else {
          console.log(`Already replied to email from ${from} with subject: ${subject}`);
        }

        if (!messageData.labelIds.includes('Label_Replied')) {
          console.log(`Tagging email with label: Label_Replied`);
          await tagEmail(threadId, ['Label_Replied']);
        } else {
          console.log(`Email already tagged with label: Label_Replied`);
        }
      }
    } else {
      console.log('No new messages found.');
    }
  } catch (error) {
    console.error('The API returned an error:', error);
  }
}

async function sendReply(threadId, to) {
  // Send the reply email
  const message = 'Thank you for your email. I am currently on vacation and will not be able to respond promptly. I will get back to you as soon as possible upon my return.';

  const replyRequest = {
    method: 'POST',
    path: `/gmail/v1/users/me/messages/send`,
    requestBody: {
      threadId,
      to,
      message
    }
  };

  try {
    await gmail._request(replyRequest);
    console.log('Reply sent successfully.');
  } catch (error) {
    console.error('Failed to send reply:', error);
  }

  // Add label to the replied email
  const labelIds = ['Label_Reply_Sent'];

  try {
    async function tagEmail(threadId, labelIds) {
        const request = {
        method: 'POST',
        path: `/gmail/v1/users/me/threads/${threadId}/modify`,
        requestBody: {
        addLabelIds: labelIds
        }
        };
        
        try {
        await gmail._request(request);
        console.log(`Added label(s) ${labelIds.join(',')} to thread ${threadId}`);
        } catch (error) {
        console.error(`Failed to add label(s) ${labelIds.join(',')} to thread ${threadId}:`, error);
        }
        }
    } catch (error) {
        console.error(error);
    }
}
        
async function main() {
while (true) {
    console.log('Checking for new emails...');
    await checkForNewEmails();
    const interval = Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1) + MIN_INTERVAL);
    console.log(`Waiting for ${interval}ms before checking again...`);
    await sleep(interval);
    }
}
main();

