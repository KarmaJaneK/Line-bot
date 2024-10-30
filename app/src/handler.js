require('dotenv').config();
const express = require('express');
const { client } = require('./lineClient.js');
const airtableBase = require('./airtableClient.js');
require('crypto');
const app = express();
app.use(express.json());

// Function to send reminders to users
async function sendReminders() {
    try {
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
                'Line ID': userId,
                'Reminder sent': reminderSent,
                'Will attend': willAttend,
                'Will not attend': willNotAttend
            } = record.fields;

            if (!reminderSent && classTime.startsWith(tomorrowDate) && willAttend === undefined && willNotAttend === undefined) {
                const remainingClasses = await airtableBase('Unused Classes').select({
                    filterByFormula: `{Line ID} = '${userId}'`,
                }).all();

                let remainingClassesMessage = `\n\nRemaining classes: (${remainingClasses.length})`;

                const message = `Reminder: You have a class scheduled at ${classTime}. Please confirm if you will attend or not. ${remainingClassesMessage}`;

                // Generate a unique key for the X-Line-Retry-Key parameter
                const retryKey = crypto.randomUUID();
                console.log('Generated retry key:', retryKey);

                await client.pushMessage(userId, [{ type: 'text', text: message }], {
                    headers: {
                        'X-Line-Retry-Key': retryKey
                    }
                });
   await airtableBase('Bot Test').update(record.id, {
                    'Reminder sent': true,
                });
            }
        }
    } catch (error) {
        console.error('Error in sendReminders:', error);
        setTimeout(sendReminders, 5 * 60 * 60 * 1000);
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
            const records = await airtableBase('Bot Test').select({
                filterByFormula: `{Line ID} = '${userId}'`,
            }).all();

            if (records.length > 0) {
                const record = records[0];
                const willAttend = record.get('Will attend');
                const willNotAttend = record.get('Will not attend');

                if (willAttend === undefined && willNotAttend === undefined) {
                    if (WillAttendConfirmations.some((phrase) => messageText.includes(phrase))) {
                        await airtableBase('Bot Test').update(record.id, {'Will attend': true});
                        await client.replyMessage(replyToken, {
                            type: 'text',
                            text: 'Thank you for confirming your attendance!'
                        });
                    } else if (WillNotAttendConfirmations.some((phrase) => messageText.includes(phrase))) {
                        await airtableBase('Bot Test').update(record.id, {'Will not attend': true});
                        await client.replyMessage(replyToken, {type: 'text', text: 'Thank you for informing us.'});
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