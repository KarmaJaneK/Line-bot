const line = require('@line/bot-sdk');

// create LINE SDK config from env variables
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// create LINE SDK client
const Client = new line.Client(config);


module.exports = { Client, line };

