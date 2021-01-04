const alarmNames = {

    azure: {
        moveReadyBacklogItemsToQa: 'azure.moveReadyBacklogItemsToQa',
        moveFixedBugsToQa: 'azure.moveFixedBugsToQa',
        rerunFailedPrBuilds: {
            rerunFailedPrBuilds: 'azure.rerunFailedPrBuilds.rerunFailedPrBuilds',
            emptyEvaluationIdsToIgnore: 'azure.rerunFailedPrBuilds.emptyEvaluationIdsToIgnore',
        },
    },

    tmetric: {
        logHours: {
            logTodaysHours: 'tmetric.logHours.logTodaysHours',
            logYesterdaysHours: 'tmetric.logHours.logYesterdaysHours',
        },
    },

};

const alarmNameToCallback = {

    [alarmNames.azure.moveReadyBacklogItemsToQa]: moveReadyBacklogItemsToQa,

    [alarmNames.azure.moveFixedBugsToQa]: moveFixedBugsToQa,

    [alarmNames.azure.rerunFailedPrBuilds.rerunFailedPrBuilds]: rerunFailedPrBuilds,

    [alarmNames.azure.rerunFailedPrBuilds.emptyEvaluationIdsToIgnore]: emptyEvaluationIdsToIgnore,

    [alarmNames.tmetric.logHours.logTodaysHours]: logTodaysHours,

    [alarmNames.tmetric.logHours.logYesterdaysHours]: logYesterdaysHours,

};

const createAlarms = () => {
    
    chrome.alarms.create(alarmNames.azure.moveReadyBacklogItemsToQa, {
        when: Date.now(),
        periodInMinutes: config.azure.moveReadyBacklogItemsToQa.periodInMinutes,
    });

    chrome.alarms.create(alarmNames.azure.moveFixedBugsToQa, {
        when: Date.now(),
        periodInMinutes: config.azure.moveFixedBugsToQa.periodInMinutes,
    });

    chrome.alarms.create(alarmNames.azure.rerunFailedPrBuilds.rerunFailedPrBuilds, {
        when: Date.now(),
        periodInMinutes: config.azure.rerunFailedPrBuilds.periodInMinutes,
    });

    chrome.alarms.create(alarmNames.azure.rerunFailedPrBuilds.emptyEvaluationIdsToIgnore, {
        when: Date.now(),
        periodInMinutes: 15,
    });

    chrome.alarms.create(alarmNames.tmetric.logHours.logYesterdaysHours, {
        when: Date.now(),
    });
    
    chrome.alarms.create(alarmNames.tmetric.logHours.logTodaysHours, {
        when: (Date.now() + 750),
    });

    chrome.alarms.create(alarmNames.tmetric.logHours.logTodaysHours, (() => {
        const alarmTime = getAlarmTime();
        return {
            when: new Date(new Date().setHours(alarmTime.hours, alarmTime.minutes, alarmTime.seconds)).getTime(),
            periodInMinutes: 60 * 24,
        };
    })());

};

const addAlarmsListener = () => {

    chrome.alarms.onAlarm.addListener(async ({ name: alarmName }) => {

        if (!(alarmName in alarmNameToCallback)) { return; }

        const alarmNameParts = alarmName.split('.');
        const {startTime, endTime} = config[alarmNameParts[0]]?.[alarmNameParts[1]] || {};

        if (startTime && endTime) {
            if (!isCurrentlyWithinTimeRange({startTime, endTime})) { return; }
        }

        await alarmNameToCallback[alarmName]();

    });

};

addAlarmsListener();
createAlarms();