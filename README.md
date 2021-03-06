# Github Alerts to Slack

This script is designed to alert on Dependabot and CodeQL vulnerability alerts found in a list of GitHub repositories. Currently, GitHub does not offer vulnerability reporting across an organization. This script is designed to be a quick way to list any open issues in a single spot.

## Prerequisites

You will need the following:

- [GitHub access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line)
- [Slack incoming webhook](https://api.slack.com/messaging/webhooks)
- a list of GitHub repos with [security alerts enabled](https://help.github.com/en/github/managing-security-vulnerabilities/about-security-alerts-for-vulnerable-dependencies)
- Node 10.x or better

## How to run

First, install your dependencies

```
npm install
```

To test out a dry run:

```
 GITHUB_TOKEN=redacted GITHUB_QUERY="org:SparkPost archived:false" node index.js
```

To run and post to a Slack channel:

```
GITHUB_TOKEN=redacted SLACK_WEBHOOK=redacted POST_TO_SLACK=true GITHUB_QUERY="org:SparkPost archived:false" node index.js
```

## Notes

- This report includes:
  - Dependabot alerts with "critical" or "high" severity
  - CodeQL secret scanning alerts and code alerts with "error" or "warning" severity
  - excludes dismissed alerts
- This report limits to the first 50 repositories found, and first 50 alerts found.
- This app is deployed on Heroku, name `vulnerability-alerter`. Creditionals are located in 1Password.
