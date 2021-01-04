const {
    apiVersion,
    organizationUrl,
    projectId,
    repositoryId,
    creatorId,
    personalAccessToken,
} = config.azure;

const fetchOptions = {
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`:${personalAccessToken}`)}`,
    },
};

const azureHelper = {

    piplines: {

        fetchPipelineRuns: async pipelineId => {

            if (!pipelineId) { return; }
            
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/pipelines/${pipelineId}/runs?api-version=${apiVersion}-preview.1`, fetchOptions);
            
            return JSON.parse(await response.text()).value;

        },

        getLatestSuccessfulRun: async pipelineId => {

            if (!pipelineId) { return; }

            const pipelineRuns = await azureHelper.piplines.fetchPipelineRuns(pipelineId);
            
            return pipelineRuns.find(({ result }) => result === 'succeeded');

        },

    },

    policy: {

        fetchEvaluations: async artifactId => {

            if (!artifactId) { return; }

            const response = await fetch(`${organizationUrl}/${projectId}/_apis/policy/evaluations?artifactId=${artifactId}&api-version=${apiVersion}-preview.1`, fetchOptions);
            
            return JSON.parse(await response.text()).value;

        },

        requeBuildPolicyEvaluation: async evaluationId => {

            if (!evaluationId) { return; }

            return fetch(`${organizationUrl}/${projectId}/_apis/policy/evaluations/${evaluationId}?api-version=${apiVersion}-preview.1`, {
                ...fetchOptions,
                method: 'PATCH',
            });

        },

    },

    pullRequests: {

        fetchPullRequest: async pullRequestId => {

            if (!pullRequestId) { return; }

            const response = await fetch(`${organizationUrl}/${projectId}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}?api-version=${apiVersion}`, fetchOptions);
            
            return JSON.parse(await response.text());

        },

        fetchPullRequests: async () => {
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/git/repositories/${repositoryId}/pullrequests?searchCriteria.status=all&searchCriteria.creatorId=${creatorId}&api-version=${apiVersion}`, fetchOptions);
            return JSON.parse(await response.text()).value;
        },

        didPullRequestsPassPipelineRun: async (pullRequests, pipelineId) => {

            if (!pullRequests) { return false; }

            if (!pipelineId) { return false; }
            
            const pullRequestsCompletionQueueTimes = pullRequests
                .map(({ completionQueueTime }) => completionQueueTime)
                .filter(Boolean);
            
            if (!pullRequestsCompletionQueueTimes.length) { return false; }
        
            const pullRequestsCompletionDates = pullRequestsCompletionQueueTimes.map(completionQueueTime => new Date(completionQueueTime));

            const latestPullRequestCompletionDate = pullRequestsCompletionDates.sort((dt1, dt2) => (dt2 - dt1))[0];
        
            const latestSuccessfulPipelineRun = await azureHelper.piplines.getLatestSuccessfulRun(pipelineId);
        
            if (!latestSuccessfulPipelineRun) { return false; }
            
            const latestSuccessfulPipelineRunCreationDate = new Date(latestSuccessfulPipelineRun.createdDate);
        
            return (latestSuccessfulPipelineRunCreationDate >= latestPullRequestCompletionDate);

        },
        
    },

    wiql: {

        queryByWiql: async wiql => {

            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/wiql?api-version=${apiVersion}`, {
                ...fetchOptions,
                method: 'POST',
                body: JSON.stringify({
                    query: wiql,
                }),
            });
    
            return JSON.parse(await response.text());

        },

    },

    workItems: {
        
        cache: [],

        createOrUpdateWorkItem: async (options = { body, id, type }) => {

            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/workitems/${options.id || `$${options.type}`}?api-version=${apiVersion}`, {
                ...fetchOptions,
                method: options.id ? 'PATCH' : 'POST',
                headers: {
                    ...fetchOptions.headers,
                    'Content-Type': 'application/json-patch+json',
                },
                body: JSON.stringify(options.body),
            });
    
            return JSON.parse(await response.text());

        },
    
        fetchWorkItem: async workItemId => {
            
            if (!workItemId) { return; }

            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/workitems/${workItemId}?api-version=${apiVersion}`, fetchOptions);
            
            return JSON.parse(await response.text());

        },

        fetchWorkItemUpdates: async workItemId => {

            if (!workItemId) { return; }

            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/workitems/${workItemId}/updates?api-version=${apiVersion}`, fetchOptions);
            
            return JSON.parse(await response.text()).value;

        },

        fetchWorkItemRelations: async workItemId => {

            if (!workItemId) { return; }

            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/workitems/${workItemId}/?$expand=relations&api-version=${apiVersion}`, fetchOptions);
            
            return JSON.parse(await response.text());

        },

        getAssosicatedPullRequests: async workItemId => {

            if (!workItemId) { return; }

            const workItemRelations = await azureHelper.workItems.fetchWorkItemRelations(workItemId);
            
            const associatedPullRequestIds = workItemRelations.relations
                    .filter(({ attributes: { name } }) => name === 'Pull Request')
                    .map(({ url }) => decodeURIComponent(url).replace(/.*\/([^\/]+)$/, '$1'))
                    .flat()
                    .filter((pullRequestId, i, self) => (self.indexOf(pullRequestId) === i));
            
            return Promise.all(associatedPullRequestIds.map(azureHelper.pullRequests.fetchPullRequest));

        },

        getChildWorkItems: async workItemId => {
            
            if (!workItemId) { return; }

            const workItemRelations = await azureHelper.workItems.fetchWorkItemRelations(workItemId);
            
            const urlsOfAllChildWorkItems = workItemRelations.relations
                .filter(({ rel }) => rel === 'System.LinkTypes.Hierarchy-Forward')
                .map(({ url }) => url);
            
            return Promise.all(
                urlsOfAllChildWorkItems.map(url => {
                    const childWorkItemId = azureHelper.workItems.getWorkItemIdByUrl(url);
                    return azureHelper.workItems.fetchWorkItem(childWorkItemId);
                }),
            );

        },

        getWorkItemById: async (workItemId, options = { searchInCache: true }) => {

            if (!workItemId) {
                return;
            }
        
            if (options?.searchInCache && (workItemId in azureHelper.workItems.cache)) {
                return azureHelper.workItems.cache[workItemId];
            }

            const workItem = await azureHelper.workItems.fetchWorkItem(workItemId);

            azureHelper.workItems.cache[workItemId] = workItem;

            return workItem;

        },

        getWorkItemByUrl: (url, options = { searchInCache: true }) => {
            const workItemId = azureHelper.workItems.getWorkItemIdByUrl(url);
            return azureHelper.workItems.getWorkItemById(workItemId, options);
        },
        
        getWorkItemIdByUrl: url => {

            if (!url) { return; }

            const workItemUrlMatch = url.match(/^https:\/\/(([^\.]+\.visualstudio)|(dev\.azure))\.com\/.*((\/_workitems\/edit\/)|(\?workitem=)|(\/workItems\/))(?<workItemId>\d+)(\/|\?.*)?$/i);
            
            return workItemUrlMatch?.groups.workItemId;

        },

        isReadyForQa: async (workItemId, options = { ignoreIfWasInQaBefore: true, pipelineId }) => {

            if (!workItemId) {
                return false;
            }

            if (options?.ignoreIfWasInQaBefore && (await azureHelper.workItems.wasInQaBefore(workItemId))) {
                return false;
            }

            const nonTestingChildWorkItems = (await azureHelper.workItems.getChildWorkItems(workItemId))
                .filter(({ fields }) => fields?.['Microsoft.VSTS.Common.Activity'] !== 'Testing');
                    
            const areAllWorkItemsCompleted = nonTestingChildWorkItems.every(({ fields }) => fields?.['System.State'] === 'Done');

            if (!areAllWorkItemsCompleted) {
                return false;
            }
            
            const allAssociatedPullRequests = (await Promise.all(
                nonTestingChildWorkItems.map(({id: nonTestingChildWorkItemId}) =>
                    azureHelper.workItems.getAssosicatedPullRequests(nonTestingChildWorkItemId)),
            )).flat().filter(Boolean);
        
            const didAllAssociatedPullRequestsPassPipelineRun = await azureHelper.pullRequests.didPullRequestsPassPipelineRun(allAssociatedPullRequests, options?.pipelineId);

            if (!didAllAssociatedPullRequestsPassPipelineRun) {
                return false;
            }
        
            return true;
        },

        wasInQaBefore: async workItemId => {

            if (!workItemId) { return; }

            const workItemUpdates = await azureHelper.workItems.fetchWorkItemUpdates(workItemId);
            
            return workItemUpdates.some(update => update?.fields?.['System.State']?.oldValue === 'Q.A');

        },

    },
      
};
