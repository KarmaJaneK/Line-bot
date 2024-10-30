const { messagingApi } = require('@line/bot-sdk');
const { MessagingApiClient } = messagingApi;

// create LINE SDK client
const client = new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

module.exports = { client };