#!/usr/bin/env node
"use strict";

require("dotenv").config();

const _ = require("lodash");
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
  let errorsCount = 0;
  let warningsCount = 0;

  return await Promise.map(repos, async ({ name, org }) => {
    const sortedAlerts = {};
    const alerts = await octokit.paginate(
      octokit.codeScanning.listAlertsForRepo,
      {
        owner: org,
        repo: name,
      }
    );
    alerts.forEach((alert) => {
      errorsCount += alert.rule.severity === "error";
      warningsCount += alert.rule.severity === "warning";
    });
    sortedAlerts[name] = {
      errorsCount: errorsCount,
      warningsCount: warningsCount,
    };
    return sortedAlerts;
  }).catch((error) => {
    console.error(
      `Failed for ${org}/${name}\n${error.message}\n${error.documentation_url}`
    );
  });
}

// .number, .html_url, .state, .secret_type, .secret, .resolution, .resolved_by, .resolved_at]
const getSecretAlerts = (repos) => {
  return Promise.map(repos, async ({ name, org }) => {
    const sortedAlerts = {};
    const alerts = await octokit.paginate(
      octokit.secretScanning.listAlertsForRepo,
      {
        owner: org,
        repo: name,
      }
    );
    const counts = {};
    for (var i = 0; i < alerts.length; i++) {
      if (alerts[i].state === "open") {
        var num = alerts[i]["secret_type"];
        counts[num] = counts[num] ? counts[num] + 1 : 1;
      }
    }
    sortedAlerts[name] = counts;
    return sortedAlerts;
  }).catch((error) => {
    console.error(
      `Failed for ${org}/${name}\n${error.message}\n${error.documentation_url}`
    );
  });
};

module.exports = {
  getCodeAlerts,
  getSecretAlerts,
};
