const createBugTaskContextMenuItem = {
    id: 'createBugTask',
    title: 'Create Bug Task',
    contexts: ['all'],
    isActive: false,
};

const addOrRemoveCreateBugTaskContextMenuItem = async () => {

    const { url: activeTabUrl } = await getActiveTab();
    const workItem = await azureHelper.workItems.getWorkItemByUrl(activeTabUrl);
    
    if (!workItem || (workItem.fields?.['System.WorkItemType'] !== 'Bug')) {

        console.log('[azure/createBugTask] - removing menu item');
        
        removeContextMenuItem(createBugTaskContextMenuItem);
        
        return;

    }

    console.log('[azure/createBugTask] - adding menu item');

    addContextMenuItem(createBugTaskContextMenuItem);

};

const addOnCreateBugTaskClickedListner = () => {
    
    console.log('[azure/createBugTask] - adding context menu click listner');

    chrome.contextMenus.onClicked.addListener(async ({ menuItemId, pageUrl: bugPageUrl }) => {

        if (menuItemId !== createBugTaskContextMenuItem.id) { return; }

        const bugWorkItem = await azureHelper.workItems.getWorkItemByUrl(bugPageUrl, { searchInCache: false });

        if (!bugWorkItem) { return; }

        console.log('[azure/createBugTask] - creating new work item');

        const newWorkItem = await azureHelper.workItems.createOrUpdateWorkItem({
            type: 'Task',
            body: [
                { path: '/fields/System.WorkItemType', value: 'Task', op: 'add', from: null },
                { path: '/fields/System.Title', value: bugWorkItem.fields['System.Title'], op: 'add', from: null },
                { path: '/fields/System.AssignedTo', value: bugWorkItem.fields['System.AssignedTo'], op: 'add', from: null },
                { path: '/fields/System.Description', value: bugWorkItem.fields['System.Description'], op: 'add', from: null },
                { path: '/fields/System.AreaPath', value: bugWorkItem.fields['System.AreaPath'], op: 'add', from: null },
                { path: '/fields/System.TeamProject', value: bugWorkItem.fields['System.TeamProject'], op: 'add', from: null },
                { path: '/fields/System.IterationPath', value: bugWorkItem.fields['System.IterationPath'], op: 'add', from: null },
                { path: '/fields/Microsoft.VSTS.Common.Activity', value: 'Development Front', op: 'add', from: null },
                { path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: 1, op: 'add', from: null },
            ],
        });

        console.log('[azure/createBugTask] - updating existing work item', newWorkItem.id);

        await azureHelper.workItems.createOrUpdateWorkItem({
            id: newWorkItem.id,
            body: [
                { path: '/fields/System.State', value: 'In Review', op: 'add', from: null },
                { path: '/fields/System.Reason', value: 'Moved to state In Review', op: 'add', from: null },
                { path: '/relations/-', value: { rel: 'System.LinkTypes.Hierarchy-Reverse', url: bugWorkItem.url }, op: 'add', from: null },
            ],
        });

        await azureHelper.workItems.createOrUpdateWorkItem({
            id: bugWorkItem.id,
            body: [
                { path: '/fields/System.State', value: 'In Progress', op: 'add', from: null },
            ],
        });

        alert('Task created!');
    });
};

addOnCreateBugTaskClickedListner();
addContextMenuTabChangesListener(addOrRemoveCreateBugTaskContextMenuItem);
