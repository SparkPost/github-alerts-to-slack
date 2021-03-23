"use strict";

const GithubClient = require("./github");
const SlackClient = require("./slack");
const _ = require("lodash");
const dependabot = require("./dependabotAlerts");
const codeQL = require("./codeqlAlerts");
const codeqlAlerts = require("./codeqlAlerts");

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
    { type: "divider" },
  ];

  const repos = await githubClient.getRepos(searchQuery);
  const codeQLAlerts = await codeQL.getCodeAlerts(repos);
  const secretAlerts = await codeQL.getSecretAlerts(repos);

  // get enabled and disabled dependabot alerts
  const hasAlertsEnabled = await githubClient.hasAlertsEnabled(repos);
  const dependabotAlerts = await dependabot.getAlerts(hasAlertsEnabled.enabled);

  const results = mergeBlocksByRepo([
    ...dependabotAlerts,
    ...secretAlerts,
    ...codeQLAlerts,
  ]);

  // insert summary blocks
  results.forEach((repo) => {
    blocks.push({ type: "divider" });
    const summaryBlock = getAlertsSummary(repo.repo, repo.summary);
    if (summaryBlock) {
      repo.blocks.unshift(summaryBlock);
      repo.blocks.forEach((block) => {
        if (Array.isArray(block)) {
          block.forEach((b) => {
            blocks.push(b);
          });
        } else {
          blocks.push(block);
        }
      });
    }
  });

  if (hasAlertsEnabled.disabled.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `The following do not have alerts enabled: ${hasAlertsEnabled.disabled.join(
          ", "
        )}`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Query: ${searchQuery}`,
      },
    ],
  });

  if (process.env.POST_TO_SLACK === "true") {
    const allBlocks = breakBlocks(blocks);
    // await will work with oldschool loops, but nothing that requires a callback like array.forEach()
    for (let i = 0; i < allBlocks.length; i++) {
      await slackClient.postMessage({ blocks: allBlocks[i] });
    }
  } else {
    console.log(`Slack blocks: ${JSON.stringify(blocks, null, 2)}`);
  }
}

function mergeBlocksByRepo(zipRepos) {
  return zipRepos.reduce(function (zippedRepos, obj) {
    const repo = zippedRepos.reduce(function (i, item, j) {
      return item.repo === obj.repo ? j : i;
    }, -1);
    if (repo >= 0) {
      zippedRepos[repo].blocks = zippedRepos[repo].blocks.concat(obj.blocks);
      zippedRepos[repo].summary = zippedRepos[repo].summary.concat(obj.summary);
    } else {
      const mergedBlocks = {
        repo: obj.repo,
        blocks: [obj.blocks],
        summary: [obj.summary],
      };
      zippedRepos = zippedRepos.concat([mergedBlocks]);
    }
    return zippedRepos;
  }, []);
}

function initialRepoSlackBlock(name, alertsSummary) {
  if (alertsSummary.length > 0) {
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
}

function getAlertsSummary(name, repoSummary) {
  const alertsSummary = [];
  repoSummary.forEach((summary) => {
    Object.keys(summary).forEach((severity) => {
      const count = summary[severity];
      if (count > 0) {
        alertsSummary.push(`${count} ${severity}`);
      }
    });
  });
  return initialRepoSlackBlock(name, alertsSummary);
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
