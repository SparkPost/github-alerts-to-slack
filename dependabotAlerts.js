"use strict";
const _ = require("lodash");

const Promise = require("bluebird");
const { Octokit } = require("@octokit/rest");
const token = process.env.GITHUB_TOKEN;
const GithubClient = require("./github");
const githubClient = new GithubClient(token);
const moment = require("moment");
const { compact, pull } = require("lodash");

const octokit = new Octokit({
  auth: token,
  // Set GitHub Auth Token in environment variable
});

function getAlerts(repos) {
  return Promise.map(repos, async ({ org, name }) => {
    const blocks = [];
    const summary = {};
    const block = "";
    let mergeable = false;
    const alerts = await getVulnerabilities(org, name);
    const {
      mergeableBranchList,
      prShaList,
      prIds,
    } = await githubClient.getDependabotPullRequests(org, name);
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
        blocks.push(
          buildBlocks(alert, mergeableBranchList.includes(alert.packageName))
        );
        mergeable =
          mergeable || mergeableBranchList.includes(alert.packageName);
      });
      summary["critical"] = criticalAlerts.length;
    }
    if (highAlerts.length > 0) {
      highAlerts.forEach((alert) => {
        blocks.push(
          buildBlocks(alert, mergeableBranchList.includes(alert.packageName))
        );
        mergeable =
          mergeable || mergeableBranchList.includes(alert.packageName);
      });
      summary["high"] = highAlerts.length;
    }
    // if (mediumAlerts.length > 0 && (summary.critical || summary.high)) {
    if (mediumAlerts.length > 0) {
      mediumAlerts.forEach((alert) => {
        blocks.push(
          buildBlocks(alert, mergeableBranchList.includes(alert.packageName))
        );
        mergeable =
          mergeable || mergeableBranchList.includes(alert.packageName);
      });
      summary["medium"] = mediumAlerts.length;
    }
    createCombinedPR(org, name, prShaList, prIds);
    return { repo: name, summary, blocks, mergeable };
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

const createCombinedPR = async (org, name, prShaList, prIds) => {
  const defaultBranchOptions = ["main", "master", "default"];
  defaultBranchOptions.forEach(async (branchName) => {
    githubClient
      .getDefaultBranch(org, name, branchName)
      .then((defaultBranch) => {
        if (defaultBranch) {
          githubClient
            .createReference(org, name, defaultBranch.data.commit.sha)
            .then((branchData) => {
              if (!branchData) {
                return;
              }
              prShaList.forEach(async (sha) => {
                const t = await githubClient
                  .updateReference(org, name, sha)
                  .catch((err) => {
                    if (err.status != 409) {
                      throw new Error(
                        `Could not update combined branch - status code ${err.status}`
                      );
                    }
                  });
              });
              githubClient
                .createPullRequest(org, name, defaultBranch.data.name)
                .then((yeah) => {
                  console.log("prIds", yean);
                  prIds.forEach((id) => {
                    // githubClient.closePullRequest(org, name, id)
                  });
                })
                .catch((err) => {
                  if (err.status !== 404) {
                    throw new Error(
                      `Error creating dependabot combined pull request - status code ${err.status}`
                    );
                  }
                });
            });
        }
      });
  });
};

function buildBlocks(alert, mergeable) {
  let due = "";
  const timeline = {
    critical: 14,
    high: 30,
    medium: 60,
    low: 90,
  };
  const currentDate = moment();
  const dueDate = moment(alert.createdAt).add(timeline[alert.severity], "days");
  if (dueDate < currentDate) {
    due = "Past due";
  } else {
    due = `Due in ${dueDate.diff(currentDate, "days")} days`;
  }

  return {
    type: "section",
    block_id: `section-${alert.id}`,
    fields: [
      {
        type: "mrkdwn",
        text: `${mergeable ? ":ship: " : ""}${alert.packageName} - ${
          alert.severity
        }`,
      },
      {
        type: "mrkdwn",
        text: `*${due}*`,
      },
    ],
  };
}

module.exports = {
  getAlerts,
};
