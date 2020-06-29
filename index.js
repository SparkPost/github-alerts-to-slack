const GithubClient = require('./github');
const SlackClient = require('./slack');
const _ = require('lodash');
const Promise = require('bluebird');

const token = process.env.GITHUB_TOKEN;
const webhook = process.env.SLACK_WEBHOOK;
const searchQuery = process.env.GITHUB_QUERY;

const githubClient = new GithubClient(token);
const slackClient = new SlackClient(webhook);

async function doTheThing() {
    let blocks = [{
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `:wave: GitHub Security Alerts Report\n\nThe following repositories have open vulnerability alerts and need your attention.`
        }
    }];

    const repos = await githubClient.getRepos(searchQuery);

    await Promise.map(repos, async ({name, org}) => {
        const alerts = await githubClient.getVulnerabilities(org, name);
        const criticalAlerts = _.filter(alerts, { severity: 'critical', dismissed: false });
        const highAlerts = _.filter(alerts, { severity: 'high', dismissed: false });
        if (criticalAlerts.length > 0 || highAlerts.length > 0) {
            blocks.push({ type: 'divider' });
            blocks = blocks.concat(formatAlertsForSlack({ org, name, criticalAlerts, highAlerts }));
        }
    });

    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `Query: ${searchQuery}`
            }
        ]
    });

    if (process.env.POST_TO_SLACK === 'true') {
        await slackClient.postMessage({ blocks });
    } else {
        console.log(`Slack blocks: ${JSON.stringify(blocks,null,2)}`)
    }
}

function formatAlertsForSlack({ org, name, criticalAlerts, highAlerts }) {
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
            text: `*<https://github.com/${org}/${name}|${org}/${name}>*\n${alertsSummary.join(', ')}\n<https://github.com/${org}/${name}/network/alerts|View all>`
        },
        accessory: {
            type: 'image',
            image_url: 'https://user-images.githubusercontent.com/10406825/85333522-ba846b80-b4a7-11ea-9774-46fa8ca693a4.png',
            alt_text: 'github'
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

return doTheThing()
    .catch((err) => {
        console.log(`It failed :( - ${err.message})`);
        process.exit(-1);
    });