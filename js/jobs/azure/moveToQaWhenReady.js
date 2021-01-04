const moveToQaWhenReadyContextMenuItem = {
    id: 'moveToQaWhenReady',
    title: 'Move to Q.A When Ready',
    contexts: ['all'],
    isActive: false,
};

const addOrRemoveMoveToQaWhenReadyContextMenuItem = async () => {

    const { url: activeTabUrl } = await getActiveTab();
    const workItem = await azureHelper.workItems.getWorkItemByUrl(activeTabUrl);
    
    if (!workItem || (workItem.fields?.['System.WorkItemType'] !== 'Product Backlog Item')) {
        
        console.log('[azure/moveToQaWhenReady] - removing menu item');
        
        removeContextMenuItem(moveToQaWhenReadyContextMenuItem);
        
        return;

    }

    console.log('[azure/moveToQaWhenReady] - adding menu item');

    addContextMenuItem(moveToQaWhenReadyContextMenuItem);

};

const addOnMoveToQaWhenReadyClickedListner = () => {
    
    console.log('[azure/moveToQaWhenReady] - adding context menu click listner');

    chrome.contextMenus.onClicked.addListener(async ({ menuItemId, pageUrl: backlogItemPageUrl }) => {

        if (menuItemId !== moveToQaWhenReadyContextMenuItem.id) { return; }

        const backlogItemId = azureHelper.workItems.getWorkItemIdByUrl(backlogItemPageUrl);
        
        // await azureHelper.workItems.createOrUpdateWorkItem({
        //     id: backlogItemId,
        //     body: [
        //         { path: '/fields/System.State', value: 'Q.A', op: 'add', from: null },
        //         { path: '/fields/System.Reason', value: 'Moved out of state In Progress', op: 'add', from: null },
        //         { path: '/fields/Custom.CommentsforQA', value: '.', op: 'add', from: null },
        //     ],
        // })

        alert(`Backlog item #${backlogItemId} will be moved to QA when it is ready`);
    });
};

addOnMoveToQaWhenReadyClickedListner();
addContextMenuTabChangesListener(addOrRemoveMoveToQaWhenReadyContextMenuItem);
