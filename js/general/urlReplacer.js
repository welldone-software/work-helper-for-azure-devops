const urlRegexPatternToReplaceValue = {
    ['^(?<organizationUrl>(https:\/\/.*\.visualstudio\.com|https:\/\/dev\.azure\.com\/[^\/]+))\/(?<projectId>[^\/]+)\/_sprints\/.*\?workitem=(?<workitem>[0-9]+)$']: '$<organizationUrl>/$<projectId>/_workitems/edit/$<workitem>/',
};

chrome.tabs.onUpdated.addListener((tabId, _changeInfo, {url: tabUrl}) => {
    const matchingUrlRegexPattern =
        Object.keys(urlRegexPatternToReplaceValue)
        .find(pattern => new RegExp(pattern).test(tabUrl));

    if (!matchingUrlRegexPattern) {
        return;
    }
        
    chrome.tabs.update(tabId, {
        url: tabUrl.replace(
            new RegExp(matchingUrlRegexPattern),
            urlRegexPatternToReplaceValue[matchingUrlRegexPattern],
        ),
    });
});
