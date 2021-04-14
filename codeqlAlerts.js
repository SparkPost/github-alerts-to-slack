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
  userAgent: "secrets v1.2.3",

  // Set GitHub Auth Token in environment variable
});

const [, , ...args] = process.argv;

//  .number, .created_at, .url, .html_url, .state, .dismissed_by.login, .dismissed_at, .dismissed_reason, .rule.id, .rule.severity, .rule.description, .tool.name, .most_recent_instance.classifications[]]
function getCodeAlerts(repos) {
  const codeAlerts = [];
  return Promise.each(repos, ({ name, org }) => {
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
          if (alert.most_recent_instance.state !== "open") return;

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
        codeAlerts.push({ repo: name, summary, blocks });
      })
      .catch((error) => {
        // if it's a 403, that means code scanning was not enabled on this repo.
        // See https://docs.github.com/rest/reference/code-scanning#list-code-scanning-alerts-for-a-repository
        if (error.status !== 403) {
          console.error(error);
        }
      });
  }).then(() => codeAlerts);
}

function filterCodeAlerts(alerts) {
  return alerts.filter((alert) => {
    return (
      alert.rule.severity !== "note" &&
      alert.most_recent_instance.classifications !== "test" &&
      moment(alert.created_at).add(14, "days") < moment()
    );
  });
}

// .number, .html_url, .state, .secret_type, .secret, .resolution, .resolved_by, .resolved_at]
function getSecretAlerts(repos) {
  const repoAlerts = Promise.map(repos, ({ name, org }) => {
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
        const alerts = Object.keys(sortedAlerts);
        alerts.forEach((alert) => {
          blocks.push(buildBlocks("secret", alert, sortedAlerts[alert]));
        });
        return { repo: name, summary, blocks };
      })
      .catch((err) => {
        if (err.status === 404) {
          // secret alerts does not support public repos
          return;
        }
      });
  }).catch((err) => {
    throw new Error(
      `Could not retrieve vulnerability alerts - status code ${err.status}`
    );
  });
  return repoAlerts.filter(function (alert) {
    return alert != null;
  });
}

function buildBlocks(alertType, name, { count, createdAt, severity }) {
  const secretBlock = {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*${name}* x ${count}`,
      },
      {
        type: "mrkdwn",
        text: `*Created on* ${createdAt}`,
      },
    ],
  };

  const codeBlock = {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*${name}* x ${count} \n*Severity Level*: (${severity})`,
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
