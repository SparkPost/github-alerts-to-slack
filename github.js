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

    _getQuery(owner, repo, limit=20) {
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

    async getVulnerabilities(owner, repo) {
        const query = this._getQuery(owner, repo);
        const results = await this.graphQLClient.request(query);
        const alerts = _.map(results.repository.vulnerabilityAlerts.edges, 'node');
        return _.map(alerts, (alert) => {
            return {
                id: alert.id,
                created_at: alert.createdAt,
                severity: _.lowerCase(alert.securityVulnerability.severity),
                description: alert.securityAdvisory.description,
                package_name: alert.securityVulnerability.package.name
            }
        });
    }
}

module.exports = GitHubClient;
