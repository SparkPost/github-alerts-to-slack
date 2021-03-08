const _ = require("lodash");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: "9ed5cf7029a7d468438b0b734bb5bef1fd37b261",
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
          type: REPOSITORY, last: 10
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
      return { org: org, name: name };
    });
  }
}

module.exports = GitHubClient;
