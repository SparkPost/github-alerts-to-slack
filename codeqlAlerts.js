#!/usr/bin/env node
"use strict";

require("dotenv").config();

const _ = require("lodash");
const moment = require("moment");
const owner = "Sparkpost";
const fileName = "alerts_" + Date.now() + ".json";
const Promise = require("bluebird");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  // Set GitHub Auth Token in environment variable
});

const [, , ...args] = process.argv;

//  .number, .created_at, .url, .html_url, .state, .dismissed_by.login, .dismissed_at, .dismissed_reason, .rule.id, .rule.severity, .rule.description, .tool.name, .most_recent_instance.classifications[]]
async function getCodeAlerts(repos) {
  return await Promise.map(repos, async ({ name, org }) => {
    const sortedAlerts = {};
    return await octokit
      .paginate(octokit.codeScanning.listAlertsForRepo, {
        owner: org,
        repo: name,
      })
      .then(async (alerts) => {
        const filteredAlerts = await filterCodeAlerts(alerts);
        for (var i = 0; i < filteredAlerts.length; i++) {
          var rule = filteredAlerts[i].rule.description;
          if (!sortedAlerts[rule]) {
            sortedAlerts[rule] = { count: 1 };
            sortedAlerts[rule]["createdAt"] = alerts[i].created_at;
            sortedAlerts[rule]["severity"] = alerts[i].rule.severity;
          } else {
            sortedAlerts[rule]["count"] += 1;
          }
        }
        return sortedAlerts;
      })
      .then(async (sortedAlerts) => {
        const blocks = [];
        for (const alert in sortedAlerts) {
          blocks.push(await buildBlocks("code", alert, sortedAlerts[alert]));
        }
        return { repo: name, blocks };
      });
  }).catch((error) => {
    console.error(
      `Failed for ${org}/${name}\n${error.message}\n${error.documentation_url}`
    );
  });
}

async function filterCodeAlerts(alerts) {
  return alerts.filter((alert) => {
    const remediationDue = moment(alert.created_at).add(14, "days");
    if (
      alert.rule.severity !== "note" &&
      alert.most_recent_instance.classifications !== "test" &&
      remediationDue < moment()
    ) {
      return alert;
    }
  });
}

// .number, .html_url, .state, .secret_type, .secret, .resolution, .resolved_by, .resolved_at]
async function getSecretAlerts(repos) {
  return Promise.map(repos, async ({ name, org }) => {
    const sortedAlerts = {};
    return await octokit
      .paginate(octokit.secretScanning.listAlertsForRepo, {
        owner: org,
        repo: name,
      })
      .then((alerts) => {
        for (var i = 0; i < alerts.length; i++) {
          if (alerts[i].state === "open") {
            var type = alerts[i].secret_type;
            if (!sortedAlerts[type]) {
              sortedAlerts[type] = { count: 1 };
              sortedAlerts[type]["createdAt"] = alerts[i].created_at;
            } else {
              sortedAlerts[type]["count"] += 1;
            }
          }
        }
        return sortedAlerts;
      })
      .then(async (sortedAlerts) => {
        const blocks = [];
        for (const alert in sortedAlerts) {
          blocks.push(await buildBlocks("secret", alert, sortedAlerts[alert]));
        }
        return { repo: name, blocks };
      });
  }).catch((error) => {
    console.error(
      `Failed for ${org}/${name}\n${error.message}\n${error.documentation_url}`
    );
  });
}

async function buildBlocks(alertType, name, { count, createdAt, severity }) {
  const secretBlock = {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Secret ${name} (Occurrences)*\n (${count})`,
      },
      {
        type: "mrkdwn",
        text: `*Created on*\n${createdAt}`,
      },
    ],
  };

  const codeBlock = {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Code (Severity Level)*\n${name} x ${count} (${severity})`,
      },
      {
        type: "mrkdwn",
        text: `*Created on*\n${createdAt}`,
      },
    ],
  };

  return alertType === "secret" ? secretBlock : codeBlock;
}

module.exports = {
  getCodeAlerts,
  getSecretAlerts,
};
