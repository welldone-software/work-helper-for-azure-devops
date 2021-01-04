const updateConfig = () => {
  return new Promise(resolve =>
    chrome.storage.sync.set({ 'config': config }, resolve),
  );
};

const logTodaysHours = async () => {
  console.log('[tmetric/logHours] - logTodaysHours - trying to log today\'s hours');
  await logHours();
};

const logYesterdaysHours = async () => {
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
  const yesterdayLocaleDateString = yesterday.toLocaleDateString();

  console.log('[tmetric/logHours] - logYesterdaysHours - trying to log yesterday\'s hours');
  await logHours(yesterdayLocaleDateString);
};

const waitForAllLoggingsToFinish = () => new Promise(resolve => {
  const resolveOnLoggingNotInProgress = () => {
    if (!logHours.inProgress) {
      resolve();
      return;
    }

    setTimeout(resolveOnLoggingNotInProgress, 500);
  };

  resolveOnLoggingNotInProgress();
});

const logHours = (dateToLogLocaleDateString = new Date().toLocaleDateString()) => {
  
  return new Promise(async resolve => {
    
    if (checkShouldIgnoreDate(dateToLogLocaleDateString)) {
      console.log('[tmetric/logHours] - logHours - ignoring date', dateToLogLocaleDateString);
      return;
    }

    if (await checkIsDateAlreadyLogged(dateToLogLocaleDateString)) { // By user / previous run of the extension etc.
      console.log('[tmetric/logHours] - logHours - date already logged', dateToLogLocaleDateString);
      resolve();
      return;
    }

    await waitForAllLoggingsToFinish();
    
    const dateParts = dateToLogLocaleDateString.split('/');
    const month = dateParts[0].padStart(2, '0');
    const day = dateParts[1].padStart(2, '0');
    const year = dateParts[2];

    const todayLocaleDateString = new Date().toLocaleDateString();
    const isDateToLogToday =
      dateToLogLocaleDateString === todayLocaleDateString;

    const { trackerUrl } = config.tmetric.logHours;
    const trackerTabUrl = isDateToLogToday ?
      trackerUrl : `${trackerUrl}/?day=${year}${month}${day}`;

    chrome.tabs.create({ url: trackerTabUrl, selected: true }, ({ id: trackerTabId }) => {

      logHours.inProgress = true;
      let isDateAlreadyLogged = false;
      let scriptExecuted = false;

      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, { url: tabUrl }) => {            
        
        if (tabId !== trackerTabId) {
          console.log('[tmetric/logHours] - logHours - wrong tab id', tabId, trackerTabId);
          return;
        }

        if (tabUrl.replace(/\/$/, '') !== trackerTabUrl) {
          console.log('[tmetric/logHours] - logHours - wrong tab url', tabUrl, trackerTabUrl);
          return;
        }

        if (changeInfo.status !== 'complete') {
          console.log('[tmetric/logHours] - logHours - wrong change info status', changeInfo.status);
          return;
        }
        
        if (scriptExecuted) {
          return;
        }

        console.log('[tmetric/logHours] - logHours - executing script');

        chrome.tabs.executeScript(trackerTabId, {
          code: `dateToLogLocaleDateString = '${dateToLogLocaleDateString}';`,
        }, () => {
            chrome.tabs.executeScript(trackerTabId, { file: 'js/jobs/tmetric/logHours/content_scripts/logHours.js' });
        });

        scriptExecuted = true;
      });

      chrome.runtime.onMessage.addListener(async (message, sender) => {
        
        if (sender.tab.id !== trackerTabId) {
          return;
        }
        
        if (message === 'onCancel') {
          chrome.tabs.remove(trackerTabId);

          console.log('[tmetric/logHours] - logHours - canceled!');
          logHours.inProgress = false;
          resolve();
          return;
        }

        if (message === 'onConfirm') {

          const { datesToIgnore } = config.tmetric.logHours;

          if (datesToIgnore.includes(dateToLogLocaleDateString)) {
            return;
          }

          datesToIgnore.push(dateToLogLocaleDateString);
          await updateConfig();

          console.log('[tmetric/logHours] - logHours - hours logged!');
          logHours.inProgress = false;
          resolve();
          return;
        }
        
      });
    });
  });
};

const getTimeEntriesForDate = async (startTime, endTime) => {
  const {
    apiToken,
    apiRoute,
    accountId,
    userProfileId,
  } = config.tmetric;

  const timeEntries = await fetch(`${apiRoute}/accounts/${accountId}/timeentries/${userProfileId}?timeRange.startTime=${startTime}&timeRange.endTime=${endTime}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );

  return timeEntries.json();
};

const getAlarmTime = () => {
  const { dailyTimeToCheckIfHoursAreFilled } = config.tmetric.logHours;
  const alarmTimeParts = dailyTimeToCheckIfHoursAreFilled.split(':');

  return {
    hours: Number(alarmTimeParts[0]),
    minutes: Number(alarmTimeParts[1]),
    seconds: Number(alarmTimeParts[2]),
  };
};

const checkIsDateAlreadyLogged = async localeDateString => {
  const timeEntriesOfDate = await getTimeEntriesForDate(
    `${localeDateString} 00:00:00`,
    `${localeDateString} 23:59:59`
  );

  return !!timeEntriesOfDate.length;
};

const checkDidAlarmTimePassToday = alarmTime => {
  const today = new Date();
  const totalSecondsToday = ((today.getHours() * 3600) + (today.getMinutes() * 60) + today.getSeconds());
  const totalAlarmTimeSeconds = ((alarmTime.hours * 3600) + (alarmTime.minutes * 60) + alarmTime.seconds);

  return totalSecondsToday > totalAlarmTimeSeconds;
};

const checkShouldIgnoreDate = localeDateString => {
  const { daysToIgnore, datesToIgnore } = config.tmetric.logHours;
  const dateDayName = new Date(localeDateString).toLocaleString('en-us', { weekday: 'long' });
        
  return(daysToIgnore.includes(dateDayName) || datesToIgnore.includes(localeDateString));
};
