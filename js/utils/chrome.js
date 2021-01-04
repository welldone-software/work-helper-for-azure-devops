const getActiveTab = () => {
    return new Promise(resolve =>
        chrome.tabs.query(
            { active: true, lastFocusedWindow: true },
            ([activeTab]) => resolve(activeTab),
        ),
    );
};

const addContextMenuItem = contextMenuItem => {

    if (contextMenuItem.isActive) { return; }

    delete contextMenuItem.isActive;
    chrome.contextMenus.create(contextMenuItem);
    contextMenuItem.isActive = true;

};

const removeContextMenuItem = contextMenuItem => {

    if (!contextMenuItem.isActive) { return; }

    chrome.contextMenus.remove(contextMenuItem.id);
    contextMenuItem.isActive = false;

};

const addContextMenuTabChangesListener = listener => {
    
    chrome.tabs.onActiveChanged.addListener(listener);


    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

        if (!tab.active) { return; }       

        if (!changeInfo.url) { return; }

        return listener(tabId, changeInfo, tab);

    });

};