const GithubClient = require("./github");
const _ = require("lodash");
const Promise = require("bluebird");

const token = process.env.GITHUB_TOKEN;
const searchQuery = process.env.GITHUB_QUERY;

const githubClient = new GithubClient(token);

async function doTheThing() {

  const repos = await githubClient.getRepos(searchQuery);

  await Promise.map(repos, async ({ name, org, language, archived }) => {
    const repoName = `${org}/${name}`;
    const link = `https://github.com/${org}/${name}`;
    const hasAlertsEnabled = await githubClient.hasAlertsEnabled(org, name);
    let hasCritical = '';
    if (hasAlertsEnabled) {
      const alerts = await githubClient.getVulnerabilities(org, name);
      const criticalAlerts = _.filter(alerts, {
        severity: "critical",
        dismissed: false,
      });
      hasCritical = criticalAlerts.length > 0 ? 'Yes' : 'No';
    }
    console.log(`${repoName},${link},${language},${hasAlertsEnabled ? 'Yes' : 'No'},${archived ? 'Yes' : 'No'},${hasCritical}`);
  });
}

return doTheThing().catch((err) => {
  console.log(`It failed :( - ${err.message})`);
  process.exit(-1);
});
