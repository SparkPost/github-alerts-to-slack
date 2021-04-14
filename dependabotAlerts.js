"use strict";
const _ = require("lodash");

const Promise = require("bluebird");
const token = process.env.GITHUB_TOKEN;
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: token,
  // Set GitHub Auth Token in environment variable
});

function getAlerts(repos) {
  return Promise.map(repos, async ({ org, name }) => {
    const blocks = [];
    const summary = {};
    const alerts = await getVulnerabilities(org, name);
    const criticalAlerts = alerts.filter(
      (alert) => alert.severity === "critical" && !alert.dismissed
    );
    const highAlerts = alerts.filter(
      (alert) => alert.severity === "high" && !alert.dismissed
    );
    const mediumAlerts = alerts.filter(
      (alert) => alert.severity === "moderate" && !alert.dismissed
    );

    // Dependabot calls these "moderate", but SparkPost categorizes these as "medium"
    mediumAlerts.forEach((mediumAlert) => (mediumAlert.severity = "medium"));

    if (criticalAlerts.length > 0) {
      criticalAlerts.forEach((alert) => {
        blocks.push(buildBlocks(alert));
      });
      summary["critical"] = criticalAlerts.length;
    }
    if (highAlerts.length > 0) {
      highAlerts.forEach((alert) => {
        blocks.push(buildBlocks(alert));
      });
      summary["high"] = highAlerts.length;
    }
    if (mediumAlerts.length > 0 && (summary.critical || summary.high)) {
      mediumAlerts.forEach((alert) => {
        blocks.push(buildBlocks(alert));
      });
      summary["medium"] = mediumAlerts.length;
    }
    return { repo: name, summary, blocks };
  });
}

const getVulnerabilities = async (owner, repo) => {
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
};

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

function buildBlocks(alert) {
  return {
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
  };
}

module.exports = {
  getAlerts,
};
