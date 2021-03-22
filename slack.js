const got = require("got");

class SlackClient {
  constructor(webhook) {
    this.webhook =
      "https://hooks.slack.com/services/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";
  }

  async postMessage(json) {
    await got.post(this.webhook, { json });
  }
}

module.exports = SlackClient;
