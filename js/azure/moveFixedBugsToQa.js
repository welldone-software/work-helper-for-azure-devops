
const getIdsOfBugsInProgress = async () => {
    console.log('[azure/moveFixedBugsToQa] - querying ids of bugs in progress');

    const wiqlQueryResults = await azureHelper.wiql.queryByWiql(`SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo],[System.State],[System.Tags] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] = 'Bug' AND [System.State] = 'In Progress' AND [System.AssignedTo] = @me`);
    return wiqlQueryResults.workItems.map(({ id }) => id);
};

const getChildWorkItems = async workItemId => {
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
};

const getLatestSuccessfulPipelineRunDate = async pipelineId => {
    const pipelineRuns = await azureHelper.piplines.fetchPipelineRuns(pipelineId);
    const latestSuccessfulRun = pipelineRuns.find(({ result }) => result === 'succeeded');

    return new Date(latestSuccessfulRun.createdDate);
};

const isBugNewlyFixed = async bugId => {

    const childWorkItems = await getChildWorkItems(bugId);
    const nonTestingWorkItems = childWorkItems.filter(({ fields }) => fields?.['Microsoft.VSTS.Common.Activity'] !== 'Testing');

    console.log('nonTestingWorkItems', nonTestingWorkItems);

    if (nonTestingWorkItems.some(({ fields }) => fields?.['System.State'] !== 'Done')) {
        return false;
    }

    const workItemUpdates = await azureHelper.workItems.fetchWorkItemUpdates(bugId);
    const wasInQaBefore = workItemUpdates.some(update => update?.fields?.['System.State']?.oldValue === 'Q.A');

    if (wasInQaBefore) {
        return false;
    }
    
    const completionDates = workItemUpdates
        .filter(update => update?.fields?.['System.History']?.newValue.startsWith('Completing Pull Request'))
        .map(({ fields }) => new Date(fields['Microsoft.VSTS.Common.StateChangeDate'].newValue));
    
    if (!completionDates.length) {
        return false;
    }

    const latestCompletionDate = completionDates.sort((dt1, dt2) => (dt2 - dt1))[0];
    const latestSuccessfulPipelineRunDate = await getLatestSuccessfulPipelineRunDate(config.azure.moveFixedBugsToQa.pipelineId);

    if (latestCompletionDate > latestSuccessfulPipelineRunDate) {
        return false;
    }

    return true;
};

const moveFixedBugsToQa = async () => {
    const idsOfBugsInProgress = await getIdsOfBugsInProgress();

    const idsOfNewlyFixedBugs = await idsOfBugsInProgress.reduce(
        async (res, bugId) => ((await isBugNewlyFixed(bugId)) ? [...res, bugId] : res),
        [],
    );

    if (!idsOfNewlyFixedBugs.length) {
        console.log('[azure/moveFixedBugsToQa] - no newly fixed bugs for now');
        return;
    }

    console.log('[azure/moveFixedBugsToQa] - moving fixed bugs to qa', idsOfNewlyFixedBugs);

    return Promise.all(
        idsOfNewlyFixedBugs.map(id => azureHelper.workItems.createOrUpdateWorkItem({
            id,
            body: [
                { path: '/fields/System.State', value: 'Q.A', op: 'add', from: null },
                { path: '/fields/System.Reason', value: 'Moved out of state In Progress', op: 'add', from: null },
                { path: '/fields/Custom.CommentsforQA', value: '.', op: 'add', from: null },
            ],
        })),
    );
};