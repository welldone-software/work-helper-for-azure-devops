chrome.storage.sync.get(['config'], async ({ config: { azure, tmetric } }) => {
    
    let pullRequestsToLog;
    const minPullRequestsToLog = 3;

    const fetchPullRequests = () => {
        fetch(`${azure.organizationUrl}/${azure.projectId}/_apis/git/repositories/${azure.repositoryId}/pullrequests?searchCriteria.status=all&searchCriteria.creatorId=${azure.creatorId}&api-version=6.0`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${btoa(`:${azure.personalAccessToken}`)}`,
            }
        })
        .then(response => response.text())
        .then(responseText => {
            const myPullReqeusts = JSON.parse(responseText).value;
            
            pullRequestsToLog = myPullReqeusts.reduce((result, pullRequest) => {
                const { creationDate, title, status } = pullRequest;

                if (status !== 'completed' && status !== 'active') {
                    return result;
                }

                const prAlreadyIncluded = result.includes(title);                

                if (prAlreadyIncluded) {
                    return result;
                }

                const creationDateLocaleDateString = new Date(creationDate).toLocaleDateString();
                const createdAtRequestedDate = (creationDateLocaleDateString === dateToLogLocaleDateString);

                if (createdAtRequestedDate) {
                    return [...result, title];
                }

                const createdBeforeRequestedDate = (new Date(creationDate).getTime() < new Date(dateToLogLocaleDateString).getTime());

                if (createdBeforeRequestedDate && result.length < minPullRequestsToLog) {
                    return [...result, title];
                }

                return result;
            }, []);
        });
    };

    const waitForPullRequestsFetch = () => {
        return new Promise(resolve => {
            const checkPullRequests = () => {
                setTimeout(() => {
                    if (pullRequestsToLog) {
                        resolve();
                        return;
                    }

                    checkPullRequests();
                }, 200);
            };

            checkPullRequests();
        });
    };

    const logPullRequests = async () => {
        const fullDescription = pullRequestsToLog.join(', ');

        const dateParts = dateToLogLocaleDateString.split('/');
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        
        const startTime = `${year}-${month}-${day}T${tmetric.logHours.taskStartTime}Z`;
        const endTime = `${year}-${month}-${day}T${tmetric.logHours.taskEndTime}Z`;

        return fetch(`${tmetric.apiRoute}/accounts/${tmetric.accountId}/timeentries/${tmetric.userProfileId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tmetric.apiToken}`,
            },
            body: JSON.stringify({
                details: {
                    description: fullDescription.length > 400 ? `${fullDescription.substring(0, 397)}...` : fullDescription,
                    projectId: tmetric.logHours.projectId,
                },
                startTime,
                endTime,
                projectName: tmetric.logHours.projectName,
                tagsIdentifiers: tmetric.logHours.tagIdentifiers,
                isBillable: tmetric.logHours.isTaskBillable,
                isInvoiced: tmetric.logHours.isTaskInvoiced,
            }),
        });
    };

    const onConfirm = async () => {
        await waitForPullRequestsFetch();
        await logPullRequests();

        chrome.runtime.sendMessage('onConfirm');
        location.reload();
    };

    const onCancel = () => {
        chrome.runtime.sendMessage('onCancel');
    };

    let isDialogOpen = false;
    let documentVisibilityId = Date.now();
    let previousDocumentVisibilityId = documentVisibilityId;

    const showConfirmDialog = async () => {
        console.log('isDialogOpen', isDialogOpen, new Date().toLocaleTimeString());
        
        if (isDialogOpen) {
            return;
        }
        
        isDialogOpen = true;
        
        const todayLocaleDateString = new Date().toLocaleDateString();
        const yesterdayLocaleDateString = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString();
        const isDateToLogToday = dateToLogLocaleDateString === todayLocaleDateString;
        const isDateToLogYesterday = dateToLogLocaleDateString === yesterdayLocaleDateString;
        const dialogLaunchTime = Date.now();

        if (window.confirm(`Do you want to log hours for ${isDateToLogToday ? 'today' : (isDateToLogYesterday ? 'yesterday' : dateToLogLocaleDateString)}?`)) {
            document.removeEventListener('visibilitychange', visibilityChangeListener);
            await onConfirm();
        } else {
            isDialogOpen = false;

            await new Promise(resolve => setTimeout(resolve, 250));

            if (documentVisibilityId !== previousDocumentVisibilityId) {
                console.log('dialog canceled by system', new Date().toLocaleTimeString());

                previousDocumentVisibilityId = documentVisibilityId;
                return;
            }

            console.log('dialog canceled by user', new Date().toLocaleTimeString());

            document.removeEventListener('visibilitychange', visibilityChangeListener);
            onCancel();
        }
    }

    const visibilityChangeListener = async () => {
        documentVisibilityId = Date.now();

        if (document.visibilityState !== 'visible') {
            return;
        }

        await showConfirmDialog();
    };
    document.addEventListener('visibilitychange', visibilityChangeListener);

    fetchPullRequests();
    console.log('showConfirmDialog', new Date().toLocaleTimeString());
    await showConfirmDialog();
});
