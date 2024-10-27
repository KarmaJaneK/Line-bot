require('dotenv').config();
const express = require('express');
const cors = require('cors');


const { handleEvent, sendReminders } = require('./handler.js');
const cron = require('node-cron');
const { join } = require('node:path');
const axios = require('axios');

const app = express();



// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Use the CORS middleware
app.use(cors());

// Use the JSON middleware
app.use(express.json());

// Webhook for LINE messages
app.post('/webhook', async (req, res) => {
    const events = req.body.events;
    if (!events || events.length === 0) {
        return res.status(400).send('No events');
    }

    try {
        const result = await Promise.all(events.map(handleEvent));
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

// Schedule reminders to send at 11:30 every day
cron.schedule('30 11 * * *', () => {
    console.log('Sending reminders');
    sendReminders().then(() => {
        console.log('Reminders sent successfully');
    }).catch(err => {
        console.error('Error sending reminders:', err);
    });
});

// Route to manually trigger sendReminders
app.get('/trigger-reminders', async (req, res) => {
    try {
        await sendReminders();
        res.send('Reminders sent successfully');
    } catch (error) {
        console.error('Error triggering reminders:', error);
        res.status(500).send('Error triggering reminders');
    }
});

// Example route to test Airtable API
app.get('/test-airtable', async (req, res) => {
    try {
        const response = await axios.get(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Bot%20Test`, {
            headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error accessing Airtable:', error);
        res.status(500).send('Error accessing Airtable');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});