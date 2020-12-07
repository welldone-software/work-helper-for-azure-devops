const createBugTaskContextMenuItem = {
    id: 'createBugTask',
    title: 'Create Bug Task',
    contexts: ['all'],
    isActive: false,
};

const workItems = {};

const createWorkItem = options => {
    console.log('[azure/createBugTask] - creating new work item');

    return azureHelper.workItems.createOrUpdateWorkItem(options);
};

const updateWorkItem = options => {
    console.log('[azure/createBugTask] - updating existing work item');
    
    return azureHelper.workItems.createOrUpdateWorkItem(options);
};

const getWorkItem = (workItemId, options = { useCache: true }) => {

    if (!workItemId) {
        return;
    }

    return new Promise(async (resolve, reject) => {
        if (options?.useCache && (workItemId in workItems)) {
            resolve(workItems[workItemId]);
            return;
        }

        const workItem = await azureHelper.workItems.fetchWorkItem(workItemId);

        if (!workItem) {
            reject('[azure/createBugTask] - getWorkItemBy - fetchWorkItem failed');
            return;
        }

        workItems[workItemId] = workItem;
        resolve(workItem);
    });
};

const getWorkItemByUrl = (url, options) => {
    const workItemId = azureHelper.workItems.getWorkItemIdByUrl(url);
    return getWorkItem(workItemId, options);
};

const getActiveTab = async () => {
    return new Promise(resolve =>
        chrome.tabs.query(
            { active: true, lastFocusedWindow: true },
            ([activeTab]) => resolve(activeTab),
        ),
    );
};

const addContextMenuItem = () => {
    if (createBugTaskContextMenuItem.isActive) {
        return;
    }

    console.log('[azure/createBugTask] - adding menu item');

    delete createBugTaskContextMenuItem.isActive;
    chrome.contextMenus.create(createBugTaskContextMenuItem);
    createBugTaskContextMenuItem.isActive = true;
};

const removeContextMenuItem = () => {
    if (!createBugTaskContextMenuItem.isActive) {
        return;
    }

    console.log('[azure/createBugTask] - removing menu item');

    chrome.contextMenus.remove(createBugTaskContextMenuItem.id);
    createBugTaskContextMenuItem.isActive = false;
};

const addOrRemoveContextMenuItem = async () => {
    const { url: activeTabUrl } = await getActiveTab();
    const workItem = await getWorkItemByUrl(activeTabUrl);
    
    if (!workItem) {
        removeContextMenuItem();
        return;
    }

    if (workItem?.fields['System.WorkItemType'] !== 'Bug') {
        return;
    }

    addContextMenuItem();
};

const addTabListenersForContextMenu = () => {
    console.log('[azure/createBugTask] - adding tab listeners');
    
    chrome.tabs.onActiveChanged.addListener(async tabId => {
        await addOrRemoveContextMenuItem();
    });


    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (!tab.active) { return; }       

        if (!changeInfo.url) { return; }

        await addOrRemoveContextMenuItem();
    });
};

const addOnContextMenuClickedListner = () => {
    console.log('[azure/createBugTask] - adding context menu click listner');

    chrome.contextMenus.onClicked.addListener(async ({ menuItemId, pageUrl: bugPageUrl }) => {

        if (menuItemId !== createBugTaskContextMenuItem.id) { return; }

        const bugWorkItem = await getWorkItemByUrl(bugPageUrl, { useCache: false });

        if (!bugWorkItem) { return; }

        const newWorkItem = await createWorkItem({
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

        await updateWorkItem({
            id: newWorkItem.id,
            body: [
                { path: '/fields/System.State', value: 'In Review', op: 'add', from: null },
                { path: '/fields/System.Reason', value: 'Moved to state In Review', op: 'add', from: null },
                { path: '/relations/-', value: { rel: 'System.LinkTypes.Hierarchy-Reverse', url: bugWorkItem.url }, op: 'add', from: null },
            ],
        });

        await updateWorkItem({
            id: bugWorkItem.id,
            body: [
                { path: '/fields/System.State', value: 'In Progress', op: 'add', from: null },
            ],
        });

        alert('Task created!');
    });
};

addOnContextMenuClickedListner();
addTabListenersForContextMenu();
