const getIdsOfBugsInProgress = async () => {

    console.log('[azure/moveFixedBugsToQa] - querying ids of bugs in progress');

    const wiqlQueryResults = await azureHelper.wiql.queryByWiql(`SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo],[System.State],[System.Tags] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] = 'Bug' AND [System.State] = 'In Progress' AND [System.AssignedTo] = @me`);
    
    return wiqlQueryResults.workItems.map(({ id }) => id);

};

const moveFixedBugsToQa = async () => {
    
    const idsOfBugsInProgress = await getIdsOfBugsInProgress();
    
    const idsOfBugsThatAreReadyForQa = (await Promise.all(
        idsOfBugsInProgress.map(bugId =>
            azureHelper.workItems.isReadyForQa(bugId, {
                ignoreIfWasInQaBefore: true,
                pipelineId: config.azure.moveFixedBugsToQa.pipelineId,
            }),
        ),
    )).reduce((res, result, index) => result ? [...res, idsOfBugsInProgress[index]] : res, []);
    
    if (!idsOfBugsThatAreReadyForQa.length) {
        console.log('[azure/moveFixedBugsToQa] - no newly fixed bugs for now');
        return;
    }

    console.log('[azure/moveFixedBugsToQa] - moving fixed bugs to qa', idsOfBugsThatAreReadyForQa);

    return Promise.all(
        idsOfBugsThatAreReadyForQa.map(id =>
            azureHelper.workItems.createOrUpdateWorkItem({
                id,
                body: [
                    { path: '/fields/System.State', value: 'Q.A', op: 'add', from: null },
                    { path: '/fields/System.Reason', value: 'Moved out of state In Progress', op: 'add', from: null },
                    { path: '/fields/Custom.CommentsforQA', value: '.', op: 'add', from: null },
                ],
            }),
        ),
    );
};