const line = require('@line/bot-sdk');
const express = require('express');
const handleEvent = require('./handler');

// create LINE SDK config from env variables
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

module.exports = { client, line };