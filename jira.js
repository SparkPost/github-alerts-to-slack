const config = require("./config");
const fetch = require("node-fetch");

async function getUser() {
  fetch(`https://${owner}.atlassian.net/rest/api/3/issue`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(
        "jasmine.pate@sparkpost.com:SQGGzbH9CM4Cq2ABQ9EvBBD1"
      ).toString("base64")}`,
      Accept: "application/json",
    },
  })
    .then((response) => {
      console.log(`Response: ${response.status} ${response.statusText}`);
      return response.text();
    })
    .then((text) => console.log(text))
    .catch((err) => console.error(err));
}

async function getIssue() {
  const fetch = require("node-fetch");

  fetch(`https://${owner}.atlassian.net/rest/api/3/issue`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(
        "jasmine.pate@sparkpost.com:SQGGzbH9CM4Cq2ABQ9EvBBD1"
      ).toString("base64")}`,
      Accept: "application/json",
    },
  })
    .then((response) => {
      console.log(`Response: ${response.status} ${response.statusText}`);
      return response.text();
    })
    .then((text) => console.log(text))
    .catch((err) => console.error(err));
}

async function assignIssue() {
  const fetch = require("node-fetch");

  const bodyData = `{
  "accountId": "5b10ac8d82e05b22cc7d4ef5"
}`;

  fetch(`https://${owner}.atlassian.net/rest/api/3/issue`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${Buffer.from(
        "jasmine.pate@sparkpost.com:SQGGzbH9CM4Cq2ABQ9EvBBD1"
      ).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: bodyData,
  })
    .then((response) => {
      console.log(`Response: ${response.status} ${response.statusText}`);
      return response.text();
    })
    .then((text) => console.log(text))
    .catch((err) => console.error(err));
}

async function createIssue() {
  const fetch = require("node-fetch");

  const bodyData = `{
      "update": {},
      "fields": {
        "summary": "Resolve dependabot issues",
        "issuetype": {
          "id": "10000"
        },
        "components": [
          {
            "id": "10000"
          }
        ],
        "customfield_20000": "06/Jul/19 3:25 PM",
        "customfield_40000": {
          "type": "doc",
          "version": 1,
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "text": "Occurs on all orders",
                  "type": "text"
                }
              ]
            }
          ]
        },
        "customfield_70000": [
          "jira-administrators",
          "jira-software-users"
        ],
        "project": {
          "id": "10000"
        },
        "description": {
          "type": "doc",
          "version": 1,
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "text": "Order entry fails when selecting supplier.",
                  "type": "text"
                }
              ]
            }
          ]
        },
        "reporter": {
          "id": "5b10a2844c20165700ede21g"
        },
        "fixVersions": [
          {
            "id": "10001"
          }
        ],
        "customfield_10000": "09/Jun/19",
        "priority": {
          "id": "20000"
        },
        "labels": [
          "bugfix",
          "blitz_test"
        ],
        "timetracking": {
          "remainingEstimate": "5",
          "originalEstimate": "10"
        },
        "customfield_30000": [
          "10000",
          "10002"
        ],
        "customfield_80000": {
          "value": "red"
        },
        "security": {
          "id": "10000"
        },
        "environment": {
          "type": "doc",
          "version": 1,
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "text": "UAT",
                  "type": "text"
                }
              ]
            }
          ]
        },
        "versions": [
          {
            "id": "10000"
          }
        ],
        "duedate": "2019-05-11",
        "customfield_60000": "jira-software-users",
        "customfield_50000": {
          "type": "doc",
          "version": 1,
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "text": "Could impact day-to-day work.",
                  "type": "text"
                }
              ]
            }
          ]
        },
        "assignee": {
          "id": "5b109f2e9729b51b54dc274d"
        }
      }
    }`;

  fetch(`https://${owner}.atlassian.net/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        "jasmine.pate@sparkpost.com:SQGGzbH9CM4Cq2ABQ9EvBBD1"
      ).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: bodyData,
  })
    .then((response) => {
      console.log(`Response: ${response.status} ${response.statusText}`);
      return response.text();
    })
    .then((text) => console.log(text))
    .catch((err) => console.error(err));
}
