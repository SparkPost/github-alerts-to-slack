const GithubClient = require('./github');
const SlackClient = require('./slack');
const _ = require('lodash');
const Promise = require('bluebird');

const token = process.env.GITHUB_TOKEN;
const webhook = process.env.SLACK_WEBHOOK;
let repos;

try {
    repos = JSON.parse(process.env.REPOS);
} catch (err) {
    console.log(`Invalid REPOS variable - must be valid JSON: ${repos}`);
}

const githubClient = new GithubClient(token);
const slackClient = new SlackClient(webhook);

async function doTheThing() {
    let blocks = [{
        type: "section",
        text: {
            type: "mrkdwn",
            text: "The following repositories have open vulnerability alerts and need your attention."
        }
    }];

    await Promise.map(repos, async ({ org, repo }) => {
        const alerts = await githubClient.getVulnerabilities(org, repo);
        const criticalAlerts = _.filter(alerts, { severity: 'critical' });
        const highAlerts = _.filter(alerts, { severity: 'high' });
        if (criticalAlerts.length > 0 || highAlerts.length > 0) {
            blocks.push({ type: 'divider' });
            blocks = blocks.concat(formatAlertsForSlack({ org, repo, criticalAlerts, highAlerts }));
        }
    });
    if (process.env.POST_TO_SLACK === 'true') {
        slackClient.postMessage({ blocks });
    } else {
        console.log(`Slack blocks: ${JSON.stringify(blocks,null,2)}`)
    }
}

function formatAlertsForSlack({ org, repo, criticalAlerts, highAlerts }) {
    const alertsSummary = [];
    if (criticalAlerts.length > 0) {
        alertsSummary.push(`${criticalAlerts.length} critical`);
    }
    if (highAlerts.length > 0) {
        alertsSummary.push(`${highAlerts.length} high`);
    }

    const blocks = [{
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*<https://github.com/${org}/${repo}|${org}/${repo}>*\n${alertsSummary.join(', ')}\n<https://github.com/${org}/${repo}/network/alerts|View all>`
        },
        accessory: {
            type: 'image',
            image_url: 'https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg',
            alt_text: 'cute cat'
        }
    }];
    criticalAlerts.forEach((criticalAlert) => {
        blocks.push(formatAlertForSlack(criticalAlert));
    });
    highAlerts.forEach((highAlert) => {
        blocks.push(formatAlertForSlack(highAlert));
    });

    return blocks;
}

function formatAlertForSlack({ id, package_name, severity, created_at }) {
    return {
        type: 'section',
        block_id: `section-${id}`,
        fields: [
            {
                type: 'mrkdwn',
                text: `*Package (Severity Level)*\n${package_name} (${severity})`
            },
            {
                type: 'mrkdwn',
                text: `*Created on*\n${created_at}`
            }
        ]
    }
}

return doTheThing();