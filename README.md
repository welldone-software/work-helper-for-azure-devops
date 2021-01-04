# Welldone Work Helper for Azure DevOps [2.0]

A Chrome extension with all sorts of features to help with day-to-day work on Azure DevOps.

Interfaces with Azure DevOps REST API and with TMetric REST API.

# Features:

##### 1. Automatic TMetric Logger

- Retrieves your PRs list from Azure DevOps
- Interfaces with TMetric and checks if you forgot to fill in hours
- Offers to fill in hours for you in case you forgot, by your approval
- Can remind you to fill in hours (if not filled) after a certain time of day (for example after 21:00)
- Maintains a local database to remember your choices

![preview](https://raw.githubusercontent.com/welldone-software/work-helper-for-chrome/master/images/tmetricLogger.gif)

##### 2. Create Bug Tasks

- Adds a context menu item 'Create Bug Task' to any bug page
- Creates a child work item task
- Moves the new task to state 'In Review'
- Moves the bug to state 'In Progress'

![preview](https://raw.githubusercontent.com/welldone-software/work-helper-for-chrome/master/images/createBugTask.gif)

##### 3. Move Fixed Bugs to State Q.A

- Searches for bug items in state 'In Progress' but with all work tasks completed
- Moves the bug to state Q.A when a build that includes your tasks succeeds

![preview](https://raw.githubusercontent.com/welldone-software/work-helper-for-chrome/master/images/moveFixedBugsToQa.gif)

##### 4. Rerun Failed Pull Request Builds

- Searches for (your) pull requests with failed builds
- If a new build can be re-queued (f.e when PR merge status is OK and build is just expired), it re-runs the build for you

![preview](https://raw.githubusercontent.com/welldone-software/work-helper-for-chrome/master/images/rerunFailedPrBuilds.gif)

##### 5. Shorten Work Item URLs

- Replaces URLs according to regular expressions of your choice
- Set to shorten annoyingly long work item urls

![preview](https://raw.githubusercontent.com/welldone-software/work-helper-for-chrome/master/images/shortenWorkItemUrls.gif)

# Configuration:

Go to `js/config.js` and follow the instructions.

