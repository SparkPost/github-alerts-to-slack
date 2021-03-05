#!/usr/bin/env node
"use strict";

require("dotenv").config();

const owner = "Sparkpost";
const fileName = "alerts_" + Date.now() + ".json";
const Promise = require("bluebird");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: " 718961ff55b8ed175469680d33f11f8857ef0802",
  // Set GitHub Auth Token in environment variable
});

let buffer = {};

const [, , ...args] = process.argv;

//  .number, .created_at, .url, .html_url, .state, .dismissed_by.login, .dismissed_at, .dismissed_reason, .rule.id, .rule.severity, .rule.description, .tool.name, .most_recent_instance.classifications[]]
const getCodeAlerts = (repos) => {
  Promise.map(repos, async function (repo) {
    octokit
      .paginate(octokit.codeScanning.listAlertsForRepo, {
        owner,
        repo,
      })
      .then((alerts) => {
        alerts = alerts.filter((alert) => alert.rule.severity !== "note");
        buffer[repo] = alerts;
      })
      .catch((error) => {
        console.error(
          `Failed for ${owner}/${repo}\n${error.message}\n${error.documentation_url}`
        );
      });
  }).then(() => {
    _.concat(sortedAlerts, {
      name: {
        created_at: created_at,
        state: state,
        severity: rule.severity,
        description: rule.description,
      },
    });
  });
};

// .number, .html_url, .state, .secret_type, .secret, .resolution, .resolved_by, .resolved_at]
const getSecretAlerts = (repos) => {
  Promise.map(repos, async function (repo) {
    // console.debug(repo);
    return octokit
      .paginate(octokit.secretScanning.listAlertsForRepo, {
        owner,
        repo,
      })
      .catch((error) => {
        console.error(
          `Failed for ${owner}/${repo}\n${error.message}\n${error.documentation_url}`
        );
      });
  }).then(() => {
    _.concat(sortedAlerts, {
      name: {
        created_at: created_at,
        secret_type: secret_type,
      },
    });
  });
};

module.exports.getCodeAlerts;
