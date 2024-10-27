
require('dotenv').config();
const express = require('express');
const lineClient = require('./lineClient');
const airtableBase = require('./airtableClient');

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
            const classTime = record.get('Booking date/time');
            const userId = record.get('Line ID');
            const reminderSent = record.get('Reminder sent');
            const willAttend = record.get('Will attend');
            const willNotAttend = record.get('Will not attend');

            if (!reminderSent && classTime.startsWith(tomorrowDate) && willAttend === undefined && willNotAttend === undefined) {
                const remainingClasses = await airtableBase('Unused Classes').select({
                    filterByFormula: `{Line ID} = '${userId}'`,
                }).all();

                let remainingClassesMessage = `\n\nRemaining classes: (${remainingClasses})`;

                const message = `Reminder: You have a class scheduled at ${classTime}. Please confirm if you will attend or not. ${remainingClassesMessage}`;
                await lineClient.pushMessage(userId, { type: 'text', text: message });
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
                        await lineClient.replyMessage(replyToken, {
                            type: 'text',
                            text: 'Thank you for confirming your attendance!'
                        });
                    } else if (WillNotAttendConfirmations.some((phrase) => messageText.includes(phrase))) {
                        await airtableBase('Bot Test').update(record.id, {'Will not attend': true});
                        await lineClient.replyMessage(replyToken, {type: 'text', text: 'Thank you for informing us.'});
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