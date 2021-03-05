const { GraphQLClient } = require("graphql-request");
const got = require("got");
const _ = require("lodash");

class GitHubClient {
  constructor(token) {
    this.token = token;
    this.graphQLClient = new GraphQLClient("https://api.github.com/graphql", {
      headers: {
        authorization: `bearer ${"token"}`,
      },
    });
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
    const query = this._getReposQuery(searchQuery);
    const results = await this.graphQLClient.request(query);
    const repos = _.map(results.search.edges, "node");

    return _.map(repos, (repo) => {
      const [org, name] = repo.nameWithOwner.split("/");
      return { org, name };
    });
    // return [{"org": "sparkpost", "name": "blocklist-backend"},
    // {"org": "sparkpost", "name": "newrelic-vertica"},
    // {"org": "sparkpost", "name": "pipeline-events-module"}]
  }
}

module.exports = GitHubClient;
