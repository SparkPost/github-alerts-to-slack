"use strict";
const _ = require("lodash");

const Promise = require("bluebird");
const token = process.env.GITHUB_TOKEN;
const { Octokit } = require("@octokit/rest");
const { sum } = require("lodash");
const octokit = new Octokit({
  auth: token,
  // Set GitHub Auth Token in environment variable
});

async function getAlerts(repos) {
  const sortedAlerts = [];
  const blocks = [];
  const summary = {};
  return await Promise.map(repos, async ({ org, name }) => {
    const alerts = await getVulnerabilities(org, name);
    const criticalAlerts = _.filter(alerts, {
      severity: "critical",
      dismissed: false,
    });
    const highAlerts = _.filter(alerts, {
      severity: "high",
      dismissed: false,
    });
    const mediumAlerts = _.filter(alerts, {
      severity: "moderate",
      dismissed: false,
    });
    // Dependabot calls these "moderate", but SparkPost categorizes these as "medium"
    mediumAlerts.forEach((mediumAlert) => (mediumAlert.severity = "medium"));

    if (criticalAlerts.length > 0) {
      blocks.push(await buildBlocks(criticalAlerts));
      summary["critical"] = criticalAlerts.length;
    }
    if (highAlerts.length > 0) {
      blocks.push(await buildBlocks(highAlerts));
      summary["high"] = highAlerts.length;
    }
    if ("critial" || "high" in summary) {
      blocks.push(await buildBlocks(mediumAlerts));
      summary["medium"] = mediumAlerts.length;
    }
    return { repo: name, summary, blocks };
  });
}

async function getVulnerabilities(owner, repo) {
  const query = getVulnerabilityAlertQuery(owner, repo);
  const results = await octokit.graphql(query);
  const alerts = _.map(results.repository.vulnerabilityAlerts.edges, "node");
  return _.map(alerts, (alert) => {
    return {
      id: alert.id,
      createdAt: alert.createdAt,
      severity: _.lowerCase(alert.securityVulnerability.severity),
      description: alert.securityAdvisory.description,
      packageName: alert.securityVulnerability.package.name,
      dismissed: !!alert.dismissReason,
    };
  });
}

const getVulnerabilityAlertQuery = (owner, repo, limit = 50) => {
  return `query {
      repository(owner:"${owner}", name:"${repo}") {
        vulnerabilityAlerts(last:${limit}) {
          edges {
            node {
              id
              createdAt
              vulnerableRequirements
              vulnerableManifestFilename
              dismissReason 
              securityAdvisory {
                description
                ghsaId
                id
                origin
                permalink
                summary
              }
              securityVulnerability {
                severity
                package { name }
                firstPatchedVersion { identifier }
              }
            }
          }
        }
      }
    }`;
};

async function buildBlocks(alerts) {
  const blocks = [];
  alerts.forEach((alert) => {
    blocks.push({
      type: "section",
      block_id: `section-${alert.id}`,
      fields: [
        {
          type: "mrkdwn",
          text: `*Package (Severity Level)*\n${alert.packageName} (${alert.severity})`,
        },
        {
          type: "mrkdwn",
          text: `*Created on*\n${alert.createdAt}`,
        },
      ],
    });
  });
  return blocks;
}

module.exports = {
  getAlerts,
};
