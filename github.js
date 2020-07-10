const { GraphQLClient } = require('graphql-request');
const got = require('got');
const _ = require('lodash');

class GitHubClient {
    constructor (token) {
        this.token = token;
        this.graphQLClient = new GraphQLClient('https://api.github.com/graphql', {
            headers: {
            authorization: `bearer ${token}`
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

    _getVulnerabilityAlertQuery(owner, repo, limit=50) {
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

    async getRepos(searchQuery) {
      const query = this._getReposQuery(searchQuery);
      const results = await this.graphQLClient.request(query);
      const repos = _.map(results.search.edges, 'node');
      return _.map(repos, (repo) => {
          const [org, name] = repo.nameWithOwner.split('/');
          return { org, name };
      });
    }
    
    async hasAlertsEnabled(owner, repo) {
      const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
       try {
        await got(`${repoUrl}/vulnerability-alerts`, {
          headers: {
            Accept: 'application/vnd.github.dorian-preview+json',
            'User-Agent': 'node-script',
            Authorization: `token ${this.token}`
          }
        });  
       } catch (err) {
         if (err.response.statusCode === 404) {
           return false;
         } else {
           throw new Error(`Could not retrieve vulnerability alerts - status code ${err.response.statusCode}`);
         }
       }
       return true;
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
