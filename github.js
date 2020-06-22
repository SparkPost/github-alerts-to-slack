const { GraphQLClient } = require('graphql-request');
const _ = require('lodash');

class GitHubClient {
    constructor (token) {
        this.graphQLClient = new GraphQLClient('https://api.github.com/graphql', {
            headers: {
            authorization: `bearer ${token}`
            },
        });
    }

    _getReposForOwnerAndTopicQuery(owner, topic) {
      return `query { 
        search(
          query: "org:${owner} topic:${topic} archived:false",
          type: REPOSITORY, last: 50
        ) {
          repositoryCount
          edges {
            node {
              ... on Repository {
                name
              }
            }
          }
        }
      }`;
    }

    _getVulnerabilityAlertQuery(owner, repo, limit=40) {
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
    }

    async getRepos(owner, topic) {
      const query = this._getReposForOwnerAndTopicQuery(owner, topic);
      const results = await this.graphQLClient.request(query);
      const repos = _.map(results.search.edges, 'node');
      return _.map(repos, (repo) => {
          return {
              name: repo.name
          }
      });
    }

    async getVulnerabilities(owner, repo) {
        const query = this._getVulnerabilityAlertQuery(owner, repo);
        const results = await this.graphQLClient.request(query);
        const alerts = _.map(results.repository.vulnerabilityAlerts.edges, 'node');
        return _.map(alerts, (alert) => {
            return {
                id: alert.id,
                created_at: alert.createdAt,
                severity: _.lowerCase(alert.securityVulnerability.severity),
                description: alert.securityAdvisory.description,
                package_name: alert.securityVulnerability.package.name,
                dismissed: !!alert.dismissReason
            }
        });
    }
}

module.exports = GitHubClient;
