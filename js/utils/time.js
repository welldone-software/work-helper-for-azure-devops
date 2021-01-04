const getTotalSecondsFromShortTimeString = timeString => {
    const timeParts = timeString.split(':');
    return ((Number(timeParts[0]) * 3600) + (Number(timeParts[1]) * 60) + Number(timeParts[0]));
};

const isCurrentlyWithinTimeRange = ({startTime, endTime}) => {

    const startTimeTotalSeconds = getTotalSecondsFromShortTimeString(startTime);
    const endTimeTotalSeconds = getTotalSecondsFromShortTimeString(endTime);
    const currentTimeTotalSeconds = getTotalSecondsFromShortTimeString(new Date().toTimeString().split(' ')[0]);

    return (
        currentTimeTotalSeconds >= startTimeTotalSeconds &&
        currentTimeTotalSeconds <= endTimeTotalSeconds
    );

};