const { client } = require('./lineClient');

// event handler
function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    // create an echoing text message
    const echo = { type: 'text', text: event.message.text };

    // use reply API
    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [echo],
    });
}

module.exports = handleEvent;