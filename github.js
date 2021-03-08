const _ = require("lodash");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: "8282e58ba536c6b7b800253b20f0432482ee95c6",
  // Set GitHub Auth Token in environment variable
});
class GitHubClient {
  constructor(token) {
    this.token = token;
  }

  _getReposQuery(searchQuery) {
    return `query { 
        search(
          query: "${searchQuery}",
          type: REPOSITORY, last: 1
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
    return _.map(repos, (repo) => {
      const [org, name] = repo.nameWithOwner.split("/");
      return { org: org, name: "msys-python-stl" };
    });
  }
}

module.exports = GitHubClient;
