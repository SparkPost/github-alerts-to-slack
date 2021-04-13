const _ = require("lodash");
const got = require("got");

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
