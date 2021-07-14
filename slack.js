const got = require("got");
const { App } = require("@slack/bolt");
const { SocketModeClient } = require("@slack/socket-mode");
const { WebClient } = require("@slack/web-api");

class SlackClient {
  constructor() {
    this.slackToken = process.env.SLACK_APP_TOKEN;
    const app = new App({
      token: process.env.botToken,
      signingSecret: process.env.signingSecret,
      socketMode: true,
      appToken: process.env.apiToken,
    });

    app.action("acknowledge_button", async ({ ack, body, respond }) => {
      try {
        await ack();
        const response = await this.updateMessage(
          body.message.blocks,
          body.actions[0].value,
          body.user.username
        );
        await respond({
          blocks: response,
        });
      } catch (err) {
        console.log(err);
      }
    });

    app.action("review_button", async ({ ack }) => {
      await ack();
    });

    (async () => {
      const port = 3000;
      await app.start(process.env.PORT || port);
      console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
    })();
  }

  async updateMessage(blocks, blockValue, user) {
    blocks.forEach((block) => {
      if (block["accessory"] && block["accessory"]["value"] === blockValue) {
        block["accessory"] = {
          type: "button",
          text: {
            type: "plain_text",
            text: `:eyes:  ${user}`,
          },
          style: "primary",
          value: "ReviewButton",
          action_id: "review_button",
        };
      }
    });
    return blocks;
  }

  async postMessage(json) {
    await got.post(this.slackToken, { json });
  }
}

const slackClient = new SlackClient();
slackClient;
module.exports = SlackClient;
