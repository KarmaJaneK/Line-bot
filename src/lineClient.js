const line = require('@line/bot-sdk');
import express from 'express';


// create LINE SDK config from env variables
const config = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};