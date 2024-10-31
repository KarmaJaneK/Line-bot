const axios = require('axios');
const { messagingApi } = require('@line/bot-sdk');
const { MessagingApiClient } = messagingApi;

// create LINE SDK client
const client = new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});


const customClient = axios.create({
    baseURL: 'https://api.line.me/v2/bot/message',
    headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

module.exports = { client, customClient };