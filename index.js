const GithubClient = require("./github");
const SlackClient = require("./slack");
const _ = require("lodash");
const Promise = require("bluebird");
const dependabot = require("./dependabotAlerts");
const codeQL = require("./codeqlAlerts");
const codeqlAlerts = require("./codeqlAlerts");
const { sum } = require("lodash");
const dependabotAlerts = require("./dependabotAlerts");

const token = process.env.GITHUB_TOKEN;
const webhook = process.env.SLACK_WEBHOOK;
const searchQuery = "org:SparkPost topic:team-sa archived:false"; //process.env.GITHUB_QUERY;

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
  const codeQLAlerts = await codeQL.getCodeAlerts(repos);
  const secretAlerts = await codeQL.getSecretAlerts(repos);

  results = mergeBlocksByRepo([
    ...dependabotAlerts,
    ...codeQLAlerts,
    ...secretAlerts,
  ]);
  // if (dependabotAlerts.disabledRepos.length > 0) {
  //   blocks.push({ type: "divider" });
  //   blocks.push({
  //     type: "section",
  //     text: {
  //       type: "mrkdwn",
  //       text: `The following do not have alerts enabled: ${dependabotAlerts.disabledRepos.join(
  //         ", "
  //       )}`,
  //     },
  //   });
  // }

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
  // const allBlocks = breakBlocks(blocks);
  // // await will work with oldschool loops, but nothing that requires a callback like array.forEach()
  // for (let i = 0; i < allBlocks.length; i++) {
  //   await slackClient.postMessage({ blocks: allBlocks[i] });
  // }
  // } else {
  console.log(`Slack blocks: ${JSON.stringify(blocks, null, 2)}`);
  // }
}

function mergeBlocksByRepo(zipRepos) {
  return zipRepos.reduce(function (o, cur) {
    var occurs = o.reduce(function (n, item, i) {
      return item.repo === cur.repo ? i : n;
    }, -1);
    if (occurs >= 0) {
      o[occurs].blocks = o[occurs].blocks.concat(cur.blocks);
    } else {
      var obj = {
        repo: cur.repo,
        blocks: [cur.blocks],
      };
      o = o.concat([obj]);
    }
    return o;
  }, []);
}

function initialRepoSlackBlock(name, alertsSummary) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*<https://github.com/sparkpost/${name}|sparkpost/${name}>*\n${alertsSummary.join(
        ", "
      )}\n<https://github.com/sparkpost/${name}/network/alerts|View all>`,
    },
    accessory: {
      type: "image",
      image_url:
        "https://user-images.githubusercontent.com/10406825/85333522-ba846b80-b4a7-11ea-9774-46fa8ca693a4.png",
      alt_text: "github",
    },
  };
}

function getAlertsSummary(combinedAlerts) {
  const alertsSummary = [];
  if (combinedAlerts.critical && combinedAlerts.critical.length > 0) {
    alertsSummary.push(`${combinedAlerts.critical.length} critical`);
  }
  if (combinedAlerts.high && combinedAlerts.high.length > 0) {
    alertsSummary.push(`${combinedAlerts.high.length} high`);
  }
  if (combinedAlerts.medium && combinedAlerts.medium.length > 0) {
    alertsSummary.push(`${combinedAlerts.medium.length} medium`);
  }
  if (combinedAlerts.errorsCount > 0) {
    alertsSummary.push(`${combinedAlerts.errorsCount} errors`);
  }
  if (combinedAlerts.warningsCount > 0) {
    alertsSummary.push(`${combinedAlerts.warningsCount} warnings`);
  }
  if (!_.isEmpty(combinedAlerts.secrets)) {
    alertsSummary.push(`${_.size(combinedAlerts.secrets)} secrets`);
  }
  return alertsSummary;
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
