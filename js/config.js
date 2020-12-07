const config = {

    /*   TMetric - Instructions:
    ------------------------------------------------------------------
        Fill in each field below as instructed
    ------------------------------------------------------------------ */

    tmetric: {
        apiToken: '', // Generate your own TMetric REST API Token: https://tmetric.com/help/data-integrations/how-to-use-tmetric-rest-api
        
        /* -------------------------------------------------------------------
            Go to TMetric > Reports > Detailed Report
                - Team: select yourself
                - Project: select your project
                - Tag: select a tag if needed
            Apply filter

            Fill in the fields below according to the newly created URL
        ------------------------------------------------------------------- */
    
        accountId: '', // '.../reports/{tmetricAccountId}'
        userProfileId: '', // '...&user={tmetricUserProfileId}'

        logHours: {
            projectId: 0, // '...&project={tmetricProjectId}'
            tagIdentifiers: [0], // '...&tag={tmetricTagIdentifiers}'
            projectName: '', // The name of the project you selected (as appears in the Project dropdown list)

            dailyTimeToCheckIfHoursAreFilled: '', // 'hh:dd:ss' time string. If after this time the daily hours are not filled, the extension will offer to prefill them for you
            daysToIgnore: ['Friday', 'Saturday'], // Days when missing hours should not be alerted. Accepted values are: 'Sunday', 'Monday', 'Tuesday', 'Wednseday', 'Thursday', 'Friday', 'Saturady'
            taskStartTime: '', // 'hh:mm:ss' time string. Consider GMT + 3 for Israel (for '09:00:00' put '06:00:00')
            taskEndTime: '', // 'hh:mm:ss' time string. Consider GMT + 3 for Israel (for '18:00:00' put '15:00:00')
            isTaskBillable: true, // Whether to autofill tasks as billable or not
            isTaskInvoiced: false, // Whether to autofill tasks as invoiced or not
         },
    },

   /*   Azure - Instructions:
    ------------------------------------------------------------------
        Fill in each field below as instructed
    ------------------------------------------------------------------ */

    azure: {
        apiVersion: '6.0',
        personalAccessToken: '', // Generate your own Azure DevOps Personal Access Token (PAT): https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
        creatorId: '', // Your creator id on Azure DevOps
        organizationUrl: '', // Your organization URL on Azure DevOps
        projectId: '', // Your project id on Azure DevOps
        repositoryId: '', // The repository id in Azure DevOps

        moveFixedBugsToQa: {
            pipelineId: '',
            periodInMinutes: 5, // How often (in minutes) to check for fixed bugs and move them to QA state
        },
        
        rerunFailedPrBuilds: {
            periodInMinutes: 5, // How often (in minutes) to check and re-run failed PR builds
        },
    },
};

// Done!

(async () => {
    config.tmetric.apiRoute = 'https://app.tmetric.com/api';
    config.tmetric.logHours.trackerUrl = `https://app.tmetric.com/#/tracker/${config.tmetric.accountId}`;
    config.tmetric.logHours.datesToIgnore = [];

    await new Promise(resolve => {
        chrome.storage.sync.set({ config }, resolve);
    });
})();

