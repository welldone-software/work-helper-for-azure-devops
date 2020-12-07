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
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/pipelines/${pipelineId}/runs?api-version=${apiVersion}-preview.1`, fetchOptions);
            return JSON.parse(await response.text()).value;
        },

    },

    policy: {

        fetchEvaluations: async artifactId => {
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/policy/evaluations?artifactId=${artifactId}&api-version=${apiVersion}-preview.1`, fetchOptions);
            return JSON.parse(await response.text()).value;
        },

        requeBuildPolicyEvaluation: async evaluationId => {
            return fetch(`${organizationUrl}/${projectId}/_apis/policy/evaluations/${evaluationId}?api-version=${apiVersion}-preview.1`, {
                ...fetchOptions,
                method: 'PATCH',
            });
        },

    },

    pullRequests: {

        fetchPullRequests: async () => {    
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/git/repositories/${repositoryId}/pullrequests?searchCriteria.status=all&searchCriteria.creatorId=${creatorId}&api-version=${apiVersion}`, fetchOptions);
            return JSON.parse(await response.text()).value;
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

        getWorkItemIdByUrl: url => {
            const workItemUrlMatch = url.match(/^https:\/\/(([^\.]+\.visualstudio)|(dev\.azure))\.com\/.*((\/_workitems\/edit\/)|(\?workitem=)|(\/workItems\/))(?<workItemId>\d+)(\/|\?.*)?$/i);
            return workItemUrlMatch?.groups.workItemId;
        },
        
        createOrUpdateWorkItem: async options => {

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
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/workitems/${workItemId}?api-version=${apiVersion}`, fetchOptions);
            return JSON.parse(await response.text());
        },

        fetchWorkItemUpdates: async workItemId => {
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/workitems/${workItemId}/updates?api-version=${apiVersion}`, fetchOptions);
            return JSON.parse(await response.text()).value;
        },

        fetchWorkItemRelations: async workItemId => {
            const response = await fetch(`${organizationUrl}/${projectId}/_apis/wit/workitems/${workItemId}/?$expand=relations&api-version=${apiVersion}`, fetchOptions);
            return JSON.parse(await response.text());
        },

    },
      
};
