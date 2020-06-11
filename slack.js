const got = require('got');

class SlackClient {
    constructor(webhook) {
        this.webhook = webhook;
    }

    async postMessage(json) {
        await got.post(this.webhook, { json });
    }
}
 
module.exports = SlackClient;