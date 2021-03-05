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

let buffer = {};

const [, , ...args] = process.argv;

//  .number, .created_at, .url, .html_url, .state, .dismissed_by.login, .dismissed_at, .dismissed_reason, .rule.id, .rule.severity, .rule.description, .tool.name, .most_recent_instance.classifications[]]
async function getCodeAlerts(repos) {
  let sortedAlerts = [];
  await Promise.map(repos, async ({ name, org }) => {
    console.log(name, org);
    octokit
      .paginate(octokit.codeScanning.listAlertsForRepo, {
        org,
        name,
      })
      .then((alerts) => {
        const sortedAlerts = alerts.filter(
          (alert) => alert.rule.severity !== "note"
        );
        buffer[name] = sortedAlerts;
        _.concat(sortedAlerts, {
          name: {
            created_at: created_at,
            state: state,
            severity: rule.severity,
            description: rule.description,
          },
        });
      })
      .then(Promise.map(repos))
      .catch((error) => {
        console.error(
          `Failed for ${owner}/${name}\n${error.message}\n${error.documentation_url}`
        );
      });
  });
}

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

module.exports = {
  getCodeAlerts,
};
