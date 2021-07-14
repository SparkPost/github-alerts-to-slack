const got = require("got");
const { App } = require("@slack/bolt");
const { SocketModeClient } = require("@slack/socket-mode");
const { WebClient } = require("@slack/web-api");

class SlackClient {
  constructor() {
    this.botToken = "xoxb-2166135452-1788032209014-aaqbogxqC9XpyLvxXyetfBj3";
    this.signingSecret = "7f69dea7c755fea56fafc1490802b0b4";
    this.apiToken =
      "xapp-1-A01PJSYLRE0-2262870196802-bb342288f4ab470044aef778ab091afd9dedef75f22a5d0279f3810a6a64694e";
    this.webhook =
      "https://hooks.slack.com/services/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";
    const app = new App({
      token: this.botToken,
      signingSecret: this.signingSecret,
      socketMode: true,
      appToken: this.apiToken,
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
    await got.post(this.webhook, { json });
  }
}

const slackClient = new SlackClient();
slackClient;
module.exports = SlackClient;
