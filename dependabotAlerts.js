"use strict";
const _ = require("lodash");

const got = require("got");
const Promise = require("bluebird");
const token = process.env.GITHUB_TOKEN;
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: token,
  // Set GitHub Auth Token in environment variable
});

let disabledRepos = [];

async function hasAlertsEnabled(owner, repo) {
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    await got(`${repoUrl}/vulnerability-alerts`, {
      headers: {
        Accept: "application/vnd.github.dorian-preview+json",
        "User-Agent": "node-script",
        Authorization: `token ${token}`,
      },
    });
  } catch (err) {
    if (err.response.statusCode === 404) {
      return false;
    } else {
      throw new Error(
        `Could not retrieve vulnerability alerts - status code ${err.response.statusCode}`
      );
    }
  }
  return true;
}

async function getAlerts(repos) {
  const sortedAlerts = [];
  await Promise.map(repos, async ({ org, name }) => {
    const enabledAlerts = await hasAlertsEnabled(org, name);
    if (!enabledAlerts) {
      disabledRepos.push(`<https://github.com/${org}/${name}|${org}/${name}>`);
    } else {
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

      if (criticalAlerts.length > 0 || highAlerts.length > 0) {
        var obj = {};
        obj[name] = {
          critical: criticalAlerts,
          high: highAlerts,
          medium: mediumAlerts,
        };
        sortedAlerts.push(obj);
      }
    }
  });
  return { sortedAlerts: sortedAlerts, disabledRepos: disabledRepos };
}

async function getVulnerabilities(owner, repo) {
  const query = getVulnerabilityAlertQuery(owner, repo);
  const results = await octokit.graphql(query);
  const alerts = _.map(results.repository.vulnerabilityAlerts.edges, "node");
  return _.map(alerts, (alert) => {
    return {
      id: alert.id,
      created_at: alert.createdAt,
      severity: _.lowerCase(alert.securityVulnerability.severity),
      description: alert.securityAdvisory.description,
      package_name: alert.securityVulnerability.package.name,
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

module.exports = {
  getAlerts,
};
