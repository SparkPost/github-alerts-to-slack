#!/usr/bin/env node
"use strict";

require("dotenv").config();

const _ = require("lodash");
const moment = require("moment");
const owner = "Sparkpost";
const Promise = require("bluebird");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  // Set GitHub Auth Token in environment variable
});

const [, , ...args] = process.argv;

//  .number, .created_at, .url, .html_url, .state, .dismissed_by.login, .dismissed_at, .dismissed_reason, .rule.id, .rule.severity, .rule.description, .tool.name, .most_recent_instance.classifications[]]
function getCodeAlerts(repos) {
  return Promise.map(repos, ({ name, org }) => {
    const sortedAlerts = {};
    const summary = {};

    return octokit
      .paginate(octokit.codeScanning.listAlertsForRepo, {
        owner: org,
        repo: name,
      })
      .then((alerts) => {
        const filteredAlerts = filterCodeAlerts(alerts);

        filteredAlerts.forEach((alert) => {
          var rule = alert.rule.description;
          if (!sortedAlerts[rule]) {
            sortedAlerts[rule] = { count: 1 };
            sortedAlerts[rule]["createdAt"] = alert.created_at;
            sortedAlerts[rule]["severity"] = alert.rule.severity;
          } else {
            sortedAlerts[rule]["count"] += 1;
          }
          if (alert.rule.severity === "error") {
            summary.error = (summary.error || 0) + 1;
          }
          if (alert.rule.severity === "warning") {
            summary.warning = (summary.warning || 0) + 1;
          }
        });
        return sortedAlerts;
      })
      .then((sortedAlerts) => {
        const blocks = Object.keys(sortedAlerts).map((alert) =>
          buildBlocks("code", alert, sortedAlerts[alert])
        );
        return { repo: name, summary, blocks };
      });
  }).catch((error) => {
    console.error(
      `Failed for ${org}/${name}\n${error.message}\n${error.documentation_url}`
    );
  });
}

function filterCodeAlerts(alerts) {
  return alerts.filter((alert) => {
    alert.rule.severity !== "note" &&
      alert.most_recent_instance.classifications !== "test" &&
      moment(alert.created_at).add(14, "days") < moment();
  });
}

// .number, .html_url, .state, .secret_type, .secret, .resolution, .resolved_by, .resolved_at]
function getSecretAlerts(repos) {
  return Promise.map(repos, ({ name, org }) => {
    const sortedAlerts = {};
    const summary = {};

    return octokit
      .paginate(octokit.secretScanning.listAlertsForRepo, {
        owner: org,
        repo: name,
      })
      .then((alerts) => {
        alerts.forEach((alert) => {
          if (alert.state === "open") {
            const type = alert.secret_type;
            if (!sortedAlerts[type]) {
              sortedAlerts[type] = { count: 1 };
              sortedAlerts[type]["createdAt"] = alert.created_at;
            } else {
              sortedAlerts[type]["count"] += 1;
            }
            summary["secret"] = (summary["secret"] || 0) + 1;
          }
        });
        return sortedAlerts;
      })
      .then((sortedAlerts) => {
        const blocks = [];
        Object.keys(sortedAlerts).forEach((alert) =>
          blocks.push(buildBlocks("secret", alert, sortedAlerts[alert]))
        );
        return { repo: name, summary, blocks };
      });
  }).catch((error) => {
    console.error(
      `Failed for ${org}/${name}\n${error.message}\n${error.documentation_url}`
    );
  });
}

function buildBlocks(alertType, name, { count, createdAt, severity }) {
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
