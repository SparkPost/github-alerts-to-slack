const _ = require("lodash");
const got = require("got");
const moment = require("moment");

const { Octokit } = require("@octokit/rest");
const Promise = require("bluebird");
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  // Set GitHub Auth Token in environment variable
});
class GitHubClient {
  constructor(token) {
    this.token = token;
    this.owner = "sparkpost";
  }

  _getReposQuery(searchQuery) {
    return `query { 
        search(
          query: "${searchQuery}",
          type: REPOSITORY, last: 50
        ) {
          repositoryCount
          edges {
            node {
              ... on Repository {
                name
                nameWithOwner
              }
            }
          }
        }
      }`;
  }

  async getDependabotPullRequests(org, name) {
    let mergeableBranchList = "";
    const pulls = await octokit.paginate("GET /repos/:owner/:repo/pulls", {
      owner: org,
      repo: name,
    });
    const branches = [];
    const prShaList = [];
    const prIds = [];
    for (const pull of pulls) {
      const branch = pull["head"]["ref"];
      if (branch.startsWith("dependabot")) {
        branches.push(branch);
        prIds.push(pull["pull_number"]);
        prShaList.push(pull["head"]["sha"]);
      }
    }
    if (branches.length == 0) {
      return { mergeableBranchList, prShaList, prIds };
    } else {
      mergeableBranchList = branches.join(" ");
    }
    return { mergeableBranchList, prShaList, prIds };
  }

  async getDefaultBranch(owner, repo, branchName) {
    try {
      const branch = await octokit.repos.getBranch({
        owner,
        repo,
        branch: branchName,
      });
      return branch;
    } catch (err) {
      // if 404 status continue
      if (err.status !== 404) {
        throw new Error(
          `Could not retrieve default branch - status code ${err.status}`
        );
      }
    }
  }

  // create new branch
  async createReference(owner, repo, sha) {
    const ref = "refs/heads/dependabot_combined_branches";
    try {
      return await octokit.git.createRef({
        owner,
        repo,
        ref,
        sha,
      });
    } catch (err) {
      if (err.status == 422) {
        try {
          return await octokit.git.getRef({
            owner,
            repo,
            ref: "heads/dependabot_combined_branches",
          });
        } catch (err) {
          throw new Error(
            `Could not get combined branch - status code ${err.status}`
          );
        }
      }
      throw new Error(
        `Could not create combined branch - status code ${err.status}`
      );
    }
  }

  // Add dependabot commits to new branh
  async updateReference(owner, repo, sha) {
    try {
      return octokit.repos.merge({
        owner,
        repo,
        base: "dependabot_combined_branches",
        head: sha,
      });
    } catch (err) {
      if (err.status != 409) {
        throw new Error(
          `Could not update combined branch - status code ${err.status}`
        );
      }
    }
  }

  // merge pull requests
  async mergePullRequests(owner, repo, pull_number) {
    try {
      await octokit.pulls.merge({
        owner,
        repo,
        pull_number,
        merge_method: "rebase",
        commit_title: `${repo}-${pull_number}`,
      });
    } catch (err) {
      if (err.status === 405) {
        //merged failed, possibly due to tests failing.
        return;
      } else if (err.status === 409) {
        //merge conflict
        return;
      }
      throw new Error(
        `Could not merge PR into combined branch - status code ${err.status}`
      );
    }
  }

  // create pull request
  async createPullRequest(owner, repo, base) {
    try {
      const t = await octokit.pulls.create({
        owner,
        repo,
        head: "dependabot_combined_branches",
        base: "main",
        title: "Dependabot combined security alerts",
      });
    } catch (err) {
      if (err.status !== 422) {
        throw new Error(
          `Could not create combined branch pull request - status code ${err.status}`
        );
      }
    }
  }

  // close previously created dependabot pull requests
  async closePullRequest(owner, repo, pull_number) {
    await octokit.request("PATCH /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner,
      repo,
      pull_number,
      state: "closed",
    });
  }

  async getRepos(searchQuery) {
    const results = await octokit.graphql(this._getReposQuery(searchQuery));
    const repos = _.map(results.search.edges, "node");
    return repos.map((repo) => {
      const [org, name] = repo.nameWithOwner.split("/");
      return { org, name };
    });
  }

  async hasAlertsEnabled(repos) {
    const enabled = [];
    const disabled = [];
    await Promise.each(repos, async (repo) => {
      const repoUrl = `https://api.github.com/repos/${repo.org}/${repo.name}`;
      try {
        await got(`${repoUrl}/vulnerability-alerts`, {
          headers: {
            Accept: "application/vnd.github.dorian-preview+json",
            "User-Agent": "node-script",
            Authorization: `token ${this.token}`,
          },
        });
        enabled.push(repo);
      } catch (err) {
        if (err.response.statusCode === 404) {
          disabled.push(`<https://github.com/${repo.org}/${repo.name}>`);
        } else {
          throw new Error(
            `Could not retrieve vulnerability alerts - status code ${err.response.statusCode}`
          );
        }
      }
    });
    return { enabled, disabled };
  }
}

module.exports = GitHubClient;
