function isDefined(v) {
    return v !== undefined;
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function attachSessionAndSpeakersTogether(session, speakersRaw) {
    if (isDefined(session.speakers)) {
        for (var speakerIdx = 0; speakerIdx < session.speakers.length; speakerIdx++) {
            if (isDefined(session.speakers[speakerIdx]) && !isDefined(session.speakers[speakerIdx].id)) {
                session.speakers[speakerIdx] = speakersRaw[session.speakers[speakerIdx]];
                var tempSession = clone(session);
                delete tempSession.speakers;
                if (isDefined(session.speakers[speakerIdx])) {
                    if (!isDefined(session.speakers[speakerIdx].sessions)) {
                        session.speakers[speakerIdx].sessions = [];
                    }
                    session.speakers[speakerIdx].sessions.push(tempSession);
                }
            }
        }
    }
}

function getEndTime(date, startTime, endTime, totalNumber, number) {
    var timezone = new Date().toString().match(/([A-Z]+[\+-][0-9]+.*)/)[1],
        timeStart = new Date(date + ' ' + startTime + ' ' + timezone).getTime(),
        timeEnd = new Date(date + ' ' + endTime + ' ' + timezone).getTime(),
        difference = Math.floor((timeEnd - timeStart) / totalNumber),
        result = new Date(timeStart + difference * number);
    return result.getHours() + ':' + result.getMinutes();
}

function hasSpeakersAndSessionsAndSchedule(speakers, sessions, schedule) {
    return hasSpeakersAndSessions(speakers, sessions) && Object.keys(schedule).length;
}

function hasSpeakersAndSessions(speakers, sessions) {
    return Object.keys(speakers).length && Object.keys(sessions).length;
}

function addTagTo(tag, tags) {
    if (tags.indexOf(tag) < 0) {
        tags.push(tag);
    }
}

function generateSchedule(scheduleDB, sessionsDB, speakersDB) {
    let speakers = speakersDB || {};
    let sessions = sessionsDB || {};
    let scheduleDays = scheduleDB || [];
    let schedule = { days: scheduleDays };

    if (hasSpeakersAndSessionsAndSchedule(speakers, sessions, schedule.days)) {
        schedule.tags = [];
        for (var dayIdx = 0, scheduleLen = schedule.days.length; dayIdx < scheduleLen; dayIdx++) {
            var day = schedule.days[dayIdx];
            day.tags = [];
            for (var timeSlotIdx = 0, timeslotsLen = day.timeslots.length; timeSlotIdx < timeslotsLen; timeSlotIdx++) {
                var timeslot = day.timeslots[timeSlotIdx];
                for (var sessionIndex = 0, sessionsLen = timeslot.sessions.length; sessionIndex < sessionsLen; sessionIndex++) {
                    for (var subSessIdx = 0, subSessionsLen = timeslot.sessions[sessionIndex].length; subSessIdx < subSessionsLen; subSessIdx++) {
                        var session = sessions[timeslot.sessions[sessionIndex][subSessIdx]];
                        session.mainTag = session.tags ? session.tags[0] : 'General';
                        session.day = dayIdx + 1;

                        addTagTo(session.mainTag, day.tags);
                        addTagTo(session.mainTag, schedule.tags);

                        if (!isDefined(session.track)) {

                            // [temp fix] when we have 1 session and 1 workshop, to have correct location for workshop (not Stage 2)
                            if (sessionsLen == 2 && sessionIndex == sessionsLen - 1) {
                                session.track = day.tracks[day.tracks.length - 1];
                            }
                            else {
                                session.track = day.tracks[sessionIndex];
                            }
                        }
                        session.startTime = timeslot.startTime;
                        session.endTime = subSessionsLen > 1 ? getEndTime(day.date, timeslot.startTime, timeslot.endTime, subSessionsLen, subSessIdx + 1) : timeslot.endTime;
                        session.dateReadable = day.dateReadable;

                        attachSessionAndSpeakersTogether(session, speakers);

                        schedule.days[dayIdx].timeslots[timeSlotIdx].sessions[sessionIndex][subSessIdx] = session;
                    }
                }
            }
        }
    } else if (hasSpeakersAndSessions(speakers, sessions)) {
        Object.keys(sessions).forEach(function (sessionId) {
            return attachSessionAndSpeakersTogether(sessions[sessionId], speakers)
        });
    }

    schedule = Array.isArray(schedule.days) && Object.keys(sessions).length ? schedule : {};

    return {
        schedule,
        sessions,
        speakers
    }
}

exports.generateSchedule = generateSchedule;