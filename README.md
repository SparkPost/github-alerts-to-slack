# Github Alerts to Slack

This script is designed to alert on critical and high vulnerabilities found in a list of GitHub repositories. Currently, GitHub does not offer vulnerability reporting across an organization. This script is designed to be a quick way to list any open issues in a single spot.

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
 GITHUB_TOKEN=redacted REPOS='[{"org":"SparkPost","repo":"node-sparkpost"}]' node index.js
```

To run and post to a Slack channel:

```
GITHUB_TOKEN=redacted SLACK_WEBHOOK=redacted POST_TO_SLACK=true REPOS='[{"org":"SparkPost","repo":"node-sparkpost"}]' node index.js
```