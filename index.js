const GithubClient = require("./github");
const SlackClient = require("./slack");
const _ = require("lodash");
const Promise = require("bluebird");
const dependabot = require("./dependabotAlerts");
const codeQL = require("./codeqlAlerts");

const token = process.env.GITHUB_TOKEN;
const webhook = process.env.SLACK_WEBHOOK;
const searchQuery = process.env.GITHUB_QUERY;

const githubClient = new GithubClient(token);
const slackClient = new SlackClient(webhook);

async function doTheThing() {
  let blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:wave: GitHub Security Alerts Report\n\nThe following repositories have open vulnerability alerts and need your attention.`,
      },
    },
  ];

  const repos = await githubClient.getRepos(searchQuery);

  const dependabotAlerts = await dependabot.getAlerts(repos);
  const codeQLAlerts = await codeQL.getCodeAlerts(repos).name;

  const zipRepos = (dependabot, codeQL) => {
    blocks.push({ type: "divider" });
    blocks = blocks.concat();
    const combine = _.merge(dependabot, codeQL);
  };

  const blockDisabledRepos = (alertType, disabledRepos) => {
    if (disabledRepos.length > 0) {
      blocks.push({ type: "divider" });
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `The following do not have ${alertType} alerts enabled: ${disabledRepos.join(
            ", "
          )}`,
        },
      });
    }
  };
}

function formatAlertsForSlack({ org, name, combinedAlerts }) {
  const alertsSummary = [];
  if (combinedAlerts.critical.length > 0) {
    alertsSummary.push(`${dependabot.criticalAlerts.length} critical`);
  }
  if (combinedAlerts.high.length > 0) {
    alertsSummary.push(`${dependabot.highAlerts.length} high`);
  }
  if (combinedAlerts.medium.length > 0) {
    alertsSummary.push(`${dependabot.mediumAlerts.length} medium`);
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<https://github.com/${org}/${name}|${org}/${name}>*\n${alertsSummary.join(
          ", "
        )}\n<https://github.com/${org}/${name}/network/alerts|View all>`,
      },
      accessory: {
        type: "image",
        image_url:
          "https://user-images.githubusercontent.com/10406825/85333522-ba846b80-b4a7-11ea-9774-46fa8ca693a4.png",
        alt_text: "github",
      },
    },
  ];
  criticalAlerts.forEach((criticalAlert) => {
    blocks.push(formatAlertForSlack(criticalAlert));
  });
  highAlerts.forEach((highAlert) => {
    blocks.push(formatAlertForSlack(highAlert));
  });
  mediumAlerts.forEach((mediumAlert) => {
    blocks.push(formatAlertForSlack(mediumAlert));
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Query: ${searchQuery}`,
      },
    ],
  });

  // if (process.env.POST_TO_SLACK === "true") {
  //   const allBlocks = breakBlocks(blocks);
  //   // await will work with oldschool loops, but nothing that requires a callback like array.forEach()
  //   for (let i = 0; i < allBlocks.length; i++) {
  //     await slackClient.postMessage({ blocks: allBlocks[i] });
  //   }
  // } else {
  console.log(`Slack blocks: ${JSON.stringify(blocks, null, 2)}`);
  // }

  return blocks;
}

function formatAlertForSlack({ id, package_name, severity, created_at }) {
  return {
    type: "section",
    block_id: `section-${id}`,
    fields: [
      {
        type: "mrkdwn",
        text: `*Package (Severity Level)*\n${package_name} (${severity})`,
      },
      {
        type: "mrkdwn",
        text: `*Created on*\n${created_at}`,
      },
    ],
  };
}

/**
 * Slack only allows 50 blocks per message, break array of all blocks into groups of at most 50.
 * Returns an array of arrays of blocks in order.
 * @param {*} blocks
 */
function breakBlocks(blocks) {
  const maxBlocks = 50;
  const allBlocks = [];
  while (blocks.length > maxBlocks) {
    // I'm sorry for using splice, no one is happy about this
    // this removes the first maxBlocks array entries from the blocks array and returns them into the chunk array
    // we push chunks onto allBlocks until we're below the maxBlocks threshold
    const chunk = blocks.splice(0, maxBlocks);
    allBlocks.push(chunk);
  }

  if (blocks.length > 0) {
    // add the remaining blocks to the allBlocks array
    allBlocks.push(blocks);
  }
  return allBlocks;
}

return doTheThing().catch((err) => {
  console.log(`It failed :( - ${err})`);
  process.exit(-1);
});
