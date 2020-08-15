/* Copyright (C) 2019 Martin C. Ridgeway - You may use, distribute and modify this code under the terms of the MIT license */
/*global onmessage*/
/*global postMessage*/

(function(){
"use strict";

var stats = {};
var courseData = {};
var scheduleData = {};
var configUiScheduleHrsPerDay;

stats.indexData = {};
stats.indexData.schedules = [];
stats.indexData.courses = [];
stats.autoBldr = {};
stats.autoBldr.schedules = {};
stats.autoBldr.courses = [];
stats.settings = {};

/*START functions required*/

Array.prototype.identical = function (testArr) { //"IDENTICAL" METHOD extends array
    var i;

    if (this.length !== testArr.length) {
        return false;
    }
    for (i = 0; i < testArr.length; i++) {
        if (this[i].identical) { //To test values in nested arrays
            if (!this[i].identical(testArr[i])) {
                return false;
            }
        }
        else if (this[i] !== testArr[i]) {
            return false;
        }
    }
    return true;
};

function uniqueValues(arr) {
    var filtered = [];
    var len = arr.length;
    var i,
        j;

    for (i = 0; i < len; i++) {
        for (j = i + 1; j < len; j++) {
            if (arr[i] === arr[j]) { // If a[i] is found later in the array...
                j = ++i;
            }
        }
        filtered.push(arr[i]);
    }
    return filtered;
}
// sParam and cParam are always strings! e.g. "s1", "c1"... //this function used in makeAssignment() within a loop through all cRef.'s assigned to a schedule (pos)
function collisionChk(sParam, cParam, pos) { //uses: Array.prototype.identical to check an hour for a double booking
    var posRef = courseData[scheduleData[sParam].cRef[pos]];
    var cObjRef = courseData[cParam];
    //check against [0]<->[0],[1]<->[1],[1]<->[0],[0]<->[1]
    if (posRef.dayhr[0].identical(cObjRef.dayhr[0]) || posRef.dayhr[1].identical(cObjRef.dayhr[1]) || posRef.dayhr[1].identical(cObjRef.dayhr[0]) || posRef.dayhr[0].identical(cObjRef.dayhr[1])) {
        return false;
    } else {
        return true;
    }
}

function thirdHrCollisionChk(sParam, cParam, pos) {
    var posRef = courseData[scheduleData[sParam].cRef[pos]];
    var cObjRef = courseData[cParam];
    var middleHr = [];

    if (cObjRef.duration === "threehour") { //if the target is a three hour course:
        middleHr.push(cObjRef.dayhr[0][0]);
        middleHr.push(cObjRef.dayhr[0][1] + 1);

        if (posRef.dayhr[0].identical(middleHr) || posRef.dayhr[1].identical(middleHr)) { //if the cRef is also a three hour block...at least one of the regularly defined hours will collide: no need to check
            return false;
        }
    } else { //if the target is not a three hour block
        middleHr.push(posRef.dayhr[0][0]);
        middleHr.push(posRef.dayhr[0][1] + 1);

        if (posRef.duration === "threehour") { //...but the cRef is:
            if (cObjRef.dayhr[0].identical(middleHr) || cObjRef.dayhr[1].identical(middleHr)) {
                return false;
            }
        }
    }
    return true; //...otherwise, either not three hours, or don't collide:
}

function allowFollowException(sParam, cParam, pos) { //both the target AND the cRef are ninety min. courses: so we look for the one true exception ONLY IF THEY COLLIDE...
    var posRef = courseData[scheduleData[sParam].cRef[pos]];
    var cObjRef = courseData[cParam];
    var targetFollow = [[cObjRef.dayhr[0][0], cObjRef.dayhr[0][1] + 1], [cObjRef.dayhr[1][0], cObjRef.dayhr[1][1] + 1]];
    var cRefFollow = [[posRef.dayhr[0][0], posRef.dayhr[0][1] + 1], [posRef.dayhr[1][0], posRef.dayhr[1][1] + 1]];
    var i;

    for (i = 0; i < 2; i++) { //only the allowFollow Booleans for "true" precedes "false" can pass
        if (targetFollow[i].identical(posRef.dayhr[0])) { //if the target's following hr collides with cRef...
            if (cObjRef.allowFollow[i] === true && posRef.allowFollow[0] === false) { return true; }
            return false;
        }
        if (targetFollow[i].identical(posRef.dayhr[1])) {
            if (cObjRef.allowFollow[i] === true && posRef.allowFollow[1] === false) { return true; }
            return false;
        }
        if (cRefFollow[i].identical(cObjRef.dayhr[0])) { //...and if the cRef collides with target's following hr:
            if (posRef.allowFollow[i] === true && cObjRef.allowFollow[0] === false) { return true; }
            return false;
        }
        if (cRefFollow[i].identical(cObjRef.dayhr[1])) {
            if (posRef.allowFollow[i] === true && cObjRef.allowFollow[1] === false) { return true; }
            return false;
        }
    }
    return true; //no collisions
}

//ninety min. courses need the following hour made unavailable. //using the same loop as the regular collision chk in makeAssignment()...'pos' is the cRef in: scheduleData[sParam].cRef.length
function allowFollowChk(sParam, cParam, pos) {
    var posRef = courseData[scheduleData[sParam].cRef[pos]];
    var cObjRef = courseData[cParam];
    var cRefFollow,
        targetFollow;

    if (!cObjRef.hasOwnProperty('allowFollow')) { //if target is NOT a ninety min. course...
        if (!posRef.hasOwnProperty('allowFollow')) { return true; }
        //the cRef assigned to this schedule is ninety min...chk target for collision against the cRef's 'following' hour
            cRefFollow = [[posRef.dayhr[0][0], posRef.dayhr[0][1] + 1], [posRef.dayhr[1][0], posRef.dayhr[1][1] + 1]];

            if (cObjRef.dayhr[0].identical(cRefFollow[0]) || cObjRef.dayhr[1].identical(cRefFollow[1]) || cObjRef.dayhr[1].identical(cRefFollow[0]) || cObjRef.dayhr[0].identical(cRefFollow[1])) {
                return false;
            }
            return true;
    } else { //if target IS a ninety min. course however:
        if (posRef.hasOwnProperty('allowFollow')) {
            return allowFollowException(sParam, cParam, pos); //both target and cRef are ninety min. courses:
        }
        //if the cRef assigned to this schedule is NOT ninety min...chk cRef for collision against the target's 'following' hour
        targetFollow = [[cObjRef.dayhr[0][0], cObjRef.dayhr[0][1] + 1], [cObjRef.dayhr[1][0], cObjRef.dayhr[1][1] + 1]];

        if (targetFollow[0].identical(posRef.dayhr[0]) || targetFollow[1].identical(posRef.dayhr[1]) || targetFollow[1].identical(posRef.dayhr[0]) || targetFollow[0].identical(posRef.dayhr[1])) {
            return false;
        }
        return true; //no collisions
    }
}

function notAssignedChk(cParam) {
    if (courseData[cParam].assgn === "") {
        return true;
    }
    return false;
}

function dayOffChk(sParam, cParam) {
    if (courseData[cParam].dayhr[0][0] !== scheduleData[sParam].dayOff && courseData[cParam].dayhr[1][0] !== scheduleData[sParam].dayOff) {
        return true;
    }
    return false;
}

function calculateHrsForMaxHrsChk(sParam) { //the current total of hours currently assigned to the specific schedule
    var countedHrs = 0;
    var len = scheduleData[sParam].cRef.length;
    var cObjRef,
        i;

    for (i = 0; i < len; i++) {
        cObjRef = courseData[scheduleData[sParam].cRef[i]];

        if (cObjRef.cat === "CLINIC") { continue; } //ignore cRef.s that are klinics
        if (cObjRef.duration === "ninety" || cObjRef.duration === "threehour") {
            countedHrs += 1.5;
        } else {
            countedHrs += 1; //other courses are two blocks of 1 hour
        }
    }
    return countedHrs * 2; //assumes that there are two references (i.e. two different days or two consecutive blocks)
}

function maxHrsChk(sParam, cParam) {
    var maxLimit = Number(stats.settings.maxHours);
    var toBeAssgnd = 2; //default: 2 hour course
    var totalHrs;

    if (stats.settings.overrides.maxHours === true) { return true; }
    if (typeof cParam !== undefined) { //maxHrsChk() receives only one argument when used to checkTooFewCourses()
        if (courseData[cParam].cat === "CLINIC") { return true; }
    }
    if (courseData[cParam].duration === "ninety" || courseData[cParam].duration === "threehour") { toBeAssgnd = 3; }

    totalHrs = calculateHrsForMaxHrsChk(sParam);

    if (totalHrs + toBeAssgnd <= maxLimit) {
        return true;
    }
    return false;
}

function canAssignHereChk(sParam, cParam) {
    if (scheduleData[sParam].cRef.indexOf(cParam) === -1) {
        return true;
    }
    return false;
}

function tooManyHrs(elem) {
    return elem > Number(stats.settings.maxHrsPerDay);
}

function maxHoursInOneDay(sParam, cParam) {
    var daySumHrs,
        cObjRef,
        sArr,
        dy0,
        dy1,
        dyA,
        dyB,
        i;

    if (stats.settings.overrides.maxHrsPerDay === true) { return true; }
    if (courseData[cParam].cat === "CLINIC") { return true; }

    daySumHrs = [0, 0, 0, 0, 0, 0]; //M,T,W,Th,F,S //ASSUME [] All possible days
    sArr = scheduleData[sParam].cRef;
    dy0 = courseData[cParam].dayhr[0][0];
    dy1 = courseData[cParam].dayhr[1][0];

    for (i = 0; i < sArr.length; i++) {
        cObjRef = courseData[sArr[i]];
        if (cObjRef.cat === "CLINIC") { continue; } //ignore cRef.s that are klinics

        dyA = cObjRef.dayhr[0][0];
        dyB = cObjRef.dayhr[1][0];
        if (dy0 !== dyA && dy0 !== dyB && dy1 !== dyA && dy1 !== dyB) { continue; } //ignore cRef.s that are not on the proposed days

        daySumHrs[dyA] += 1;
        daySumHrs[dyB] += 1;
        if (cObjRef.duration === "threehour") { daySumHrs[dyA] += 1; }
    }
    daySumHrs[dy0] += 1; //add the proposed assignment's hours
    daySumHrs[dy1] += 1;

    if (cObjRef.duration === "threehour"){ daySumHrs[dy0] += 1; }

    return !daySumHrs.some(tooManyHrs); //returns the boolean inverted (refer: the name of the fn)
}

function chkSequence(hrsSequence, is2or3Hr, is3Hr) {
    var allowSeq = true;
    var len = hrsSequence.length;
    var hrsRef,
        i,
        ii;

    if (stats.settings.maxSeqHrs === 2) {
        if (is3Hr) {
            for (i = 0; i < len; i++) {
                hrsRef = hrsSequence[i];
                for (ii = 0; ii < hrsRef.length - 2; ii++) { //check for 4 consecutive hours...
                    if (hrsRef[ii] === 1 && hrsRef[ii] === hrsRef[ii + 1] && hrsRef[ii + 1] === hrsRef[ii + 2] && hrsRef[ii + 2] === hrsRef[ii + 3]) {
                        allowSeq = false;
                        break;
                    }
                }
            }
        } else {
            for (i = 0; i < len; i++) {
                hrsRef = hrsSequence[i];
                for (ii = 0; ii < hrsRef.length - 1; ii++) { //check for 3 consecutive hours...
                    if (hrsRef[ii] === 1 && hrsRef[ii] === hrsRef[ii + 1] && hrsRef[ii + 1] === hrsRef[ii + 2]) {
                        allowSeq = false;
                        break;
                    }
                }
            }
        }
    }
    if (stats.settings.maxSeqHrs === 3) {
        if (is2or3Hr) {
            for (i = 0; i < len; i++) {
                hrsRef = hrsSequence[i];
                for (ii = 0; ii < hrsRef.length - 3; ii++) { //check for 5 consecutive hours (2,3 hour blocks)...
                    if (hrsRef[ii] === 1 && hrsRef[ii] === hrsRef[ii + 1] && hrsRef[ii + 1] === hrsRef[ii + 2] && hrsRef[ii + 2] === hrsRef[ii + 3] && hrsRef[ii + 3] === hrsRef[ii + 4]) {
                        allowSeq = false;
                        break;
                    }
                }
            }
        } else { //case is: ninety minute, or 2 x 1 hour
            for (i = 0; i < len; i++) {
                hrsRef = hrsSequence[i];
                for (ii = 0; ii < hrsRef.length - 2; ii++) { //check for 4 consecutive hours...
                    if (hrsRef[ii] === 1 && hrsRef[ii] === hrsRef[ii + 1] && hrsRef[ii + 1] === hrsRef[ii + 2] && hrsRef[ii + 2] === hrsRef[ii + 3]) {
                        allowSeq = false;
                        break;
                    }
                }
            }
        }
    }
    return allowSeq;
}

function sequentialHrsChk(sParam, cParam) {
    var hrsSequence = buildDefaultScheduleUiArr(0);
    var is2or3Hr = false;
    var is3Hr = false;
    var cObjRef,
        dy0,
        dy1,
        hr0,
        hr1,
        dyA,
        dyB,
        hrA,
        hrB,
        i;

    if (stats.settings.overrides.maxSeqHrs === true) { return true; }
    if (courseData[cParam].cat === "CLINIC") { return true; }

    dy0 = courseData[cParam].dayhr[0][0];
    dy1 = courseData[cParam].dayhr[1][0];
    hr0 = courseData[cParam].dayhr[0][1];
    hr1 = courseData[cParam].dayhr[1][1];

    for (i = 0; i < scheduleData[sParam].cRef.length; i++) {
        cObjRef = courseData[scheduleData[sParam].cRef[i]];
        if (cObjRef.cat === "CLINIC") { continue; } //ignore cRef.s that are klinics

        dyA = cObjRef.dayhr[0][0];
        dyB = cObjRef.dayhr[1][0];
        hrA = cObjRef.dayhr[0][1];
        hrB = cObjRef.dayhr[1][1];
        if (dy0 !== dyA && dy0 !== dyB && dy1 !== dyA && dy1 !== dyB) { continue; } //ignore cRef.s that are not on the proposed days

        hrsSequence[dyA][hrA] += 1;
        hrsSequence[dyB][hrB] += 1;
        if (cObjRef.duration === "threehour") { hrsSequence[dyA][hrA + 1] += 1; } //add the middle hour!
    }
    hrsSequence[dy0][hr0] += 1; //adds the targeted hours
    hrsSequence[dy1][hr1] += 1;

    if (cObjRef.duration === "twohour") { is2or3Hr = true; }
    if (cObjRef.duration === "threehour") {
        hrsSequence[dy0][hr0 + 1] += 1; //add the middle hour!
        is2or3Hr = true;
        is3Hr = true;
    }
    return chkSequence(hrsSequence, is2or3Hr, is3Hr);
}

function chkNoSatCollision(sParam, cParam) { //you can assign any course to a Sat. schedule. You can't assign a course with a Sat. to a Mon.to Fri. schedule //ALWAYS ASSUME [] Mon to Fri
    var cObjRef = courseData[cParam];

    if (scheduleData[sParam].hasOwnProperty('isSat')) { return true; } //if the schedule is Sat. = true
    if ((cObjRef.dayhr[0][0] !== 5 && cObjRef.dayhr[1][0] !== 5) && !(scheduleData[sParam].hasOwnProperty('isSat'))) { //if the course has NO Sat.s IN EITHER HOUR and the schedule is for M-F only = true
        return true;
    }
    return false;
}

function deptGroupIndex(courseDept) {
    var grps = [];
    var len = stats.settings.deptGrps.length;
    var arr,
        i;

    for (i = 0; i < len; i++) {
        arr = stats.settings.deptGrps[i];

        if (arr.indexOf(courseDept) !== -1) { grps.push(arr); }
    }
    return grps; //returns an array of found groups
}

function allowDeptGroup(sParam, cParam) { //last check in makeAssignment()
    var deptGrpsWithTargetDept,
        theseAssgndDepts,
        cObjRef,
        sObjLen,
        count,
        dy0,
        dy1,
        dyA,
        dyB,
        i,
        ii;

    if (!stats.settings.deptGrps.length) { return true; }
    if (stats.settings.overrides.deptGrps === true) { return true; }
    if (courseData[cParam].cat === "CLINIC") { return true; }

    deptGrpsWithTargetDept = deptGroupIndex(courseData[cParam].dept); //array of deptGrps [] containing the dept we want to assign
    theseAssgndDepts = [];  //array to catch depts already assigned to this schedule
    sObjLen = scheduleData[sParam].cRef.length;

    for (i = 0; i < sObjLen; i++) {
        cObjRef = courseData[scheduleData[sParam].cRef[i]];

        if (cObjRef.cat ==="CLINIC") { continue; } //ignore cRef.s that are klinics
        if (stats.settings.deptGrpsSetBy === 'week') { theseAssgndDepts.push(cObjRef.dept); }

        if (stats.settings.deptGrpsSetBy === 'day') { //only courses with common dayHrs are included
            dy0 = cObjRef.dayhr[0][0];
            dy1 = cObjRef.dayhr[1][0];
            dyA = courseData[cParam].dayhr[0][0];
            dyB = courseData[cParam].dayhr[1][0];

            if (dy0 === dyA || dy0 === dyB || dy1 === dyA || dy1 === dyB) { theseAssgndDepts.push(cObjRef.dept); }
        }
    }
    theseAssgndDepts.push(courseData[cParam].dept);  //...may not include the dept to be assigned
    uniqueValues(theseAssgndDepts);

    for (i = 0; i < deptGrpsWithTargetDept.length; i++) {
        count = 0;

        for (ii = 0; ii < theseAssgndDepts.length; ii++) {
            if (deptGrpsWithTargetDept[i].includes(theseAssgndDepts[ii])) { //run .includes() on each nested array of theseAssgndDepts
                count++;
            }
        }
        if (count === theseAssgndDepts.length) { //all assigned depts (with the addition of the target) are inclusive of a single deptGrp
            return true;
        }
    }
    return false;
}

function atomicMakeAssignment(schedule, course) {
    scheduleData[schedule].cRef.push(course);
    courseData[course].assgn = schedule;
}

function atomicRemoveAssignment(schedule, course) {
    courseData[course].assgn = "";
    scheduleData[schedule].cRef.splice(scheduleData[schedule].cRef.indexOf(course), 1);
}

function makeAssignment(schedule, course) { //assign a single course to a schedule: //NOTE: no check for .cat
    var availCount,
        len,
        i;

    if (!scheduleData[schedule].cRef.length) {
        if (notAssignedChk(course) && dayOffChk(schedule, course) && chkNoSatCollision(schedule, course)) {
            atomicMakeAssignment(schedule, course);
        }
        return;
    }
    if (canAssignHereChk(schedule, course) === false) { return; } //these conditions all assume cRef.length
    if (notAssignedChk(course) === false) { return; }
    if (maxHrsChk(schedule, course) === false) { return; }
    if (dayOffChk(schedule, course) === false) { return; }
    if (maxHoursInOneDay(schedule, course) === false) { return; }
    if (sequentialHrsChk(schedule, course) === false) {return; }
    if (chkNoSatCollision(schedule, course) === false) { return; }

    availCount = 0;
    len = scheduleData[schedule].cRef.length;

    for (i = 0; i < len; i++) { //check that the value exiting the loop matches cRef.length - if true: no collisions
        if (collisionChk(schedule, course, i) && allowFollowChk(schedule, course, i) && thirdHrCollisionChk(schedule, course, i)) {
            availCount++;
        } else {
            break;
        }
    }
    if (availCount !== len) { return; }

    if (allowDeptGroup(schedule, course)) { //true if dept.s are all within dept groups (as defined by user)
        atomicMakeAssignment(schedule, course);
    }
}

function removeAssignment(schedule, course) {
    if (!scheduleData[schedule].cRef.length) { throw new Error("Internal error: Attempted to remove an assignment that was never made: s" + schedule + ", c" + course); }
    if ((courseData[course].assgn === schedule) && (scheduleData[schedule].cRef.indexOf(course) !== -1)) {
        atomicRemoveAssignment(schedule, course);
    }
}

function buildDefaultScheduleUiArr(val) { //Defines the hour length of schedules
    var uiArrRow = new Array(config.uiScheduleNumOfHrsPerDay).fill(val);

    return JSON.parse(JSON.stringify(new Array(6).fill(uiArrRow))); //always max of six days
}

/*END functions required*/

/*******************AUTOBLDR_14************************/

onmessage = function(dataStr) { /*POST MESSAGE*/
    var autoBldrData = JSON.parse(dataStr.data);
    var len,
        statsRef,
        i;

    stats.indexData.schedules = autoBldrData[0];
    len = stats.indexData.schedules.length;

    for (i = 0; i< len; i++) {
        statsRef = stats.indexData.schedules[i];
        scheduleData[statsRef] = {};
        scheduleData[statsRef].cRef = [];
        scheduleData[statsRef].dayOff = 6;
    }
    courseData = autoBldrData[1];
    stats.indexData.courses = Object.keys(courseData);
    stats.settings = autoBldrData[2];
    configUiScheduleHrsPerDay = Number(autoBldrData[3]);
    prepAutoBldr();
};

function isScheduleComplete(sParam) { //FUNCTION THAT WILL DETERMINE IF A SCHEDULE IS "COMPLETE" FOR CLEANING/UNSUBSCRIBING PURPOSES ref: checkTooFewCourses(sParam)
    var totalHrs = calculateHrsForMaxHrsChk(sParam); //sParam is the id of the schedule
    var chk = true;

    if (scheduleData[sParam].cRef.length){ //e.g. (5 * 2) = 10, but: (4 * 2) + (1 * 3) = 11...contains a threehour or ninety min. course and should therefore be marked as complete
        if (totalHrs < (stats.settings.maxHours - 1)) { //all other cases: chk = true;
            chk = false;
        }
    } else {
        chk = false;
    }
    return chk;
}

function calcDayOffStat(cat, catParam) { //returns: [ [2, 2, 4, 3, 1]...(i.e.: how many dayOff's are statistically likely for each day), requiredNoOfDayOffs, the catNumber of the category (i.e."cat1") representing a key of object: stats.autoBldr.schedules ]
    var dayOffStat = [0, 0, 0, 0, 0, 0]; //config: always assumes 6 days!
    var len = stats.indexData.courses.length;
    var cObjRef,
        totalHrs,
        requiredNoOfDayOffs,
        inverseProportionTotal,
        i;

    for (i = 0; i < len; i++) {
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cObjRef.cat === cat && cObjRef.assgn === '') { //push unassigned courses' dayhrs to dayOffStat
            dayOffStat[cObjRef.dayhr[0][0]] += 1;
            dayOffStat[cObjRef.dayhr[1][0]] += 1;
        }
    }
    dayOffStat.pop(); //ignore SAT.!...Sat. courses do not have a Sat. dayOff and montofri schedules do not have a SAT. value
    totalHrs = dayOffStat.reduce(function(sum, value) { return sum + value; }, 0); //the total number of hours involved...
    requiredNoOfDayOffs = Math.ceil(totalHrs/stats.settings.maxHours); //the no. of schedules required...w/ Math.ceil(): better to be over than to throw an error...

    for (i = 0; i < dayOffStat.length; i++) { //calculate the inverse proportion of each value...
        if (dayOffStat[i] > 0) {
            if (Math.round(totalHrs / (dayOffStat[i])) > 0) {
                dayOffStat[i] = totalHrs / (dayOffStat[i]);
            } else {
                dayOffStat[i] = 0;
            }
        } else { //there are no courses on this day (so this will be the dayOff for all schedules and we exit early)
            dayOffStat.fill(0);
            dayOffStat[i] = requiredNoOfDayOffs;
            return [dayOffStat, requiredNoOfDayOffs, catParam];
        }
    }
    inverseProportionTotal = dayOffStat.reduce(function(sum, value) { return sum + value; }, 0);

    for (i = 0; i < dayOffStat.length; i++) { //make each value a percentage of the requiredNoOfDayOffs (using each inverse proportion)...
        dayOffStat[i] = Math.round((dayOffStat[i] / inverseProportionTotal) * requiredNoOfDayOffs); //Math.round() is the closest we can get...
    }
    return [dayOffStat, requiredNoOfDayOffs, catParam];
}

function theMaximumValue(arr) {
    return arr.reduce(function(a, b) { return Math.max(a, b); });
}

function setNewDayOffs(dayOffsArr) { //this function takes the dayOffsArr[0] 'dayOffStat' and uses it to set dayOffs on empty schedules (or schedules marked in stats.autoBldr.schedules)
    var scheduleIdsArr = [];
    var statsRef,
        len,
        newDayOff,
        i;

    if (stats.autoBldr.schedules[dayOffsArr[2]].length) {
        len = stats.autoBldr.schedules[dayOffsArr[2]].length;

        for (i = 0; i < len; i++) {
            statsRef = stats.autoBldr.schedules[dayOffsArr[2]][i];
            if (scheduleData[statsRef].cRef.length < stats.settings.maxHours/2 && scheduleIdsArr.length < dayOffsArr[1]) {
                scheduleIdsArr.push(statsRef);
            }
        }
    } else {
        len = stats.indexData.schedules.length;

        for (i = 0; i < len; i++) { //loop through all schedules and look for schedules with no assignments...then hold the schedule IDs in an array
            statsRef = stats.indexData.schedules[i];
            if (scheduleIdsArr.length < dayOffsArr[1]) {
                if (!scheduleData[statsRef].cRef.length) {
                    scheduleIdsArr.push(statsRef);
                }
            } else {
                break;
            }
        }
    }

    for (i = 0; i < scheduleIdsArr.length; i++ ) { //select the first index with the highest value from dayOffsArr[0] and change the schedule[i].dayOff to that index
        newDayOff = dayOffsArr[0].indexOf(theMaximumValue(dayOffsArr[0]));
        scheduleData[scheduleIdsArr[i]].dayOff = newDayOff;

        if (dayOffsArr[0][newDayOff] > 0) {
            dayOffsArr[0][newDayOff] -= 1;
        }
    }
    return scheduleIdsArr;
}

function getRelevantCourses(cat) {
    var relevantCourses = [];
    var len = stats.indexData.courses.length;
    var statsRef,
        cObjRef,
        i;

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];
        cObjRef = courseData[statsRef];

        if (cObjRef.cat === cat && cObjRef.assgn === '') {
            relevantCourses.push(statsRef);
        }
    }
    return relevantCourses;
}

function reorderRelevantCourses(relevantCourses) { //sorting by: dept -> time -> room
    var reorderedArr = [];
    var sortingArr = [];
    var len = relevantCourses.length;
    var cObjRef,
        element,
        cleanRm,
        i;

    for (i = 0; i < len; i++) {
        element = [];
        cObjRef = courseData[relevantCourses[i]];
        cleanRm = Number((cObjRef.rm.a).replace(/[^0-9]/g, '')); //done here to get Number (if possible) for sorting...
        element.push( relevantCourses[i], cObjRef.dept, cObjRef.dayhr[0][1], cleanRm );
        sortingArr.push(element);
    }
    sortingArr.sort(function (a, b) {
        return a[1].localeCompare(b[1]) || a[2] - b[2] || a[3] - b[3];
    });
    for (i = 0; i < sortingArr.length; i++) {
        reorderedArr.push( sortingArr[i][0] );
    }
    return reorderedArr;
}

function autoBldrMakeAssgn(catParam) {
    var len = stats.autoBldr.schedules[catParam].length;
    var cLen = stats.autoBldr.courses.length;
    var statsRef,
        i,
        ii;

    for (i = 0; i < len; i++) {
        statsRef = stats.autoBldr.schedules[catParam][i]; //statsRef === sParam

        if (isScheduleComplete(statsRef) !== true) { //faster to skip over completed schedules:
            for (ii = 0; ii < cLen; ii++) {
                makeAssignment(statsRef, stats.autoBldr.courses[ii]);
            }
        }
    }
}

function cleanUndersubsrcibedSchedules(catParam){ //catParam is: "cat" + (ctgryIndex + 1)
    var cpDoneStr = "" + catParam + "done"
    var i,
        ii;

    for (i = stats.autoBldr.schedules[catParam].length - 1; i >= 0; i--) {
        if (scheduleData[stats.autoBldr.schedules[catParam][i]].cRef.length) {
            if (isScheduleComplete(stats.autoBldr.schedules[catParam][i]) !== true){
                for (ii = scheduleData[stats.autoBldr.schedules[catParam][i]].cRef.length - 1; ii >= 0; ii--) {
                    removeAssignment(stats.autoBldr.schedules[catParam][i], scheduleData[stats.autoBldr.schedules[catParam][i]].cRef[ii]);
                }
            } else {
                stats.autoBldr[cpDoneStr].push(stats.autoBldr.schedules[catParam][i]); //finished schedules
            }
        }
    }
}

function sortCatParam(a, b) {
    return Number(a.substring(1)) - Number(b.substring(1));
}

function moveCompletedTogether(catParam) { //moving all completed schedules together into a block
    var transferArr = [];
    var cpDoneStr = "" + catParam + "done";
    var newDayOff;
    var i,
        ii;

    stats.autoBldr[cpDoneStr].sort(sortCatParam);
    uniqueValues(stats.autoBldr[cpDoneStr]); //the list of finished schedules NOTE: substrings! "s1" -> "1" (to get a numerical sort)
    //transfer the last FINISHED schedule's assignments in: stats.autoBldr[cpDoneStr][i] //to the first EMPTY schedule in: stats.autoBldr.schedules[catParam][0]...if it has a higher 'number':
    for (i = stats.autoBldr[cpDoneStr].length - 1; i >= 0; i--) {
        if (stats.autoBldr.schedules[catParam].length) {
            if (Number((stats.autoBldr[cpDoneStr][i]).substring(1)) > Number(stats.autoBldr.schedules[catParam][0].substring(1))) {
                for (ii = scheduleData[stats.autoBldr[cpDoneStr][i]].cRef.length - 1; ii >= 0; ii--) {
                    transferArr.push(scheduleData[stats.autoBldr[cpDoneStr][i]].cRef[ii]); //push the cRef's to the transferArr
                }
                for (ii = scheduleData[stats.autoBldr[cpDoneStr][i]].cRef.length - 1; ii >= 0; ii--) {
                    removeAssignment(stats.autoBldr[cpDoneStr][i], scheduleData[stats.autoBldr[cpDoneStr][i]].cRef[ii]); //unassign the cRef's
                }
                stats.autoBldr.schedules[catParam].push(stats.autoBldr[cpDoneStr][i]); //...put the sParam reference back into: stats.autoBldr.schedules[catParam] because the schedule is now empty

                for (ii = 0; ii < transferArr.length; ii++) { //complete the first schedule in: stats.autoBldr.schedules[catParam] with the assignments taken from the newly emptied schedule
                    makeAssignment(stats.autoBldr.schedules[catParam][0], transferArr[ii]);
                }
                newDayOff = scheduleData[stats.autoBldr[cpDoneStr][i]].dayOff; //..and update the dayOff with the value from the newly emptied schedule
                scheduleData[stats.autoBldr.schedules[catParam][0]].dayOff = newDayOff;
                stats.autoBldr.schedules[catParam].splice(0, 1); //delete the now irrelevant schedule from the array and update the array...
                stats.autoBldr.schedules[catParam].sort(sortCatParam);
            } else {
                continue;
            }
        }
    }
    delete stats.autoBldr[cpDoneStr]; //remove the holding array for completed schedules
}

function cleanAllEmptySchedules() { //make sure that all empty schedules are cleaned correctly...
    var len = stats.indexData.schedules.length;
    var sObjRef,
        i;

    for (i = 0; i < len; i++) {
        sObjRef = scheduleData[stats.indexData.schedules[i]];

        if (sObjRef.cRef.length === 0) {
            sObjRef.dayOff = 6;
        }
    }
}

function returnWithResults() {
    postMessage(JSON.stringify(scheduleData));
}

function prepAutoBldr() {
    var index = Object.keys(courseData)[0];
    var cat = courseData[index].cat;
    var catParam = "cat1";
    var cpDoneStr = "" + catParam + "done";

    if (!stats.hasOwnProperty('autoBldr')) { stats.autoBldr = {}; }
    if (!stats.autoBldr.hasOwnProperty('schedules')) { stats.autoBldr.schedules = {}; }

    if (!stats.autoBldr.schedules.hasOwnProperty(catParam)) {
        stats.autoBldr.schedules[catParam] = [];
        stats.autoBldr.schedules[catParam] = setNewDayOffs(calcDayOffStat(cat, catParam)); //returns array of empty schedules to populate (dayOffs are set)
        stats.autoBldr[cpDoneStr] = []; //for completed schedules so we can group them all together during clean up
    } else { //if triggered following a recycle from either #references or #schedule-instance, the schedule dayOff info will be wrong, so:
        if (stats.hasOwnProperty('autoBldr')) {
            if (stats.autoBldr.hasOwnProperty('schedules')) {
                if (stats.autoBldr.schedules.hasOwnProperty(catParam)) {
                    stats.autoBldr[cpDoneStr] = []; //for completed schedules so we can group them all together during clean up
                    cleanUndersubsrcibedSchedules(catParam);
                    stats.autoBldr.schedules[catParam] = [];
                    stats.autoBldr.schedules[catParam] = setNewDayOffs(calcDayOffStat(cat, catParam));
                }
            }
        }
    }
    promptAutoBuilder(cat, catParam);
}

function postAutoBldrCleanUpAndExit(cat, catParam) {
    var statsClone,
        i;

    cleanUndersubsrcibedSchedules(catParam); //clean up thoroughly
    cleanAllEmptySchedules();
    moveCompletedTogether(catParam);
    stats.autoBldr.schedules[catParam] = [];
    stats.autoBldr.schedules[catParam] = setNewDayOffs(calcDayOffStat(cat, catParam));
    cleanAllEmptySchedules();
    stats.autoBldr.schedules = {}; //ISOLATE the data to return
    stats.autoBldr.courses = []; //ISOLATE the data to return
    statsClone = stats.indexData.schedules.slice(0); //copy the original stats.indexData.schedules KEYS

    for (i = stats.indexData.schedules.length - 1; i>=0; i--) { //delete those schedules that didn't complete
        if (isScheduleComplete(stats.indexData.schedules[i]) !== true) {
            delete scheduleData[stats.indexData.schedules[i]];
            stats.indexData.schedules.splice(i, 1);
        }
    }

    for (i = 0; i < stats.indexData.schedules.length; i++) { //rename each KEY of scheduleData to the sequence given in the original array (so they would be consecutive, if possible)
        if (stats.indexData.schedules[i] !== statsClone[i]) {
            Object.defineProperty(scheduleData, statsClone[i], Object.getOwnPropertyDescriptor(scheduleData, stats.indexData.schedules[i]));
            delete scheduleData[stats.indexData.schedules[i]];
        }
    }
    returnWithResults();
}

function runAutoBldr(cat, catParam, purgeIncomplete){
    stats.autoBldr.courses = [];
    stats.autoBldr.courses = reorderRelevantCourses(getRelevantCourses(cat));

    if (purgeIncomplete === true) {
        cleanUndersubsrcibedSchedules(catParam); //recycles undersubscribed schedules without altering stats.autoBldr.schedules[catParam]
        stats.autoBldr.schedules[catParam] = [];
        stats.autoBldr.schedules[catParam] = setNewDayOffs(calcDayOffStat(cat, catParam)); //recalculate dayOffs with what is left and try again...
    }
    autoBldrMakeAssgn(catParam);
    autoBldrRemoveGaps(catParam);
}

function promptAutoBuilder(cat, catParam) { //compare completed schedules length ...if new schedules were created, then repeat the action, otherwise exit
    var prevLength = 0;
    var currentLength = stats.autoBldr.schedules[catParam].length * 1; //even though the primitive is passed by value: tin-foil hats on!

    while (prevLength !== currentLength) {
        prevLength = stats.autoBldr.schedules[catParam].length * 1;
        autoBuilder(cat, catParam);
        currentLength = stats.autoBldr.schedules[catParam].length * 1;
    }
    postAutoBldrCleanUpAndExit(cat, catParam);
}

function autoBuilder(cat, catParam) {
    runAutoBldr(cat, catParam, false); //false -> pass over undersubscribed schedules but do not recycle them
    runAutoBldr(cat, catParam, true); //true -> pass over undersubscribed schedules (again) and then recycle those that don't complete
}

function autoBldrRemoveGaps(catParam) { //attempts to remove large gaps between classes (of 3 or more hours)
    var sameDayArr = [];
    var cRefRemovalArr = [];
    var len = stats.autoBldr.schedules[catParam].length;
    var statsRef;
    var sObjRef;
    var x,
        i,
        ii;

    for (i = 0; i < len; i++) {
        statsRef = stats.autoBldr.schedules[catParam][i];
        sObjRef = scheduleData[statsRef];
        //NOTE: this was never used for SAT! "< 5" is assumed (monToFri) && dayOff(5) SAT is ignored because they are rare occurances //ALWAYS ASSUME [] Mon to Fri
        for (x = 0; x < 5; x++ ) {
            sameDayArr = [];
            if (sObjRef.dayOff === x) { continue; }

            for (ii = 0; ii < sObjRef.cRef.length; ii++ ) {
                if (courseData[sObjRef.cRef[ii]].dayhr[0][0] === x ) {
                    sameDayArr.push([sObjRef.cRef[ii], courseData[sObjRef.cRef[ii]].dayhr[0][1]]);
                }
                if (courseData[sObjRef.cRef[ii]].dayhr[1][0] === x) {
                    sameDayArr.push([sObjRef.cRef[ii], courseData[sObjRef.cRef[ii]].dayhr[1][1]]);
                }
            }
            if (sameDayArr.length > 1) { //when there is more than one element in this array //e.g. sameDayArr = [[c1, 1],...]; ...where "c1" is the cRef and 1 is the value of time for day x
                sameDayArr.sort(function(a, b){ return a[1] - b[1]; }); //sort sameDayArr by order of time...

                if (sameDayArr[sameDayArr.length-2][1] < sameDayArr[sameDayArr.length-1][1] - 3 ) { //check if the last value of sameDayArr is > 3 to the previous value (if the previous value exists)
                    cRefRemovalArr.push(sameDayArr[sameDayArr.length-1][0]); //if so, then push the last value's cRef to cRefRemovalArr
                }
                if (sameDayArr[0][1] < sameDayArr[1][1] - 3 ) { //check if the first value of sameDayArr is < 3 to the next value (if the next value exists)
                    cRefRemovalArr.push(sameDayArr[0][0]); //if so, then push the first value's cRef to cRefRemovalArr
                }
            } else {
                continue; //there are 1 or 0 elements in sameDayArr
            }
        }
    }
    cRefRemovalArr = uniqueValues(cRefRemovalArr);

    if (cRefRemovalArr.length) {
        for (i = 0; i < cRefRemovalArr.length; i++ ) {
            removeAssignment(courseData[cRefRemovalArr[i]].assgn, cRefRemovalArr[i]);
        }
    }
}

})();