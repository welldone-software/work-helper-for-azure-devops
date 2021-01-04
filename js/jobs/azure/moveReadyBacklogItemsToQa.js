const getIdsOfBacklogItemsInProgress = async () => {

    console.log('[azure/moveReadyBacklogItemsToQa] - querying ids of backlog items in progress');

    const wiqlQueryResults = await azureHelper.wiql.queryByWiql(`SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo],[System.State],[System.Tags] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] = 'Product Backlog Item' AND [System.State] = 'In Progress' AND [System.AssignedTo] = @me`);
    
    return wiqlQueryResults.workItems.map(({ id }) => id);

};

const moveReadyBacklogItemsToQa = async () => {
    
    const idsOfBacklogItemsInProgress = await getIdsOfBacklogItemsInProgress();
    
    const idsOfBacklogItemsThatAreReadyForQa = (await Promise.all(
        idsOfBacklogItemsInProgress.map(backlogItemId =>
            azureHelper.workItems.isReadyForQa(backlogItemId, {
                ignoreIfWasInQaBefore: false,
                pipelineId: config.azure.moveReadyBacklogItemsToQa.pipelineId,
            }),
        ),
    )).reduce((res, result, index) => result ? [...res, idsOfBacklogItemsInProgress[index]] : res, []);

    if (!idsOfBacklogItemsThatAreReadyForQa.length) {
        console.log('[azure/moveReadyBacklogItemsToQa] - no backlog items are currently ready for qa');
        return;
    }

    console.log('[azure/moveReadyBacklogItemsToQa] - moving fixed bugs to qa', idsOfBacklogItemsThatAreReadyForQa);

    return Promise.all(
        idsOfBacklogItemsThatAreReadyForQa.map(id => azureHelper.workItems.createOrUpdateWorkItem({
            id,
            body: [
                { path: '/fields/System.State', value: 'Q.A', op: 'add', from: null },
                { path: '/fields/System.Reason', value: 'Moved out of state In Progress', op: 'add', from: null },
                { path: '/fields/Custom.CommentsforQA', value: '.', op: 'add', from: null },
            ],
        })),
    );
};