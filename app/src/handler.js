require('dotenv').config();
const express = require('express');
const { customClient } = require('./lineClient.js');
const airtableBase = require('./airtableClient.js');
const { v4: uuid } = require('uuid');
const app = express();
app.use(express.json());

// Function to send reminders to users
async function sendReminders(userId) {
    try {
        // Fetch all records from the 'Bot Test' table in Airtable
        const records = await airtableBase('Bot Test').select().all();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];

        for (const record of records) {
            if (!record.fields || Object.keys(record.fields).length === 0) {
                console.error(`Empty fields for record ID: ${record.id}`);
                continue;
            }
            const {
                'Booking date/time': classTime,
                'Line ID': recordUserId,
                'Reminder sent': reminderSent,
                'Will attend': willAttend,
                'Will not attend': willNotAttend
            } = record.fields;

            // Check if a reminder needs to be sent
            if (!reminderSent && classTime.startsWith(tomorrowDate) && willAttend === undefined && willNotAttend === undefined) {
                // Fetch remaining classes for the user
                const remainingClasses = await airtableBase('Unused Classes').select({
                    filterByFormula: `{Line ID} = '${recordUserId}'`,
                }).all();

                let remainingClassesMessage = `\n\nRemaining classes: (${remainingClasses.length})`;

                const message = `Reminder: You have a class scheduled at ${classTime}. Please confirm if you will attend or not. ${remainingClassesMessage}`;

                // Generate a unique key for the X-Line-Retry-Key parameter
                const retryKey = uuid();
                console.log('Generated retry key:', retryKey);

                // Log the request details for debugging
                console.log('Sending message to user:', recordUserId);
                console.log('Message:', message);
                console.log('Headers:', {
                    'X-Line-Retry-Key': retryKey
                });

                // Validate userId before sending the request
                if (!recordUserId || typeof recordUserId !== 'string' || recordUserId.trim() === '') {
                    console.error('Invalid userId:', recordUserId);
                    continue;
                }

                // Log the request body for debugging
                const requestBody = {
                    to: String(recordUserId),
                    messages: [{ type: 'text', text: message }]
                };
                console.log('Request body:', JSON.stringify(requestBody, null, 2));

                // Send the reminder message
                await customClient.post('/push', requestBody);

                // Update the record to indicate that the reminder has been sent
                await airtableBase('Bot Test').update(record.id, {
                    'Reminder sent': true,
                });
            }
        }
    } catch (error) {
        console.error('Error in sendReminders:', error);
        // Retry sending reminders after 5 hours if an error occurs
        setTimeout(() => sendReminders(userId), 5 * 60 * 60 * 1000);
    }
}

// Function to handle incoming events (user messages)
async function handleEvent(event) {
    if (event.type === 'message' && event.message.type === 'text') {
        const replyToken = event.replyToken;
        const userId = event.source.userId;
        const messageText = event.message.text.toLowerCase();

        const WillAttendConfirmations = [
            'will attend',
            'be there',
            'confirm',
            'see you',
            'yes',
        ];
        const WillNotAttendConfirmations = [
            'will not attend',
            'not coming',
            'cancel',
            'reschedule',
            'no',
        ];

        try {
            // Fetch records for the user from the 'Bot Test' table in Airtable
            const records = await airtableBase('Bot Test').select({
                filterByFormula: `{Line ID} = '${userId}'`,
            }).all();

            if (records.length > 0) {
                const record = records[0];
                const willAttend = record.get('Will attend');
                const willNotAttend = record.get('Will not attend');

                if (willAttend === undefined && willNotAttend === undefined) {
                    const retryKey = uuid();
                    console.log('Generated retry key:', retryKey);

                    // Check if the user confirmed attendance
                    if (WillAttendConfirmations.some((phrase) => messageText.includes(phrase))) {
                        await airtableBase('Bot Test').update(record.id, {'Will attend': true});
                        await customClient.post('/reply', {
                            replyToken: replyToken,
                            messages: [{
                                type: 'text',
                                text: 'Thank you for confirming your attendance!'
                            }]
                        });
                        // Check if the user declined attendance
                    } else if (WillNotAttendConfirmations.some((phrase) => messageText.includes(phrase))) {
                        await airtableBase('Bot Test').update(record.id, {'Will not attend': true});
                        await customClient.post('/reply', {
                            replyToken: replyToken,
                            messages: [{
                                type: 'text',
                                text: 'Thank you for informing us.'
                            }]
                        });
                    } else {
                        return null;
                    }
                }
            }
        } catch (error) {
            console.error('Error in handleEvent:', error);
        }
    }
}

module.exports = { handleEvent, sendReminders };