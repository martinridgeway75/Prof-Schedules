/* Copyright (C) 2019 Martin C. Ridgeway - You may use, distribute and modify this code under the terms of the MIT license */
/*global window*/
/*global document*/
/*global Worker*/

// window.addEventListener('load', function() {
// (function(){
// "use strict";

var config = {
    notes: "App assumes that there are either MonToFri or MonToSat schedules.\nApp assumes that courses are: 2x1 hour blocks, 2x90 minute blocks, 2 hour blocks, 3 hour blocks or 1 hour clinics.\nApp assumes all courses start on the hour.",
    uriTypes: {
        csv:"data:text/csv;charset=utf-8,%EF%BB%BF",
        json:"data:application/json;charset=utf-8",
        txt:"data:text/plain;charset=utf-8"
    },
    maxHrsPerDay: 4, //default class hours per day
    maxHours: 12, //default class hours per week
    uiTimeInputStartHr: 9, //defines the start hour - all schedules
    uiScheduleNumOfHrsPerDay: 9, //defines how many hours exist per day - all schedules
    courseNameNumLength: 4,
    csvStr: {
        courseCat: "교과목명",
        courseNum: "수강 번호",
        courseTime: "시간",
        courseRm: "강의실",
        courseTchr: "강사명",
        oldNum: "수강 번호1",
        newNum: "수강 번호2"
    },
    alphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    monToSatKr: ["월", "화", "수", "목", "금", "토"],
    monToSatEn: ["M", "T", "W", "Th", "F", "S"],
    pdfBlankHr: "7:50-8:40",
    pdfCourseColors: ["","blue","crimson","green","purple","darkorange"],
    scheduleRowPixelHeight: 18
};
var stats = {};
var courseData = {};
var scheduleData = {};
var csvStrings = {
    courseCat: config.csvStr.courseCat,
    courseNum: config.csvStr.courseNum,
    courseTime: config.csvStr.courseTime,
    courseRm: config.csvStr.courseRm,
    courseTchr: config.csvStr.courseTchr,
    oldNum: config.csvStr.oldNum,
    newNum: config.csvStr.newNum
};

//UTILS
//APP CORE
//STATS BUILD
//EVENT LISTENERS
//PREP AUTOBLDR
//PREP PDFs
//HANDLE FILE UPLOADS
//PARSE CSV DATA
//TEACHERS
//DEPARTMENTS
//KLINICS
//LOCAL STORAGE
//EXPORTING DATA
//ROOM SPLITS
//DOM PUNCHING
//UI & DISPLAY

//UTILS

function docElId(elId) {
    return document.getElementById(elId);
}

function templateStats() {
    stats = {
        catData: [],
        indexData: {
            courses: [],
            schedules: [],
            klinics: [],
            depts: []
        },
        settings: {
            deptGrps: [],
            deptGrpsSetBy: "day",
            maxHours: config.maxHours,
            maxHrsPerDay: config.maxHrsPerDay,
            maxSeqHrs: 3,
            overrides: {
                maxHours: false,
                maxHrsPerDay: false,
                maxSeqHrs: false,
                deptGrps: true,
                multiCats: false
            }
        },
        teachers: [],
        tempCparam: "",
        tempKlinic: {
            kbtn : "",
            isHeld : false
        },
        lastSearchItem: ""
    };
}

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
//method to check if an array or object is empty. i.e.: [] or {} ..only used this for objects, didn't use this for arrays
function isObjEmpty(obj) {
    if (obj === null) {
        return true;
    }
    else if (typeof obj !== "object") {
        return true;
    }
    //else if( Obj.isArray(obj) ){ return obj.length === 0; } //true if array is empty, false if has elements
    else {
        return Object.keys(obj).length === 0; //true if obj is empty, false if has prop.s
    }
}

function emptyContent(parentEl) {
    while (parentEl.hasChildNodes()) {
        while (parentEl.lastChild.hasChildNodes()) {
            parentEl.lastChild.removeChild(parentEl.lastChild.lastChild);
        }
        parentEl.removeChild(parentEl.lastChild);
    }
}

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

function uniqueObjs(arrayOfObjs, propString) {
    var filtered = [];
    var len = arrayOfObjs.length;
    var i,
        j;

    for (i = 0; i < len; i++) {
        for (j = i + 1; j < len; j++) {
            if ((arrayOfObjs[i][propString]).toLowerCase() === (arrayOfObjs[j][propString]).toLowerCase()) { // If a[i][propString] is found later in the array...
                j = ++i;
            }
        }
        filtered.push(arrayOfObjs[i]);
    }
    return filtered;
}

function uniqueArrOfObjs(arrayOfObjs, propString) {
    var filtered = [];
    var len = arrayOfObjs.length;
    var i,
        j;

    for (i = 0; i < len; i++) {
        for (j = i + 1; j < len; j++) {
            if (arrayOfObjs[i][propString] === arrayOfObjs[j][propString]) { // If a[i][propString] is found later in the array...
                j = ++i;
            }
        }
        filtered.push(arrayOfObjs[i]);
    }
    return filtered;
}

function objKeyFromPropVal(val, obj) { //getting the "c1" in {c1:{name:val},{},...}
    for (var key in obj) {
        if (obj[key].name === val) {
            return key;
        }
    }
    return false;
}

function deptsToObj(str) {
    return {shortcode:str, description:""};
}

function getUniqueDepartments() { //get a list of all the unique department names (from all courses)
    var everyDepartment = [];
    var uniqueDepts = [];
    var len = stats.indexData.courses.length;
    var statsRef;
    var i;

    for ( i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];
        everyDepartment.push(courseData[statsRef].dept);
    }
    everyDepartment.sort(); //sort is important: we're not sorting the 'a' array in .identical()
    everyDepartment = uniqueValues(everyDepartment);

    for ( i = 0; i < everyDepartment.length; i++ ) {
        uniqueDepts.push(deptsToObj(everyDepartment[i]));
    }
    return uniqueDepts;
}

function setDefaultCsvString(propName) {
    return config.csvStr[propName];
}

function updateCsvString(elId) {
    var str = cleanMultiWsWithSingleWs(cleanDngrChars(docElId(elId).value));
    var propName = findCsvStringFromMap(elId);

    if (propName !== undefined && str.length) {
        csvStrings[propName] = str;
    } else {
        csvStrings[propName] = setDefaultCsvString(propName);
    }
    docElId(elId).placeholder = csvStrings[propName];
    docElId(elId).value = csvStrings[propName];
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

//input search courses by name
function findcRefByCourseName(inputValue) {
    var len = stats.indexData.courses.length;
    var cRef,
        statsRef,
        i;

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];

        if (courseData[statsRef].name === inputValue) {
            cRef = statsRef;
            break;
        }
    }
    return cRef;
}

function findCsvStringFromMap(elId) {
    var els = {
      strHdr1: "courseCat",
      strHdr2: "courseRm",
      strHdr3: "courseTime",
      strHdr4: "courseNum",
      strHdr5: "oldNum",
      strHdr6: "newNum"
    };
    return els[elId];
  }

function getMaxHrsFromUser() { //triggered on save
    var maxHrsSched = Number(docElId('hrsPerSchedule').value);
    var maxHrsDay = Number(docElId('hrsPerDay').value);

    if (maxHrsSched >= 1 && maxHrsSched <= config.uiScheduleNumOfHrsPerDay * 5) { //"5" MonToFri
        stats.settings.maxHours = maxHrsSched;
    }
    if (maxHrsDay >= 1 && maxHrsDay <= config.uiScheduleNumOfHrsPerDay) {
        stats.settings.maxHrsPerDay = maxHrsDay;
    }
}

//triggered when checkboxes are checked
function maxSeqHrstwo() {
    stats.settings.maxSeqHrs = 2;
}

function maxSeqHrsthree() {
    stats.settings.maxSeqHrs = 3;
}

function deptGrpsDaily() {
    stats.settings.deptGrpsSetBy = "day";
}

function deptGrpsWeekly() {
    stats.settings.deptGrpsSetBy = "week";
}

function multiCatsYes() {
    stats.settings.overrides.multiCats = true;
}

function multiCatsNo() {
    stats.settings.overrides.multiCats = false;
}

function cleanDngrChars(str) {
    return str.replace(/[,=<>$/'"&\t]/g, '');
}

function cleanDngrCharsAndWs(str) {
    return str.replace(/[,=<>$/'"&\t\s]/g, '');
}

function cleanKrCharsOnly(str) {
    return str.replace(/[^\u3130-\u318F\uAC00-\uD7AF]/gmi, '');
}

function cleanNameCharsOnly(str) {
    return str.replace(/[^a-zA-Z\-\u3130-\u318F\uAC00-\uD7AF\s]/gmi, '');
}

function cleanTrimTrailingWs(str) {
    return str.replace(/[\s\t]+$/, '');
}

function cleanRemoveKrChars(str) {
    return str.replace(/[\u3130-\u318F\uAC00-\uD7AF]/g, '');
}

function cleanRemoveAllWs(str) {
    return str.replace(/\s/g, ''); //does nothing different: .replace(/[\s\t]+/, '')
}

function cleanAlphaNumericAndDashOnlyChars(str) {
    return str.replace(/[^a-zA-Z0-9\-]/gmi, '');
}

function cleanClssLstRemove(clsNmes, rmvStr) {
    var regex = new RegExp("(?:^|\\s)" + rmvStr + "(?!\\S)", "g"); // yields: "/(?:^|\s)" + rmStr + "(?!\S)/"

    return clsNmes.replace(regex, "");
}

function cleanMultiWsWithSingleWs(str) {
    return str.replace(/\s+/g, ' ');
}

function cleanNumCharsOnly(str) {
    return str.replace(/[^0-9]/g, '');
}

function cleanWsReturnUnderscores(str) {
    return str.replace(/\s/g, '_');
}

function regExChkInputReturnColorStr(val, rgxStr) { //rgxStr: ...without "/", escape all "\"
    var regExr = new RegExp(rgxStr, 'g');
    var color = "";

    if (!regExr.test(val)) {
        color = "#d62c1a";
    }
    return color;
}

function buildDefaultScheduleUiArr(val) { //Defines the hour length of schedules
    var uiArrRow = new Array(config.uiScheduleNumOfHrsPerDay).fill(val);

    return JSON.parse(JSON.stringify(new Array(6).fill(uiArrRow))); //always max of six days
}

function exitParsingScreen() {
    removeLoadListeners();
    initMainUiListeners();
}

//APP CORE

function fromScratch() { //load bare bones...
    getConfigFromParsingScreen();
    templateStats();
    loadStateFromData(false);
    exitParsingScreen();
}

/****************CORE ASSIGNING: COURSES & SCHEDULES*******************/
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

/****************Fn.s to set / remove a course from a schedule*********************/

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

/****************MODIFYING SCHEDULE AND COURSES PARAMETERS MANUALLY*******************/
//Purge any course from a schedule when a change in the day off is invoked manually: given that one of the course's hours collides with the new day off.
//DON'T USE WHEN RESETTING TO 6!!!
function changeDayOff(sParam, newDayOff) {
    var arrRef = scheduleData[sParam].cRef;
    var arrayOfCollisions,
        i;

    scheduleData[sParam].dayOff = Number(newDayOff); //change the dayOff parameter of the schedule

    if (!arrRef.length) { return []; } //empty arrayOfCollisions
    arrayOfCollisions = [];

    for (i = 0; i < arrRef.length; i++) { //check all assigned courses for collision with the new day off
        if (!dayOffChk(sParam, arrRef[i])) { //true if no collision, false if course collides
            arrayOfCollisions.push(arrRef[i]);
        }
    }
    for (i = 0; i < arrayOfCollisions.length; i++) {
        removeAssignment(sParam, arrayOfCollisions[i]); //remove every course that collides with the new day off
    }
    return arrayOfCollisions; //return the course ids of all collisions to update the display || []
}

function hasSameCategory(sParam, cParam) { //NOTE: makeAssignment doesn't include checks for .cat
    var arrRef = scheduleData[sParam].cRef;
    var catChk = false;
    var noOfCatKlinics,
        i;

    if (stats.settings.overrides.multiCats === true) { return true; }
    if (courseData[cParam].cat === "CLINIC") { return true; }
    if (!arrRef.length) { return true; }

    noOfCatKlinics = 0;

    for (i = 0; i < arrRef.length; i++) {
        if (courseData[arrRef[i]].cat === "CLINIC") { //ignore cRef.s that are klinics
            noOfCatKlinics++;
            continue;
        }
        if (courseData[arrRef[i]].cat === courseData[cParam].cat) {
            catChk = true; //true if at least one .cat is the same
            break;
        }
    }
    if (noOfCatKlinics === arrRef.length) {
        catChk = true; //all cats are klinics
    }
    return catChk;
}

function createOneSchedule(day) { //creates a new empty schedule record, returns a new sParam
    var newSchedule = "s1";
    var dataSize = stats.indexData.schedules.length;
    var nextKey;

    if (dataSize || dataSize > 0) {
        nextKey = (Number((stats.indexData.schedules[dataSize - 1]).substring(1))) + 1;
        newSchedule = "s" + nextKey;
    }
    //scheduleData records are DEFINED HERE! e.g. { "s1" : { "cRef" : ["c2", "c3"], "dayOff": 6, "display": "0" } };
    scheduleData[newSchedule] = {};
    scheduleData[newSchedule].cRef = [];
    scheduleData[newSchedule].dayOff = 6; //...default = Sunday/undefined
    scheduleData[newSchedule].display = "";
    if (day === 'Sat') {
        scheduleData[newSchedule].isSat = 'yes';
    }
    stats.indexData.schedules.push(newSchedule); //update the index
    updateScheduleDisplayNumbers(false); //do not let this interfere with the UI! Do it HERE!
    return newSchedule;
}

function destroyOneSchedule(sParam) { //removes any trace of a schedule
    var i;

    if (scheduleData[sParam].cRef.length) {
        for (i = (scheduleData[sParam].cRef.length) - 1; i >= 0; i--) { //loop backwards, avoiding errors with .length!
            removeAssignment(sParam, scheduleData[sParam].cRef[i]);
            //cannot use removeAssignmentViaUI() here because the schedule no longer exists in the UI so...
            //...updated the course reference section from the caller function: cRef.s got sliced in removeScheduleFromDisplay()
        }
    }
    stats.indexData.schedules.splice(stats.indexData.schedules.indexOf(sParam), 1); //remove the schedule from the list of current schedules
    delete scheduleData[sParam];
    updateScheduleDisplayNumbers(true); //true: will update the display numbers of each schedule on the UI
}

/***********************ADD NEW COURSE*******************************************/

function getErrorsForCreateNewCat(idx, newCat) { //tiggered by #savenewcat, or from new courses uploaded
    var errMsg = [
        "Please enter an appropriate name.",
        "\"CLINIC\" is a reserved category name!",
        "The name: " + newCat + " already exists.\nPlease choose a unique name."
    ];

    window.mscAlert({
        title: '',
        subtitle: errMsg[idx]
    });
    return;
}

function createNewCat(bool, newCat) { //false: we are merging newCourses from a CSV and the cat doesn't exist yet
    var newCatArr,
        i;

    if (bool === true) {
        newCat = cleanMultiWsWithSingleWs(cleanDngrChars(newCat));

        if (newCat === "") {
            getErrorsForCreateNewCat(0);
            return;
        }
        if (newCat.toLowerCase() === "clinic") {
            getErrorsForCreateNewCat(1);
            return;
        }
        if (stats.catData.length) {
            for (i = 0; i < stats.catData.length; i++) {
                if (stats.catData[i][0] === newCat) {
                    getErrorsForCreateNewCat(2, newCat);
                    return;
                }
            }
        }
    }
    newCatArr = [newCat, 0, buildDefaultScheduleUiArr(0)];
    stats.catData.push(newCatArr); //update stats.catData
    displayNewCat(stats.catData.length);

    if (bool === true) {
        window.mscAlert({
            title: '',
            subtitle: '' + newCat + ' has been added to the list of categories.'
        });
        docElId('definenewcat').value = ""; //clear the input
        exitMakeNewCat();
    }
    populateNewCourseCats(); //rebuild the select.options to include the new cat
}

function defineNewCourseStrings(dParam) { //passes an valObj to: createOneCourse()
    var valObj = {};
    var newTimes = "";
    var idx1 = docElId('newhrsone').selectedIndex;
    var newRmB = docElId('newcourseroomB').value;

    valObj.newName = docElId('newcoursename').value;
    valObj.newRm = {};
    valObj.newRm.a = docElId('newcourseroom').value;
    valObj.newCat = docElId('newcoursecat').options[docElId('newcoursecat').selectedIndex].value;
    valObj.newDept = docElId('newcoursedept').options[docElId('newcoursedept').selectedIndex].value;

    newTimes += '' + docElId('newdayone').options[docElId('newdayone').selectedIndex].value + '' + docElId('newhrsone').options[idx1].value + '';

    if (dParam !== "twohour" && dParam !== "threehour") {
        newTimes += ',' + docElId('newdaytwo').options[docElId('newdaytwo').selectedIndex].value + '' + docElId('newhrstwo').options[docElId('newhrstwo').selectedIndex].value;
    }
    if (dParam === "twohour") { newTimes += '-' + (idx1 + 10) + ':50'; }
    if (dParam === "threehour") { newTimes += '-' + (idx1 + 11) + ':50'; }

    valObj.newTimes = newTimes;
    valObj.newName = cleanNumCharsOnly(valObj.newName);
    valObj.newRm.a = cleanAlphaNumericAndDashOnlyChars(valObj.newRm.a);
    newRmB = cleanAlphaNumericAndDashOnlyChars(newRmB);

    if (newRmB !=="" && newRmB !== valObj.newRm.a ) {
        valObj.newRm.b = newRmB; //only create this prop if condition is met
    }
    return valObj;
}

function getNewDayHrMap(dParam) {
    var allowFollow = [];
    var dayHr = [[0, 0], [0, 0]];
    var idx1 = docElId('newhrsone').selectedIndex;
    var idx2 = docElId('newhrstwo').selectedIndex;
    var day1 = docElId('newdayone').selectedIndex;
    var day2 = docElId('newdaytwo').selectedIndex;

    dayHr[0][0] = day1;

    if (dParam === "ninety") {
        dayHr[1][0] = day2;

        if (idx1 % 2 === 1) {
            dayHr[0][1] = (idx1 - 1) / 2;
            allowFollow.push(Boolean(false));
        } else {
            dayHr[0][1] = idx1 / 2;
            allowFollow.push(Boolean(true));
        }
        if (idx2 % 2 === 1) {
            dayHr[1][1] = (idx2 - 1) / 2;
            allowFollow.push(Boolean(false));
        } else {
            dayHr[1][1] = idx2 / 2;
            allowFollow.push(Boolean(true));
        }
    } else {
        dayHr[0][1] = idx1;

        if (dParam === "twohour") {
            dayHr[1][0] = day1;
            dayHr[1][1] = idx1 + 1;
        } else if (dParam === "threehour") {
            dayHr[1][0] = day1;
            dayHr[1][1] = idx1 + 2;
        } else {
            dayHr[1][0] = day2;
            dayHr[1][1] = idx2;
        }
    }
    return [dayHr, allowFollow];
}

function defineNewCourseDuration() {
    if (docElId('durationninety').checked) { return "ninety"; }
    if (docElId('durationtwo').checked) { return "twohour"; }
    if (docElId('durationthree').checked) { return "threehour"; }
    return "onehour";
}

function removeNewCourseArrays() {
    stats.newDepts = [];
    stats.newKlinicDefs = [];
    stats.newCourses = [];
    stats.overwriteCourses = [];

    delete stats.newDepts;
    delete stats.newKlinicDefs;
    delete stats.newCourses;
    delete stats.overwriteCourses;
}

function prepInsertNewCoursesFromCSV() { //...caller: chkCoursesParsed(false);
    var i,
        ii;

    getNewDeptsFromCSV();

    for ( i = stats.newCourses.length - 1; i >= 0; i-- ) { //move dup.s into the overwrites array, and splice them from stats.newCourses: so that only the new courses are left in stats.newCourses
        for ( ii = 0; ii < stats.indexData.courses.length; ii++ ) {
            if (stats.newCourses[i].name === courseData[stats.indexData.courses[ii]].name) {
                stats.overwriteCourses.push(stats.newCourses[i]);
                stats.newCourses.splice(i, 1);
                break; //...out of the nested loop: (ii)
            }
        }
    }
    if (!stats.overwriteCourses.length) {
        insertNewCoursesFromCSV(false);
        return;
    }
    window.mscConfirm({
        title: 'Overwrite courses?',
        subtitle: 'Some of the courses you are attempting to upload have names (IDs) that currently exist. Choose: "Ok" to overwrite the existing courses, or cancel this action.',
        onOk: function () {
            insertNewCoursesFromCSV(true);
        },
        onCancel: function () {
            removeNewCourseArrays();
            return;
        }
    });
}

function deleteCourseNoWarning(cParam) { //removes any trace of a course's existance...
    var domEl,
        i;

    if (!notAssignedChk(cParam)) {
        removeAssignmentViaUI(courseData[cParam].assgn, cParam); //remove any assignment that was set
    }
    stats.indexData.courses.splice(stats.indexData.courses.indexOf(cParam), 1); //...remove course from the index of courses

    domEl = docElId("contain" + cParam);
    emptyContent(domEl);
    domEl.parentNode.removeChild(domEl);

    for ( i = 0; i < stats.catData.length; i++ ) { //courses cannot exist without a category...
        if (stats.catData[i][0] === courseData[cParam].cat) {
            stats.catData[i][1] -= 1;
            stats.catData[i][2][courseData[cParam].dayhr[0][0]][courseData[cParam].dayhr[0][1]] -= 1;
            if (courseData[cParam].cat !=="CLINIC") {
                stats.catData[i][2][courseData[cParam].dayhr[1][0]][courseData[cParam].dayhr[1][1]] -= 1;
            }
            if (courseData[cParam].duration ==="threehour") {
                stats.catData[i][2][courseData[cParam].dayhr[0][0]][courseData[cParam].dayhr[0][1] + 1] -= 1; //middle hour
            }
            break;
        }
    }
    delete courseData[cParam]; //then, and only then: delete from courseData...
}

/***********************CATEGORIES**************************************/
//if a cat name is edited to be identical to that of another cat: instead of disallowing - offer to join the courses under the same cat...
//triggered by: saving changes to cat name in edr-
function mergeCats(catOne, catTwo) {
    var len = stats.indexData.courses.length;
    var catOneIndex,
        catTwoIndex,
        cObjRef,
        i,
        ii;

    for (i = 0; i < len; i++) { //change all courses under catTwo to catOne courses
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cObjRef.cat === catTwo) { cObjRef.cat = catOne; }
    }

    for (i = 0; i < stats.catData.length; i++) { //find the index of both cats...
        if (stats.catData[i][0] === catOne) {
            catOneIndex = i;
        } else if (stats.catData[i][0] === catTwo) {
            catTwoIndex = i;
        }
    }
    if (catOneIndex == undefined) { throw new Error("Internal error: Attempting to read a category that doesn't exist!"); }
    if (catTwoIndex == undefined) { throw new Error("Internal error: Attempting to read a category that doesn't exist!"); }

    stats.catData[catOneIndex][1] += stats.catData[catTwoIndex][1]; //add the values from: catIndex[catTwoIndex][1] && [2] to: catIndex[catOneIndex][1] && [2]

    for (i = 0; i < stats.catData[catOneIndex][2].length; i++) {
        for (ii = 0; ii < stats.catData[catOneIndex][2][i].length; ii++) {
            stats.catData[catOneIndex][2][i][ii] += stats.catData[catTwoIndex][2][i][ii];
        }
    }
    stats.catData[catTwoIndex][0] = '$deleted' + [catTwoIndex + 1] + ''; //disable the catTwo category...but do not delete it as we need to keep the indexes intact during the session

    updateDisplayAllCourses();
    updateAllCatListsOnSchedules(catOne);

    for (i = 0; i < stats.catData.length; i++) {
        showEl('catedt' + [i + 1]);
    }
    showHideEl("catref" + (catOneIndex + 1)); //expand the merged cat:
}

function getErrorsForSaveNewCatName(idx) {
    var errMsg = [
        "Please choose an appropriate name!",
        "\"CLINIC\" is a reserved category name!"
    ];

    window.mscAlert({
        title: '',
        subtitle: errMsg[idx]
    });
    return;
}

function saveNewCatName(catNumber) {
    var ctgryIndex = (Number(catNumber)) - 1;
    var catVal = cleanMultiWsWithSingleWs(cleanDngrChars(docElId("catchg" + catNumber).value));
    var len = stats.indexData.courses.length;
    var frag,
        firstSpan,
        secondSpan,
        recycleSpan,
        newText,
        cObjRef,
        i;

    if (catVal === "") {
        getErrorsForSaveNewCatName(0);
        return;
    }
    if (stats.catData[ctgryIndex] == undefined || Number.isNaN(Number(ctgryIndex))) { return; }
    if (stats.catData[ctgryIndex][0] === catVal) { //the input for klinics should be disabled, so this will be the return for klinics
        hideCatEdit(catNumber);
        return;
    }
    for (i = 0; i < stats.catData.length; i++) {
        if (stats.catData[i][0] === catVal && ctgryIndex !== i) { //if it is the same name, but is not itself
            if (catVal.toLowerCase() === "clinic") {
                getErrorsForSaveNewCatName(1);
                return;
            } else {
                window.mscConfirm({
                    title: 'Merge!',
                    subtitle: 'This action will move courses from: "' + stats.catData[ctgryIndex][0] + '" and place them under: "' + stats.catData[i][0] + '".\nThe category "' + stats.catData[ctgryIndex][0] + '" will be deleted.\nThis action cannot be undone. Proceed?',
                    onOk: function () {
                        mergeCats(stats.catData[i][0], stats.catData[ctgryIndex][0]);
                        return;
                    },
                    onCancel: function () {
                        return;
                    }
                });
                return;
            }
        }
    }

    for (i = 0; i < len; i++) { //change all courseData[i].cat's that bear the old category name...
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cObjRef.cat === stats.catData[ctgryIndex][0]) { cObjRef.cat = '' + catVal; }
    }
    stats.catData[ctgryIndex][0] = '' + catVal; //update the catName in stats.catData and in references...
    emptyContent(docElId('catref' + catNumber));

    frag = document.createDocumentFragment();
    firstSpan = document.createElement("span");
    secondSpan = document.createElement("span");
    recycleSpan = document.createElement("span");
    newText = document.createTextNode(stats.catData[ctgryIndex][0]);

    firstSpan.id = "catedt" + catNumber;
    firstSpan.className = "catedt btn-xs btn-warning pull-left nodisplay";
    firstSpan.textContent = "Edit";
    secondSpan.id = "bldr" + catNumber;
    secondSpan.className = "autobuilder pull-right icon-flash nodisplay";
    recycleSpan.id = "recycle" + catNumber;
    recycleSpan.className = "pull-right recycler icon-recycle";

    frag.appendChild(firstSpan);
    frag.appendChild(newText);
    frag.appendChild(secondSpan);
    frag.appendChild(recycleSpan);
    docElId('catref' + catNumber).appendChild(frag);

    if (Number(stats.catData[ctgryIndex][1]) > 6) { showEl('bldr' + catNumber); }

    docElId("catchg" + catNumber).value = catVal; //reset the input value to match the new name
    hideCatEdit(catNumber); //close editing for this category...
    updateAllCatListsOnSchedules(catVal);
}

function updateAllCatListsOnSchedules(catVal) {
    var len = stats.indexData.courses.length;
    var cObjRef,
        i;

    for (i = 0; i < len; i++) {
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cObjRef.cat === catVal && cObjRef.assgn !== "") { updateCatListOnSchedule(cObjRef.assgn); }
    }
}

function triggerCatDelete(catNumber) {
    var ctgryIndex = (Number(catNumber)) - 1;

    window.mscConfirm({
        title: 'Warning',
        subtitle: 'This action will also delete all courses under the category:\n' + stats.catData[ctgryIndex][0] + '.\nThis action cannot be undone. Proceed?',
        onOk: function () {
            destroyCategory(ctgryIndex);
        },
        onCancel: function () {
            return;
        }
    });
}

function destroyCategory(ctgryIndex) {
    var catName = stats.catData[ctgryIndex][0];
    var i;

    if (stats.catData[ctgryIndex] == undefined || Number.isNaN(Number(ctgryIndex))) { return; } //check the index...

    for (i = stats.indexData.courses.length - 1; i >= 0; i--) { //delete all courses under catName...
        if (stats.catData[ctgryIndex][1] > 0) {
            if (courseData[stats.indexData.courses[i]].cat !== catName) {
                continue;
            }
            deleteCourseNoWarning(stats.indexData.courses[i]);
        } else {
            break;
        }
    }
    if (catName === "CLINIC") { stats.indexData.klinics = []; }

    stats.catData[ctgryIndex][0] = '$deleted' + [ctgryIndex + 1] + ''; //disable the category...but do not delete it as we need to keep the indexes intact! (update the catName in stats.catData)
    disableUIforDeletedCat(ctgryIndex + 1); //empty and hide the div.s...
}

function destroyOneCourse(cParam) {
    window.mscConfirm({
        title: 'Delete course?',
        subtitle: 'Are you sure you want to delete this course?\nThis action cannot be undone!',
        onOk: function () {
            deleteCourseNoWarning(cParam);
        },
        onCancel: function () {
            return;
        }
    });
}

/****************************purge and add courses and categories****************************/

function purgeCoursesAndReset(){
    var len = stats.indexData.schedules.length;
    var i;

    if (len) { //loop through stats.indexData.schedules and recycle each schedule
        for (i = 0; i < len; i++) {
            recycleOneSchedule("reset" + stats.indexData.schedules[i]);
        }
    }
    emptyContent(docElId('references'));
    courseData = {};
    stats.catData = [];
    stats.indexData.courses = [];
}

function purgeAllCourses(){
    window.mscConfirm({
        title: 'Purge?',
        subtitle: 'This action will remove all courses and categories.\nSettings, teachers, departments, groups and clinic definitions will all remain intact.\nThis action cannot be undone! Proceed?',
        onOk: function () {
            purgeCoursesAndReset();
        },
        onCancel: function () {
            return;
        }
    });
}

function removeAssignmentUsingcParam(cParam) {
    if (courseData[cParam].assgn !== "") {
        removeAssignmentViaUI(courseData[cParam].assgn, cParam);
    }
}

function removeAssignmentUsingsParam(elTokens) {
    var sParam = "s" + elTokens[0];
    var cParam;

    if (elTokens[1] !== 0) {
        cParam = "c" + elTokens[1];
        if (scheduleData[sParam].cRef.indexOf(cParam) !== -1) {
            removeAssignmentViaUI(sParam, cParam);
        }
    }
}

function resetDayOff(el) { //reset the dayOff to default after invoking shift+click on a dayOff that has already been set
    var sParam = el.substring(4);
    var clickedTarget = Number(el.substring(3, 4));

    if (clickedTarget !== scheduleData[sParam].dayOff) { return; }

    docElId("off" + clickedTarget + "" + sParam + "").style.color = ""; //reset the color...
    scheduleData[sParam].dayOff = 6; //reset dayoff to default...
}

function setNewDayOff(el) { //In this function, clicking on a triangle redefines which day is a dayOff //for every collision, run: setToggleColors(sParam, cParam, "off");...to show courses removed on the schedule display
    var sParam = clickedDayOff(el);
    var newDayOff = Number(el.substring(3, 4)); //get the new dayOff (which is currently being selected): "off" + "0" + "s1" -> "0"
    var collidedCourses = changeDayOff(sParam, newDayOff); //...returns 'arrayOfCollisions': the course ids of all collisions presented as an array && has already updated scheduleData ++ courseData.
    var i;

    if (collidedCourses.length) {
        for (i = collidedCourses.length-1; i >= 0; i--) {
            toggleColorsOnOff(sParam, collidedCourses[i], "off"); //ii is each cParam from collisions array
            if (courseData[collidedCourses[i]].cat === "CLINIC"){
                deleteCourseNoWarning(collidedCourses[i]);
            }
        }
    }
    updateCatListOnSchedule(sParam);
    checkTooFewCourses(sParam);
}

function rotateToNextAvailableCourse(sParam, dayHrId, currentcParam) { //dayHrId === [0,0] /*********DON'T dry plz!...**********/
    var assgnId,
        courseDataKeyIndex,
        isMatch,
        i;

    stopKlinicInterfering(); //in case we try to assign a clinic on top of an occupied cell
    assgnId = "nada";
    courseDataKeyIndex = stats.indexData.courses.indexOf(currentcParam); //start the search from the index point, and NOT the start of courseData!

    for (i = courseDataKeyIndex; i < stats.indexData.courses.length; i++) {
        if (stats.indexData.courses[i] === currentcParam) { continue; } //ignore the current assignment and proceed to the next index
        if (notAssignedChk(stats.indexData.courses[i])) { //...include only those courses available for assignment
            isMatch = clickedElIsMatch(stats.indexData.courses[i], dayHrId);

            if (isMatch === true) { //...and has the same dayhr as the target
                if (hasSameCategory(sParam, stats.indexData.courses[i]) === true) { //:...and has the same .cat value as at least one other cRef || overridden || has no cRef's at all
                    removeAssignmentViaUI(sParam, currentcParam); //remove the current assignment and update the display
                    makeAssignment(sParam, stats.indexData.courses[i]); //can fail because of collision with other hour || Sat., so:

                    if (!canAssignHereChk(sParam, stats.indexData.courses[i])) { //check that the assignment passed
                        assgnId = stats.indexData.courses[i];
                        return assgnId;
                    } else {
                        makeAssignment(sParam, currentcParam); //put the current assignment back, because the new one failed
                        toggleColorsOnOff(sParam, currentcParam, "on");
                        continue;
                    }
                }
            }
        }
    }
    return assgnId;
}

function clickedElIsMatch(cParam, dayHrId) {
    var isMatch = false;
    var cObjRef = courseData[cParam];
    var middlehr;

    if (cObjRef.duration === "threehour") {
        middlehr = [cObjRef.dayhr[0][0], (cObjRef.dayhr[0][1]) + 1];

        if (middlehr.identical(dayHrId)) { isMatch = true; }
    }
    if ((cObjRef.dayhr[0]).identical(dayHrId) || (cObjRef.dayhr[1]).identical(dayHrId)) { isMatch = true; }

    return isMatch;
}

function fillTimeWithFirstChoice(sParam, dayHrId) { //dayHrId === [0,0] //RUNS WHEN CLICKING ON AN EMPTY CELL ON THE DISPLAY...but only returns the *first* choice...
    var assgnId,
        len,
        statsRef,
        isMatch,
        i;

    stopKlinicInterfering(); //in case we try to assign a clinic on top of an empty cell where we want to assign a regular course
    assgnId = "nada";
    len = stats.indexData.courses.length;

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];

        if (!notAssignedChk(statsRef)) { continue; } //...include only those courses available for assignment
        isMatch = clickedElIsMatch(statsRef, dayHrId);

        if (isMatch !== true) { continue; } //...must be the same dayhr as the target
        if (hasSameCategory(sParam, statsRef) !== true) { continue; } //...must have the same .cat value as at least one other cRef || overridden || has no cRef's at all

        makeAssignment(sParam, statsRef); //can fail because of collision with other hour || is Sat., so:

        if (!canAssignHereChk(sParam, statsRef)) { //check that the assignment passed...
            assgnId = statsRef;
            return assgnId;
        }
    }
    return assgnId;
}

function removeAssignmentViaUI(sParam, cParam) { //can be triggered with shift+click from either the schedule or the course reference
    removeAssignment(sParam, cParam); //removal of a course by clicking on a cell
    toggleColorsOnOff(sParam, cParam, "off");
    updateCatListOnSchedule(sParam);
    checkTooFewCourses(sParam);
}

function fillTimeWithUserSelectedCourse(sParam, cParam) {
    if (!notAssignedChk(cParam)) { return false; }
    if (hasSameCategory(sParam, cParam) === true) { //...and has the same .cat value as at least one other cRef || has no cRef's at all (note: CLINIC always return true from hasSameCategory())
        makeAssignment(sParam, cParam); //can fail because of collision with other hour || is Sat., so:

        if (!canAssignHereChk(sParam, cParam)) { //check that the assignment passed
            return true;
        }
    }
    return false;
}

function setAssignmentViaUI(sParam, cParam) { //triggered with shift+alt+click from the schedule + clicking on a course reference
    var targetsParam = "s" + sParam;
    var canAssign = fillTimeWithUserSelectedCourse(targetsParam, cParam);

    if (canAssign === true) {
        toggleColorsOnOff(targetsParam, cParam, "on");
        updateCatListOnSchedule(targetsParam);
        checkTooFewCourses(targetsParam);
    }
    if (canAssign === false && courseData[cParam].cat === "CLINIC") {
        deleteCourseNoWarning(cParam);
    }
    stats.tempCparam = "";
}

function getCatListForSchedule(sParam) { //append cats to header on a PDF schedule
    var listOfCats = "";
    var assgndCats = [];
    var arrRef = scheduleData[sParam].cRef;
    var cObjRef,
        uniqueCats,
        i;

    if (!arrRef.length) { return ""; } //no cat.s

    for (i = 0; i < arrRef.length; i++) {
        cObjRef = courseData[arrRef[i]];
        if (cObjRef.cat !=="CLINIC") { assgndCats.push(cObjRef.cat); }
    }
    if (!assgndCats.length) { return ""; }

    assgndCats.sort(); //...in the event that a clinic is assigned to the schedule first
    uniqueCats = uniqueValues(assgndCats);
    listOfCats += uniqueCats[0]; //the first unique cat

    for (i = 1; i < uniqueCats.length; i++) {
        listOfCats += ', ' + uniqueCats[i]; //subsequent unique cat.s
    }
    return listOfCats; //returns string
}

function removeScheduleOnMscOk(sParam) {
    var releasedCourses = (scheduleData[sParam].cRef).slice(); //when the reference gets updated, the .cRef's will be gone, so: slice it now!
    var thisSchedule = docElId("" + sParam);
    var i;

    emptyContent(thisSchedule);
    thisSchedule.parentElement.removeChild(thisSchedule); //remove the node and all it's HTML content: child of docElId('schedule-instances')
    destroyOneSchedule(sParam);

    for (i = 0; i < releasedCourses.length; i++) { //update any released courses in the reference section now cRef's are gone
        toggleCourseRef(releasedCourses[i]);
    }
}

function removeScheduleFromDisplay(el) { //triggers: destroyOneSchedule and destroys the displayed schedule //NOTE: this function unloads any assigned courses before the scheduleData is destroyed
    var sParam = el.substring(3); //get the schedule id (which is currently being selected): "del" + "s1" -> "s1"

    window.mscConfirm({
        title: 'Delete schedule?',
        subtitle: 'Are you sure you want to delete this schedule?\nThis action cannot be undone!',
        onOk: function () {
            removeScheduleOnMscOk(sParam);
        },
        onCancel: function () {
            return;
        }
    });
}

function displayNewEmptySchedule(day) {
    var newScheduleId = createOneSchedule(day); //returns a new Id

    newScheduleUI(newScheduleId, day);
    checkTooFewCourses(newScheduleId);
}

function recycleOneSchedule(elId) { //clear all assignments, reset the dayOff and clear any tchr from a schedule
    var sParam = (elId).substring(5); //"resets1" -> "reset" + "s1"
    var idStr,
        i;

    if (scheduleData[sParam].cRef.length) {
        for (i = scheduleData[sParam].cRef.length - 1; i >= 0; i--) { //remember to go backwards...each removeAssignment splices the cRef!
            if (courseData[scheduleData[sParam].cRef[i]].cat === "CLINIC") {
                deleteCourseNoWarning(scheduleData[sParam].cRef[i]);
            } else {
                removeAssignmentViaUI(sParam, scheduleData[sParam].cRef[i]);
            }
        }
    }
    scheduleData[sParam].dayOff = 6;

    for (i = 0; i < 5; i++) { //"i < 5" ALWAYS ASSUME [] Mon to Fri
        idStr = "off" + i + sParam;
        docElId(idStr).style.color = "";
    }
    if (scheduleData[sParam].hasOwnProperty('isSat')) {
        idStr = "off5" + sParam;
        docElId(idStr).style.color = "";
    }
    if (scheduleData[sParam].hasOwnProperty('tchr')) {
        if (scheduleData[sParam].tchr !== "") {
            clearAssgndtchr(sParam);
        }
    }
}

function recycleOneCat(elId) { //clear all assignments for courses under this category...
    var catIndex = Number(elId.substring(7))-1; //"recycle1" -> "recycle" + "1" -> 0
    var cat = stats.catData[catIndex][0];
    var schedulesToClean,
        idStr,
        i;

    if (catExists(cat) !== true) { return; }

    schedulesToClean = [];
    idStr = "courselist" + elId.substring(7);
    docElId(idStr).setAttribute("class", "hide"); //collapse the current cat...

    for (i = stats.indexData.courses.length-1; i >= 0; i--) {
        if (courseData[stats.indexData.courses[i]].cat === cat && courseData[stats.indexData.courses[i]].assgn !== '') {
            schedulesToClean.push(courseData[stats.indexData.courses[i]].assgn);
            if (cat === "CLINIC") { //...don't clear other cat.s sharing the same schedule!
                deleteCourseNoWarning(stats.indexData.courses[i]);
            } else {
                removeAssignmentViaUI(courseData[stats.indexData.courses[i]].assgn, stats.indexData.courses[i]);
            }
        }
    }
    if (schedulesToClean.length) {
        schedulesToClean = uniqueValues(schedulesToClean);
        for (i = 0; i < schedulesToClean.length; i++) {
            if (scheduleData[schedulesToClean[i]].cRef.length === 0) { //...only clear a schedule completely if it's cRef.length === 0 (other cat.s may be sharing the same schedule)
                idStr = "reset" + schedulesToClean[i];
                recycleOneSchedule(idStr);
            }
        }
    }
}

function checkTooFewCourses(sParam) { //recolor undersubscribed schedules
    var thisStyle = docElId("" + sParam);

    if (!scheduleData[sParam].cRef.length) {  //e.g. (6 * 2) = 12
        thisStyle.style.borderColor = "#3498db";
        thisStyle.style.color = "#3498db";
        thisStyle.firstChild.style.fontWeight = "700";
        return;
    }
    //e.g. (5 * 2) = 10, but: (4 * 2) + (1 * 3) = 11...contains a threehour or ninety min. course and should therefore be marked as complete
    if (calculateHrsForMaxHrsChk(sParam) < stats.settings.maxHours - 1 ) {
        thisStyle.style.borderColor = "#3498db";
        thisStyle.style.color = "#3498db";
        thisStyle.firstChild.style.fontWeight = "700";
    } else {
        thisStyle.style.borderColor = "";
        thisStyle.style.color = "";
        thisStyle.firstChild.style.fontWeight = "700";
    }
}

/*********IMPORTANT: Editor can't change cat. or duration of course! Use: delete and create new course****************/

function setEditingDefaultVals(cParam) {
    var cObjRef = courseData[cParam];
    var depart,
        i;

    if (cObjRef.cat === "CLINIC") { return; }

    depart = docElId("edrdept-" + cParam); //default selectedIndexes

    for (i = 0; i < depart.options.length; i++) {
        if (cObjRef.dept === depart.options[i].value) {
            depart.selectedIndex = i;
            break;
        }
    }
    docElId("edrday1-" + cParam).selectedIndex = cObjRef.dayhr[0][0];
    docElId("edrday2-" + cParam).selectedIndex = cObjRef.dayhr[1][0];

    if (cObjRef.duration === "ninety") {
        if (cObjRef.allowFollow[0] === false) {
            if (docElId("edrstart1-" + cParam).options.length > ((cObjRef.dayhr[0][1]) * 2) + 1) {
                docElId("edrstart1-" + cParam).selectedIndex = ((cObjRef.dayhr[0][1]) * 2) + 1;
            } else {
                docElId("edrstart1-" + cParam).selectedIndex = docElId("edrstart1-" + cParam).options.length - 1;
            }
        } else {
            docElId("edrstart1-" + cParam).selectedIndex = (cObjRef.dayhr[0][1]) * 2;
        }

        if (cObjRef.allowFollow[1] === false) {
            if (docElId("edrstart2-" + cParam).options.length > ((cObjRef.dayhr[1][1]) * 2) + 1) {
                docElId("edrstart2-" + cParam).selectedIndex = ((cObjRef.dayhr[1][1]) * 2) + 1;
            } else {
                docElId("edrstart2-" + cParam).selectedIndex = docElId("edrstart2-" + cParam).options.length - 1;
            }
        } else {
            docElId("edrstart2-" + cParam).selectedIndex = (cObjRef.dayhr[1][1]) * 2;
        }
    } else {
        docElId("edrstart1-" + cParam).selectedIndex = cObjRef.dayhr[0][1];
        docElId("edrstart2-" + cParam).selectedIndex = cObjRef.dayhr[1][1];
    }
    showEditingControls(cParam);
}

function isSameDayHrSelected(cParam) {
    var cObjRef = courseData[cParam];
    var geniusChk;

    if (cObjRef.duration === "twohour" || cObjRef.duration === "threehour") { return false; } //in case user accidentally selects the same dayhr twice...

    geniusChk = [[], []];
    geniusChk[0].push(docElId("edrday1-" + cParam).selectedIndex);
    geniusChk[1].push(docElId("edrday2-" + cParam).selectedIndex);

    if (cObjRef.duration === "ninety") {
        geniusChk[0].push(Math.floor(docElId("edrstart1-" + cParam).selectedIndex) / 2);
        geniusChk[1].push(Math.floor(docElId("edrstart2-" + cParam).selectedIndex) / 2);
    } else {
        geniusChk[0].push(docElId("edrstart1-" + cParam).selectedIndex);
        geniusChk[1].push(docElId("edrstart2-" + cParam).selectedIndex);
    }
    if (geniusChk[0].identical(geniusChk[1])) {
        return true;
    }
    return false;
}

function reAssignAfterChange(sParam, cParam) { //Recheck an ASSIGNED course after it's parameters have been changed manually...
    if (courseData[cParam].cat === "CLINIC") { return; }
    if (sParam === "") { return; }

    makeAssignment(sParam, cParam); //try to assign it again. If it fails, then it is because a check in makeAssignment failed //...if assignment passed again, update the display

    if (!canAssignHereChk(sParam, cParam)) { //is the course assigned here? true if not assigned here, false if already assigned here
        toggleColorsOnOff(sParam, cParam, "on");
        updateCatListOnSchedule(sParam);
        checkTooFewCourses(sParam, cParam);
    }
}

function prepUI() {
    updateSettingsUI();
    populateNewCourseOpts();
    displayAllCourseRefs();
    createStatsGrid("stats-grid", "g_d");
    createStatsGrid("klinics-grid", "gk_d");
}

function loadStateFromData(bool) {
    var stsRef,
        sOrcObjRef,
        i;

    hideEl('parsing');
    prepUI(); //loads the courses and settings

    for (i = 0; i < stats.indexData.schedules.length; i++) { //...loading blank schedules from the stats to the UI
        stsRef = stats.indexData.schedules[i];
        sOrcObjRef = scheduleData[stsRef];

        if (sOrcObjRef.hasOwnProperty('isSat')) {
            newScheduleUI(stsRef, 'Sat');
        } else {
            newScheduleUI(stsRef, 'MtoF');
        }
    }
    if (bool === true) { //loop through courses in courseData, add selected classes +set textContent of course and schedule cells (if assgnd!!)
        for (i = 0; i < stats.indexData.courses.length; i++) {
            stsRef = stats.indexData.courses[i];
            sOrcObjRef = courseData[stsRef];

            if (sOrcObjRef.assgn !== "") { toggleColorsOnOff(sOrcObjRef.assgn, stsRef, "init"); }
        }
        for (i = 0; i < stats.indexData.schedules.length; i++) { //view dayOffs if set previously
            stsRef = stats.indexData.schedules[i];
            sOrcObjRef = scheduleData[stsRef];
            updateCatListOnSchedule(stsRef);

            if (sOrcObjRef.dayOff !== 6) { //view dayOffs if set previously
                docElId("off" + sOrcObjRef.dayOff + "" + stsRef + "").style.color = "#2c3e50";
            }
            if (sOrcObjRef.hasOwnProperty('tchr')) { //view tchrAssignments if set previously
                if (sOrcObjRef.tchr !== "") {
                    docElId('tchrset' + stsRef).textContent = sOrcObjRef.tchr;
                }
            }
        }
        updateSettingsInputVals();
        setOverrideControls();
    }
    for (i = 0; i < stats.indexData.schedules.length; i++) { //set backgroundColor...
        checkTooFewCourses(stats.indexData.schedules[i]);
    }
    displayUpdatedKlinicBtns(); //checks for stats.indexData.klinics.length; if cat "CLINIC" doesn't exist, it is created
}

function populateNewCourseOpts() { //populate select.options cat and dept from stats..
    populateNewCourseCats();
    populateNewCourseDepts();
    populateClassTimes("onehour"); //default
}

/*********EDITING SETTINGS MODAL***********/

function chkDeptGrpsAfterEdit() {
    var allDepartments,
        i;

    if (stats.settings.deptGrps.length) {
        allDepartments = [];

        for (i = 0; i < stats.indexData.depts.length; i++ ) { //flattened...so as to compare using .identical()
            allDepartments.push(stats.indexData.depts[i].shortcode);
        }
        for (i = (stats.settings.deptGrps.length) - 1; i >= 0; i--) { //strip out empty arrays: i.e. [[],[],[]]...
            if (isObjEmpty(stats.settings.deptGrps[i])) {
                stats.settings.deptGrps.splice(i, 1);
            } else if (allDepartments.identical((stats.settings.deptGrps[i]).sort())) { //strip out any nested array that includes all department groups...
                stats.settings.deptGrps.splice(i, 1);
            }
        }
    }
    if (stats.settings.deptGrps.length) { //make sure the override is off!
        stats.settings.overrides.deptGrps = false;
    } else { //turn the override on...
        stats.settings.overrides.deptGrps = true;
    }
    docElId('newgroupid').dataset.grpindex = stats.settings.deptGrps.length; //the dataset-grpIndex must be === .length on close!
}

function openSettings() {
    getAllDeptsOnUI();
    rebuildDeptGrpString();
    hideEl('displayOverrides');
    hideEl('left');
    hideEl('right');
    initSettingsListeners();
}

/***************************EDITING COURSES triggers***************************/

function populateNewCourseNameInputs(arr) {
    var cRefFound,
        i;

    for (i = arr.length - 1; i >= 0; i--) { //replace "oldVal" with its cParam, if it doesn't exist: splice the index from arr
        cRefFound = findcRefByCourseName(arr[i][0]);
        //NOTE: clinics can cause cRefFound to return undefined...
        //so, checking that the following is correctly skipping these from being added to "arr"
        //:if any 'arr[i][0] == undefined' makes it through to the "populate the input boxes" loop, then the upload will throw an error and stop
        if( cRefFound == undefined ){ continue; }

        arr[i][0] = cRefFound; //[["oldVal","newVal"],["oldVal","newVal"]...] -> [["cParam","newVal"],["cParam","newVal"]...]
    }
    //populate the input boxes... //if there is an initial error in a received csv then this would fail: it should ignore the element and keep going
    for( i = 0; i < arr.length; i++) {
        try {
            docElId("newName-" + arr[i][0]).value = arr[i][1];
        }
        catch(e) {
            continue;
        }
    }
}

function chkNewCourseValue(newVal) {
    var len = stats.indexData.courses.length;
    var statsRef,
        idStr,
        i;

    for (i = 0; i < len; i++) { //if an element of duplicatesArr already exists as another course name...
        statsRef = stats.indexData.courses[i];

        if (newVal === courseData[statsRef].name) { //and if that other course name is itself not being overwritten...(given that there are no dup.s in the values themselves)
            idStr = "newName-" + statsRef;
            if (docElId(idStr).value === "") { return false; }
        }
    }
    return true;
}

function errorsForVerifyNewCourseNames(idx, cName) {
    var errMsg = [
        "The new name for course: " + cName + " must be a four digit number.",
        "The course name: " + cName + "\nbelongs to another existing course!\nNew course names cannot be duplicates of existing course names.",
        "Please check that each course has a new unique name.\nSome new course names are being duplicated."
    ];

    window.mscAlert({
        title: '',
        subtitle: errMsg[idx]
    });
    return;
}

function verifyNewCourseNames() { //on click of #savenewCNames...
    var someBlanks = false;
    var duplicatesArr = [];
    var len = stats.indexData.courses.length;
    var statsRef,
        newVal,
        chkNewVal,
        uniqueNewNames,
        i;

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];

        if (courseData[statsRef].cat === "CLINIC") { continue; }

        newVal = docElId("newName-" + statsRef).value;

        if (newVal === "") {
            someBlanks = true;
        } else if (newVal !== "" && (newVal.length !== config.courseNameNumLength || Number(newVal) < 1 || Number.isNaN(Number(newVal)))) {
            errorsForVerifyNewCourseNames(0, courseData[statsRef].name);
            return;
        } else {
            chkNewVal = chkNewCourseValue(newVal); //returns false (if duplicate of existing course name)

            if (chkNewVal !== true) {
                errorsForVerifyNewCourseNames(1, newVal);
                return;
            } else {
                duplicatesArr.push(newVal);
            }
        }
    }
    duplicatesArr.sort();
    uniqueNewNames = uniqueValues(duplicatesArr);

    if (duplicatesArr.length !== uniqueNewNames.length) {
        errorsForVerifyNewCourseNames(2);
        return;
    }
    if (someBlanks !== true) {
        changeAllCourseNames();
        return;
    }
    window.mscConfirm({
        title: '',
        subtitle: 'Some fields have been left blank.\nCourses with blank fields will not be renamed.\nContinue?',
        cancelText: 'Cancel',
        onOk: function () {
            changeAllCourseNames();
        },
        onCancel: function () {
            return;
        }
    });
}

function changeAllCourseNames() {
    var len = stats.indexData.courses.length;
    var cObjRef,
        statsRef,
        newVal,
        i;

    for (i = 0; i < len; i++) { //update the names of courses (if not blank)
        statsRef = stats.indexData.courses[i];
        cObjRef = courseData[statsRef];

        if (cObjRef.cat === "CLINIC") { continue; }
        newVal = docElId("newName-" + statsRef).value;

        if (newVal === "") { continue; }
        cObjRef.name = newVal;

        if (cObjRef.assgn !== "") { //update the textContent of courses already assigned to schedules
            toggleColorsOnOff(cObjRef.assgn, statsRef, "off");
            toggleColorsOnOff(cObjRef.assgn, statsRef, "on");
        }
        rebuildcReference(statsRef); //update the textContent of the course in references
    }
    closeRenamingCourses();
}

function calculateBuildSize(buildSize, satBuildSize) { //stats.settings.maxHours default = 12 //ALWAYS ASSUME [] Mon to Fri
    buildSize = (Math.ceil((Math.ceil(buildSize) - Math.ceil(satBuildSize)) / (Number(stats.settings.maxHours) / 2))) + 1; //(all hours - Sat. hours)
    satBuildSize = (Math.ceil(satBuildSize / (Number(stats.settings.maxHours) / 2))) + 1;
    return [buildSize, satBuildSize];
}

function countExistingSchedules() {
    var monToFriCount = 0;
    var satCount = 0;
    var len = stats.indexData.schedules.length;
    var statsRef,
        i;

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.schedules[i];

        if (scheduleData[statsRef].hasOwnProperty("isSat")) {
            satCount++;
        } else {
            monToFriCount++;
        }
    }
    return [monToFriCount, satCount];
}

function defineInitBlankSchedules(bool) { //true = the initial setup, false = additional new courses via csv //ALWAYS ASSUME [] Mon to Fri
    var buildSize = 0;
    var satBuildSize = 0;
    var returnVals =[];
    var noOfExistingMonToFri,
        noOfExistingSat,
        i;

    for (i = 0; i < stats.catData.length; i++) {
        buildSize += stats.catData[i][1];
        satBuildSize += stats.catData[i][2][5].reduce(function (a, b) { return a + b; }, 0);
    }
    returnVals = calculateBuildSize(buildSize, satBuildSize); // provides the information from catData //createOneSchedule() defines a scheduleData record and populates: stats.indexData.schedules

    if (bool === true) {
        if (returnVals[0] > 0) {
            for (i = 0; i < returnVals[0]; i++) {
                createOneSchedule('MtoF'); //returns a new Id: we don't need it here
            }
        }
        if (returnVals[1] > 0) {
            for (i = 0; i < returnVals[1]; i++) {
                createOneSchedule('Sat'); //returns a new Id: we don't need it here
            }
        }
        return;
    }
    noOfExistingMonToFri = (returnVals[0] - 1) - countExistingSchedules[0]; //calculate the no. of new schedules we should add to the no. that already exist
    noOfExistingSat = (returnVals[1] - 1) - countExistingSchedules[0];

    if (noOfExistingMonToFri > 0) {
        for (i = 0; i < noOfExistingMonToFri; i++) {
            createOneSchedule('MtoF'); //returns a new Id: we don't need it here
        }
    }
    if (noOfExistingSat > 0) {
        for (i = 0; i < noOfExistingSat; i++) {
            createOneSchedule('Sat'); //returns a new Id: we don't need it here
        }
    }
}

function setCssScheduleRowPixelHeight() { //sets the correct schedule height and appends a <style> tag to head of html
    var height = 65 + (config.scheduleRowPixelHeight * (config.uiScheduleNumOfHrsPerDay + 1)); //+ 1 is for the dayOff pointer
    var heightShowTchr = 25 + (65 + (config.scheduleRowPixelHeight * (config.uiScheduleNumOfHrsPerDay + 1)));
    var cssStr = "#schedule-instances>div{min-height:" + height + "px;height:" + height + "px;max-height:" + height + "px;} #schedule-instances>div.show-teacher{min-height:" + heightShowTchr + "px;height:" + heightShowTchr + "px;max-height:" + heightShowTchr + "px;}";
    var el = document.createElement('style');

    el.type = 'text/css';

    if (el.styleSheet) {
        el.styleSheet.cssText = cssStr;
    } else {
        el.appendChild(document.createTextNode(cssStr));
    }
    document.getElementsByTagName("head")[0].appendChild(el);
}

function setScheduleInputDefaultValues() {
    docElId("hrsPerSchedule").value = "" + config.maxHours;
    docElId("hrsPerSchedule").max = "" + (config.uiScheduleNumOfHrsPerDay * 5);
    docElId("hrsPerDay").value = "" + config.maxHrsPerDay;
    docElId("hrsPerDay").max = "" + config.uiScheduleNumOfHrsPerDay;
}

function initCoreApp() {
    setCssScheduleRowPixelHeight();
    setScheduleInputDefaultValues();
    initCsvUpdateHdrs();
    initLoadListeners();
}

//STATS BUILD

/****************INITIAL STATS FROM CSV DATA OBJECT*******************/
function groupStatsArr(catsHrs) { //group catsHrs arr into nested arrays of 3 elements
    var arrCatsHrs = catsHrs.map(function (e, i) {
        return i % 3 === 0 ? catsHrs.slice(i, i + 3) : null;
    }).filter(function (e) {
        return e;
    });
    return arrCatsHrs;
}

function finishBuildStats(catsHrs, indexKeys, hasPassedChks) { //stats = { "catData": [], "indexData": { "courses": [], "schedules": [], "klinics": [], "depts": [] }, "settings": { ..., "overrides":{...} } };
    stats.catData = groupStatsArr(catsHrs);
    stats.indexData = {};
    stats.indexData.courses = indexKeys; //built (already sorted)
    stats.indexData.schedules = []; //will be built (already sorted) through: defineInitBlankSchedules()
    stats.indexData.depts = getUniqueDepartments();

    if (Array.isArray(hasPassedChks) === true) {
        stats.indexData.klinics = hasPassedChks;
    } else {
        stats.indexData.klinics = [];
    }
    stats.teachers = [];
    stats.tempCparam = '';
    stats.tempKlinic = {kbtn: "", isHeld: false};
    stats.lastSearchItem = "";
    stats.settings = {
        maxHours: config.maxHours,
        maxHrsPerDay: config.maxHrsPerDay,
        maxSeqHrs: 3,
        deptGrps: [[]],
        deptGrpsSetBy: "day",
        overrides: {
            maxHours: false,
            maxHrsPerDay: false,
            maxSeqHrs: false,
            deptGrps: true,
            multiCats: false
        }
    };
    stats.settings.deptGrps = [];
}

function buildStats() {
    var catsHrs = [];
    var indexKeys = [];
    var hasPassedChks = preFlightBuildStats();
    var cObjRef,
        uiArr;

    if (hasPassedChks === false) { return; }
    try {
        Object.keys(courseData).forEach(function (key) {
            indexKeys.push("" + key);
            cObjRef = courseData[key];

            if (catsHrs.indexOf(cObjRef.cat) === -1) {
                catsHrs.push(cObjRef.cat);
                catsHrs.push(1);
                uiArr = buildDefaultScheduleUiArr(0);
                catsHrs.push(uiArr);
                catsHrs[catsHrs.indexOf(cObjRef.cat) + 2][cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1]] += 1;

                if (cObjRef.cat !== "CLINIC") { catsHrs[catsHrs.indexOf(cObjRef.cat) + 2][cObjRef.dayhr[1][0]][cObjRef.dayhr[1][1]] += 1; }
                if (cObjRef.duration === "threehour") { catsHrs[catsHrs.indexOf(cObjRef.cat) + 2][cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1] + 1] += 1; } //middle hour
            } else {
                catsHrs[catsHrs.indexOf(cObjRef.cat) + 1] += 1;
                catsHrs[catsHrs.indexOf(cObjRef.cat) + 2][cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1]] += 1;

                if (cObjRef.cat !== "CLINIC") { catsHrs[catsHrs.indexOf(cObjRef.cat) + 2][cObjRef.dayhr[1][0]][cObjRef.dayhr[1][1]] += 1; }
                if (cObjRef.duration === "threehour") { catsHrs[catsHrs.indexOf(cObjRef.cat) + 2][cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1] + 1] += 1; } //middle hour
            }
        });
        finishBuildStats(catsHrs, indexKeys, hasPassedChks);
        defineInitBlankSchedules(true); //defines & populates: scheduleData and stats.indexData.schedules
        loadStateFromData(false); //false: starting with defaults only
        //hideEl("loadingScreen");
    }
    catch (e) {
        stats = {};
        courseData = {};
        scheduleData = {};
        //hideEl("loadingScreen");
        resetTheWholeUI();
        window.mscAlert({
            title: 'Error',
            subtitle: 'The .csv file you have supplied contains unexpected formatting and/or data.'
        });
        return;
    }
    exitParsingScreen(); //keep this here: as we are only uploading the csv from the start screen
}

function sumCatDataHrs() {
    var len = stats.catData.length;
    var catsSum = buildDefaultScheduleUiArr(0);
    var catsAssigned = buildDefaultScheduleUiArr(0);
    var catsNOTassigned = buildDefaultScheduleUiArr(0);
    var cObjRef,
        catRef,
        i,
        ii,
        iii;

    for (i = 0; i < len; i++) {
        catRef = stats.catData[i];

        if (catRef[0] === "CLINIC") { continue; }
        if (catRef[0].substring(0, 8) === "$deleted") { continue; }

        for (ii = 0; ii < catRef[2].length; ii++) { //all hours
            for (iii = 0; iii < catRef[2][ii].length; iii++) {
                catsSum[ii][iii] += catRef[2][ii][iii];
            }
        }
        for (ii = 0; ii < stats.indexData.courses.length; ii++) { //unassigned hours
            cObjRef = courseData[stats.indexData.courses[ii]];

            if (cObjRef.cat === catRef[0] && cObjRef.assgn === "") {
                catsNOTassigned[cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1]] += 1;
                catsNOTassigned[cObjRef.dayhr[1][0]][cObjRef.dayhr[1][1]] += 1;
                if (cObjRef.duration === "threehour") {
                    catsNOTassigned[cObjRef.dayhr[1][0]][cObjRef.dayhr[1][1] + 1] += 1;
                }
            }
        }
    }
    for (i = 0; i < catsAssigned.length; i++) { //the difference
        for (ii = 0; ii < catsAssigned[i].length; ii++) {
            catsAssigned[i][ii] = catsSum[i][ii] - catsNOTassigned[i][ii];
        }
    }
    return [catsAssigned, catsNOTassigned];
}

function sumKlinicDataHrs() {
    var len = stats.catData.length;
    var klinicSum = buildDefaultScheduleUiArr(0);
    var catRef,
        i,
        ii,
        iii;

    for (i = 0; i < len; i++) {
        catRef = stats.catData[i];
        if (catRef[0] !== "CLINIC") { continue; }

        for (ii = 0; ii < catRef[2].length; ii++) {
            for (iii = 0; iii < catRef[2][ii].length; iii++) {
                klinicSum[ii][iii] += catRef[2][ii][iii];
            }
        }
    }
    return klinicSum;
}

function populateGridStats() {
    var catStats = sumCatDataHrs(); //catStats[0] = catsAssigned, catStats[1] = catsNOTassigned
    var klinicStats = sumKlinicDataHrs();
    var elId,
        i,
        ii;

    for (i = 0; i < catStats[0].length; i++) {
        for (ii = 0; ii < catStats[0][i].length; ii++) {
            elId = "g_d" + i + "t" + ii;
            docElId(elId).textContent = catStats[0][i][ii];

            if (catStats[1][i][ii] > 0) { docElId(elId).textContent += " (" + catStats[1][i][ii] + ")"; }
        }
    }
    for (i = 0; i < klinicStats.length; i++) {
        for (ii = 0; ii < klinicStats[i].length; ii++) {
            elId = "gk_d" + i + "t" + ii;
            docElId(elId).textContent = klinicStats[i][ii];
        }
    }
}

function defineTimeArrForCreateStatsGrid() {
    var timeArr = [];
    var arrLen = config.uiScheduleNumOfHrsPerDay;
    var hr,
        i;

    for (i = 0; i < arrLen; i++) { //ALWAYS ASSUME COURSES START ON THE HOUR
        hr = config.uiTimeInputStartHr + i;
        timeArr.push("" + hr + ":00");
    }
    return timeArr;
}

function createStatsGrid(containerId, elId) {
    var timeArr = defineTimeArrForCreateStatsGrid();
    var monToSat = config.monToSatKr;
    var container = docElId(containerId);
    var frag = document.createDocumentFragment();
    var tbl = document.createElement("TABLE");
    var tHed = document.createElement("THEAD");
    var tBdy = document.createElement("TBODY");
    var tr1 = document.createElement("TR");
    var td1 = document.createElement("TD");
    var tr,
        td,
        elId,
        i,
        ii;

    emptyContent(container);

    tbl.className = "table table-bordered table-condensed";
    tr1.className = "unbordered";
    tr1.appendChild(td1);

    for (i = 0; i < monToSat.length; i++) {
        td = document.createElement("TD");
        td.textContent = monToSat[i];
        tr1.appendChild(td);
    }
    tBdy.appendChild(tr1);

    for (i = 0; i < timeArr.length; i++) {
        tr = document.createElement("TR");

        for (ii = 0; ii <= monToSat.length; ii++) {
            td = document.createElement("TD");

            if (ii === 0) {
                td.className = "unbordered text-right";
                td.textContent = timeArr[i] + "\u00A0\u00A0";
            } else {
                td.id = "" + elId + (ii-1) + "t" + i;
            }
            tr.appendChild(td);
        }
        tBdy.appendChild(tr);
    }
    tbl.appendChild(tHed);
    tbl.appendChild(tBdy);
    frag.appendChild(tbl);
    container.appendChild(frag);
}

function getCourseStatsByCat(cat) {
    var assignedSum = 0;
    var catSum = 0;
    var catStr = "";
    var cObjRef;
    var len = stats.indexData.courses.length;
    var i;

    for (i = 0; i < len; i++) {
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cat !== cObjRef.cat ) { continue; }
        if (cObjRef.assgn !== "" ) {
            assignedSum++;
        }
        catSum++;
    }
    if (catSum - assignedSum > 0) {
        catStr += cat + ": " + assignedSum + " (" + (catSum - assignedSum) + ")\n";
    } else {
        catStr += cat + ": " + assignedSum + "\n";
    }
    return catStr;
}

function getKlinicStatsByDefinition() {
    var klinicDefs = []; //{"name": "", "count": 0}
    var klinicStr = "";
    var len = stats.indexData.courses.length;
    var kLen = stats.indexData.klinics.length;
    var cObjRef,
        kObj,
        kIdx,
        i;

    for (i = 0; i < kLen; i++) {
        kObj = {};
        kObj.name = stats.indexData.klinics[i].name;
        kObj.count = 0;
        klinicDefs.push(kObj);
    }
    for (i = 0; i < len; i++) {
        cObjRef = courseData[stats.indexData.courses[i]];
        if (cObjRef.cat !== "CLINIC") { continue; }

        kIdx = klinicDefs.map(function(el) { return el.name; }).indexOf(cObjRef.name);
        if (kIdx !== -1) {
            klinicDefs[kIdx].count += 1;
        }
    }
    for (i = 0; i < klinicDefs.length; i++) {
        klinicStr += klinicDefs[i].name + ": " + klinicDefs[i].count + "\n";
    }
    return klinicStr;
}

function populateCatStats() {
    var catStr = "";
    var len = stats.catData.length;
    var i;

    for (i = 0; i < len; i++) {
        if (stats.catData[i][0].substring(0, 8) === "$deleted") { continue; }
        if (stats.catData[i][0] === "CLINIC") { continue; }

        catStr += getCourseStatsByCat(stats.catData[i][0]);
    }
    docElId("coursesByCat").textContent = catStr;
    docElId("coursesByDef").textContent = getKlinicStatsByDefinition() || "";
}

function viewStats() {
    populateGridStats();
    populateCatStats();
    showStats();
}

//EVENT LISTENERS

function initCsvUpdateHdrs() {
    docElId("updateHdrsA").addEventListener("click", toggleUpdateCsvA, { capture: false, passive: true });
    docElId("updateHdrsB").addEventListener("click", toggleUpdateCsvB, { capture: false, passive: true });
}

function initLoadListeners() {
    docElId('csv-file').addEventListener('change', handleCourseFile, { capture: false, passive: true });
    docElId('json-file').addEventListener('change', handleJSONFile, { capture: false, passive: true });
    docElId('configStartHr').addEventListener('change', changeConfigAtParsingScreen, { capture: false, passive: true });
    docElId('savedsession').addEventListener('click', chkLocalStorage, { capture: false, passive: true });
    docElId('newsession').addEventListener('click', fromScratch, { capture: false, passive: true });
    docElId('helpfileA').addEventListener('click', showInfoA, { capture: false, passive: true });
    docElId('helpfile1').addEventListener('click', hideInfoA, { capture: false, passive: true });
}

function removeLoadListeners() {
    docElId('csv-file').removeEventListener('change', handleCourseFile, { capture: false, passive: true });
    docElId('json-file').removeEventListener('change', handleJSONFile, { capture: false, passive: true });
    docElId('configStartHr').removeEventListener('change', changeConfigAtParsingScreen, { capture: false, passive: true });
    docElId('savedsession').removeEventListener('click', chkLocalStorage, { capture: false, passive: true });
    docElId('newsession').removeEventListener('click', fromScratch, { capture: false, passive: true });
    docElId('helpfileA').removeEventListener('click', showInfoA, { capture: false, passive: true });
    docElId('helpfile1').removeEventListener('click', hideInfoA, { capture: false, passive: true });
}

function initNewCourseListeners() {
    docElId('deptEDIT').addEventListener('click', findInDepts, { capture: false, passive: true });
    docElId('deptEDIT-file').addEventListener('change', handleDeptsFile, { capture: false, passive: true });
    docElId('csv-freshfile').addEventListener('change', handleAddedCourses, { capture: false, passive: true });
    docElId('deptopenL').addEventListener('click', showEDITdepts, { capture: false, passive: true });
    docElId('save-deptEDIT').addEventListener('click', saveUpdatedDepts, { capture: false, passive: true });
    docElId('deptEDITadd').addEventListener('click', newBlankDept, { capture: false, passive: true });
    docElId('exit-deptEDIT').addEventListener('click', exitEDITdepts, { capture: false, passive: true });
    docElId('newcourseform').addEventListener('click', findInMakeNewCourse, { capture: false, passive: true });
    docElId('newcoursename').addEventListener('input', inputCourseCode, { capture: false, passive: true });
    docElId('newcourseroom').addEventListener('input', inputRmNum, { capture: false, passive: true });
    docElId('durationone').addEventListener('click', durationone, { capture: false, passive: true });
    docElId('durationninety').addEventListener('click', durationninety, { capture: false, passive: true });
    docElId('durationtwo').addEventListener('click', durationtwo, { capture: false, passive: true });
    docElId('durationthree').addEventListener('click', durationthree, { capture: false, passive: true });
}

function removeNewCourseListeners() {
    docElId('deptEDIT').removeEventListener('click', findInDepts, { capture: false, passive: true });
    docElId('deptEDIT-file').removeEventListener('change', handleDeptsFile, { capture: false, passive: true });
    docElId('csv-freshfile').removeEventListener('change', handleAddedCourses, { capture: false, passive: true });
    docElId('deptopenL').removeEventListener('click', showEDITdepts, { capture: false, passive: true });
    docElId('save-deptEDIT').removeEventListener('click', saveUpdatedDepts, { capture: false, passive: true });
    docElId('deptEDITadd').removeEventListener('click', newBlankDept, { capture: false, passive: true });
    docElId('exit-deptEDIT').removeEventListener('click', exitEDITdepts, { capture: false, passive: true });
    docElId('newcourseform').removeEventListener('click', findInMakeNewCourse, { capture: false, passive: true });
    docElId('newcoursename').removeEventListener('input', inputCourseCode, { capture: false, passive: true });
    docElId('newcourseroom').removeEventListener('input', inputRmNum, { capture: false, passive: true });
    docElId('durationone').removeEventListener('click', durationone, { capture: false, passive: true });
    docElId('durationninety').removeEventListener('click', durationninety, { capture: false, passive: true });
    docElId('durationtwo').removeEventListener('click', durationtwo, { capture: false, passive: true });
    docElId('durationthree').removeEventListener('click', durationthree, { capture: false, passive: true });
}

function initTchrListeners() {
    docElId('exit-tchrs').addEventListener('click', exitUpdateTchrs, { capture: false, passive: true });
    docElId('save-tchrs').addEventListener('click', saveUpdatedTchrs, { capture: false, passive: true });
    docElId('alltchrs').addEventListener('click', findInTchrs, { capture: false, passive: true });
    docElId('tchrs-file').addEventListener('change', handleTeacherFile, { capture: false, passive: true });
    docElId('tchradd').addEventListener('click', newBlankTchr, { capture: false, passive: true });
}

function removeTchrListeners() {
    docElId('exit-tchrs').removeEventListener('click', exitUpdateTchrs, { capture: false, passive: true });
    docElId('save-tchrs').removeEventListener('click', saveUpdatedTchrs, { capture: false, passive: true });
    docElId('alltchrs').removeEventListener('click', findInTchrs, { capture: false, passive: true });
    docElId('tchrs-file').removeEventListener('change', handleTeacherFile, { capture: false, passive: true });
    docElId('tchradd').removeEventListener('click', newBlankTchr, { capture: false, passive: true });
}

function initKlinicListeners() {
    docElId('exitklinicchanges').addEventListener('click', exitUpdateKlinics, { capture: false, passive: true });
    docElId('saveklinicchanges').addEventListener('click', saveUpdatedKlinics, { capture: false, passive: true });
    docElId('klinic-section').addEventListener('click', findInKlinics, { capture: false, passive: true });
    docElId('klinicadd').addEventListener('click', newBlankKlinic, { capture: false, passive: true });
}

function removeKlinicListeners() {
    docElId('exitklinicchanges').removeEventListener('click', exitUpdateKlinics, { capture: false, passive: true });
    docElId('saveklinicchanges').removeEventListener('click', saveUpdatedKlinics, { capture: false, passive: true });
    docElId('klinic-section').removeEventListener('click', findInKlinics, { capture: false, passive: true });
    docElId('klinicadd').removeEventListener('click', newBlankKlinic, { capture: false, passive: true });
}

function initStatsListener() {
    docElId('exit-stats').addEventListener('click', hideStats, { capture: false, passive: true });
}

function removeStatsListener() {
    docElId('exit-stats').removeEventListener('click', hideStats, { capture: false, passive: true });
}

function tchrShowToggleOn() {
    docElId('showteachers').removeEventListener('click', hideTchrsForEditing, { capture: false, passive: true });
    docElId('showteachers').addEventListener('click', showTchrsForEditing, { capture: false, passive: true });
    docElId('showteachers').textContent = 'Show';
}

function tchrShowToggleOff() {
    docElId('showteachers').removeEventListener('click', showTchrsForEditing, { capture: false, passive: true });
    docElId('showteachers').addEventListener('click', hideTchrsForEditing, { capture: false, passive: true });
    docElId('showteachers').textContent = 'Hide';
}

function initMainUiListeners() {
    docElId('leftsidesettings').addEventListener('click', findInLeftMainUi, { capture: false, passive: true });
    docElId('uploadnewCNames').addEventListener('change', handleRenamedCourses, { capture: false, passive: true });
    docElId('rightsidesettings').addEventListener('click', findInRightMainUi, { capture: false, passive: true });
    docElId('schedule-instances').addEventListener('click', findInMap, { capture: false, passive: true });
    docElId('references').addEventListener('click', findInList, { capture: false, passive: true });
    docElId('searchcourses').addEventListener('input', searchCourses, { capture: false, passive: true }); //regex search
    docElId('showteachers').addEventListener('click', showTchrsForEditing, { capture: false, passive: true }); //toggled
    docElId('deptGrpsDaily').addEventListener('click', deptGrpsDaily, { capture: false, passive: true }); //switch toggle
    docElId('deptGrpsWeekly').addEventListener('click', deptGrpsWeekly, { capture: false, passive: true }); //switch toggle
    docElId('mlticatsyes').addEventListener('click', multiCatsYes, { capture: false, passive: true }); //switch toggle
    docElId('mlticatsno').addEventListener('click', multiCatsNo, { capture: false, passive: true }); //switch toggle
    docElId('startedr').addEventListener('click', editorHandlerOn, { capture: false, passive: true }); //toggled listener
    docElId('helpfileB').addEventListener('click', showInfoB, { capture: false, passive: true });
    docElId('helpfile1').addEventListener('click', hideInfoB, { capture: false, passive: true });
    docElId('view-stats').addEventListener('click', viewStats, { capture: false, passive: true });
    docElId('klinicHold').addEventListener('click', holdKlinic, { capture: false, passive: true });
}

function initSettingsListeners() {
    docElId('deptEDIT').addEventListener('click', findInDepts, { capture: false, passive: true });
    docElId('deptEDIT-file').addEventListener('change', handleDeptsFile, { capture: false, passive: true });
    docElId('deptopenR').addEventListener('click', showEDITdepts, { capture: false, passive: true });
    docElId('save-deptEDIT').addEventListener('click', saveUpdatedDepts, { capture: false, passive: true });
    docElId('deptEDITadd').addEventListener('click', newBlankDept, { capture: false, passive: true });
    docElId('exit-deptEDIT').addEventListener('click', exitEDITdepts, { capture: false, passive: true });
    docElId('jsonSettings-file').addEventListener('change', handleJSONSettingsReset, { capture: false, passive: true });
    docElId('alldepartments').addEventListener('click', findInDeptGroup, { capture: false, passive: true });
    docElId('newgroupid').addEventListener('click', findInScheduleSettings, { capture: false, passive: true });
    docElId('allgroups').addEventListener('click', deleteDeptGroupViaUI, { capture: false, passive: true });
    docElId('seqHrsTwo').addEventListener('click', maxSeqHrstwo, { capture: false, passive: true });
    docElId('seqHrsThree').addEventListener('click', maxSeqHrsthree, { capture: false, passive: true });
    docElId('hrsPerSchedule').addEventListener('input', chkHrsPerScheduleInput, { capture: false, passive: true });
    docElId('hrsPerDay').addEventListener('input', chkHrsPerDayInput, { capture: false, passive: true });
    docElId('save-settings').addEventListener('click', closeSettingsScreen, { capture: false, passive: true });
    showEl('setting-section');
}

function removeSettingsListeners() {
    docElId('deptEDIT').removeEventListener('click', findInDepts, { capture: false, passive: true });
    docElId('deptEDIT-file').removeEventListener('change', handleDeptsFile, { capture: false, passive: true });
    docElId('deptopenR').removeEventListener('click', showEDITdepts, { capture: false, passive: true });
    docElId('save-deptEDIT').removeEventListener('click', saveUpdatedDepts, { capture: false, passive: true });
    docElId('deptEDITadd').removeEventListener('click', newBlankDept, { capture: false, passive: true });
    docElId('exit-deptEDIT').removeEventListener('click', exitEDITdepts, { capture: false, passive: true });
    docElId('jsonSettings-file').removeEventListener('change', handleJSONSettingsReset, { capture: false, passive: true });
    docElId('alldepartments').removeEventListener('click', findInDeptGroup, { capture: false, passive: true });
    docElId('newgroupid').removeEventListener('click', findInScheduleSettings, { capture: false, passive: true });
    docElId('allgroups').removeEventListener('click', deleteDeptGroupViaUI, { capture: false, passive: true });
    docElId('seqHrsTwo').removeEventListener('click', maxSeqHrstwo, { capture: false, passive: true });
    docElId('seqHrsThree').removeEventListener('click', maxSeqHrsthree, { capture: false, passive: true });
    docElId('hrsPerSchedule').removeEventListener('input', chkHrsPerScheduleInput, { capture: false, passive: true });
    docElId('hrsPerDay').removeEventListener('input', chkHrsPerDayInput, { capture: false, passive: true });
    docElId('save-settings').removeEventListener('click', closeSettingsScreen, { capture: false, passive: true });
}

function editorHandlerOn() {
    openEditing();
    docElId('startedr').removeEventListener('click', editorHandlerOn, { capture: false, passive: true });
    docElId('startedr').addEventListener('click', editorHandlerOff, { capture: false, passive: true });
    docElId('startedr').textContent = "Close";
    showEl('addnewcourse');
    showEl('renamer');
    showEl('purger');
    showEl('openklinics');
    hideEl('klinicscontainer');
    hideEl("klinicHolder");
}

function editorHandlerOff() {
    closeEditing();
    docElId('startedr').removeEventListener('click', editorHandlerOff, { capture: false, passive: true });
    docElId('startedr').addEventListener('click', editorHandlerOn, { capture: false, passive: true });
    docElId('startedr').textContent = "";
    hideEl('renamer');
    hideEl('newCNames');
    hideEl('addnewcourse');
    hideEl('purger');
    hideEl('openklinics');
    displayUpdatedKlinicBtns(); //checks for stats.indexData.klinics.length; if cat "CLINIC" doesn't exist, it is created
    if (catExists("CLINIC")) { showEl('klinicscontainer'); }
}

//PREP AUTOBLDR

function catExists(cat) {
    var exists = false;
    var i;
    for (i = 0; i < stats.catData.length; i++) {
        if (stats.catData[i][0] === cat) {
            exists = true;
            break;
        }
    }
    return exists;
}

function getScheduleIdsForAutoBldr() {
    var scheduleArr = [];
    var len = stats.indexData.schedules.length;
    var sObjRef,
        i;

    for (i = 0; i < len; i++) {
        sObjRef = scheduleData[stats.indexData.schedules[i]];

        if (!sObjRef.cRef.length && sObjRef.dayOff === 6) {
            scheduleArr.push(stats.indexData.schedules[i]);
        }
    }
    return scheduleArr;
}

function getCoursesForAutoBldr(cat) {
    var courseDataClone = {};
    var len = stats.indexData.courses.length;
    var cObjRef,
        i;

    for (i = 0; i < len; i++) {
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cObjRef.cat === cat && cObjRef.assgn === "") {
            courseDataClone[stats.indexData.courses[i]] = cObjRef;
        }
    }
    return courseDataClone;
}

function autoBldrBuildIt(cat) {
    var aWorker = {};
    var dataArr = [];
    var dataStr,
        el0,
        el1,
        el2,
        el3;

    try {
        aWorker = new Worker('autoBldr_14.min.js');
    } catch (e) {
      return;
    }
    el0 = getScheduleIdsForAutoBldr();
    el1 = getCoursesForAutoBldr(cat);
    el2 = stats.settings;
    el3 = "" + config.uiScheduleNumOfHrsPerDay;
    dataArr.push(el0, el1, el2, el3);
    dataStr = JSON.stringify(dataArr);

    aWorker.onmessage = function(result) {
        autoBldrMakeAssignments(result);
    };
    aWorker.postMessage(dataStr);
}

function initAutoBuilder(elId) {
    var catIndex = Number(elId.substring(4))-1; //"bldr1" -> catIndex = 0
    var cat = stats.catData[catIndex][0];
    var preflightChk = chkCatForAutoBldr(cat);

    if (preflightChk === true) { autoBldrBuildIt(cat); }
}

function chkCatForAutoBldr(cat) {
    var coursesOfInterest = 0;
    var freeSchedules = getScheduleIdsForAutoBldr();
    var returnVal = true;
    var len = stats.indexData.courses.length;
    var cObjRef,
        i;

    if (catExists(cat) === false) { returnVal = false; }
    if (cat === "CLINIC") { returnVal = false; }

    for (i = 0; i < len; i++) {
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cObjRef.cat === cat && cObjRef.assgn === '') {
            coursesOfInterest++;
        }
    }
    if (stats.settings.overrides.maxHours === true) {
        window.mscAlert({
            title: '',
            subtitle: 'Please turn off the override for MAX. HOURS!'
        });
        returnVal = false;
    } else if (coursesOfInterest < (stats.settings.maxHours / 2)) {
        window.mscAlert({
            title: '',
            subtitle: 'Too few unassigned courses left to justify this action!'
        });
        returnVal = false;
    } else if (!freeSchedules.length) {
        window.mscAlert({
            title: '',
            subtitle: 'No empty schedules are available.'
        });
        returnVal = false;
    }
    return returnVal;
}

function autoBldrMakeAssignments(result) {
    var hashMaps = JSON.parse(result.data); // { "s1":{"cRef":["c300", "c302", "c338", "c304", "c301", "c313"],"dayOff":4},...}
    var schedulesToAssgn = Object.keys(hashMaps); //[s1, s2, s3...]
    var schedulesToAssgnLen = schedulesToAssgn.length;
    var hashMapsCrefLen,
        hashMapObjRef,
        sParam,
        cParam,
        i,
        ii;

    for (i = 0; i < schedulesToAssgnLen; i++) {
        sParam = schedulesToAssgn[i];
        hashMapObjRef = hashMaps[sParam];
        hashMapsCrefLen = hashMapObjRef.cRef.length;

        for (ii = 0; ii < hashMapsCrefLen; ii++) {
            cParam = hashMapObjRef.cRef[ii];
            makeAssignment(sParam, cParam);
            toggleColorsOnOff(sParam, cParam, "on");
        }
        scheduleData[sParam].dayOff = hashMapObjRef.dayOff; //set the dayOff
        docElId("off" + "" + hashMapObjRef.dayOff + "" + sParam + "").style.color = "#2c3e50";
        updateCatListOnSchedule(sParam);
        checkTooFewCourses(sParam);
    }
}

//PREP PDFs

function pdfCatColor(catListToArr, targetCat) { //take the catList and the current cat...return an obj with text and an associated color (based on the current cat's position in the catList)
    var reColor = config.pdfCourseColors[catListToArr.indexOf(targetCat)] || "";
    var returnObj = {
        text: " " + targetCat,
        color: reColor
    };

    if (catListToArr.length) {
        if (targetCat !== catListToArr[catListToArr.length-1]) {
            returnObj.text = " " + targetCat + ", ";
        }
    }
    return returnObj;
}

function addTchrsToClinicInstances() {
    var assigndClinics = stats.indexData.courses.map(function (el) {
        if (courseData[el].cat === "CLINIC" && courseData[el].assgn !== "") {
            return courseData[el];
        }}).filter( function (el){ return el !== undefined; });
    var len = assigndClinics.length;
    var kRef,
        i;

    for (i = 0; i < len; i++) {
        kRef = assigndClinics[i];
        kRef.tchr = "unassigned";

        if (scheduleData[kRef.assgn].hasOwnProperty("tchr")) {
            if (scheduleData[kRef.assgn].tchr !== "") {
                kRef.tchr = scheduleData[kRef.assgn].tchr;
            }
        }
    }
    return assigndClinics;
}

function formatClinicInstances() {
    var insts = addTchrsToClinicInstances();
    var defs = stats.indexData.klinics.map( function (el){ return el.name; });
    var clinicsForPdf = [];
    var defArr,
        clinicsForPdfObj,
        i;

    uniqueValues(defs);

    for (i = 0; i < defs.length; i++) {
        defArr = insts.filter( function (el) { return el.name === defs[i]; });

        if (defArr.length) {
            clinicsForPdfObj = {};
            clinicsForPdfObj.def = defs[i];
            clinicsForPdfObj.inst = defArr;
            clinicsForPdf.push(clinicsForPdfObj);
        }
    }
    return clinicsForPdf;
}

function makePDFinit(elId) {
    var myWorker = {};
    var rightNow = cleanWsReturnUnderscores((new Date()).toDateString());
    var fileName,
        pdfData;

    if (elId === "dlklinicpdf") {
        fileName = "PrintClinics_" + rightNow + ".pdf";
        pdfData = buildClinicsPDF();
    } else {
        fileName = "PrintSchedules_" + rightNow + ".pdf";
        pdfData = buildPDF();
    }
    docElId(elId).className += ' disabled'; //disable the click element

    try { myWorker = new Worker('pdfWorker.js'); }
    catch (e) { return; }

    myWorker.onmessage = function(result) {
        window.saveAs(result.data.pdfBlob, fileName);
        docElId(elId).className = cleanClssLstRemove(docElId(elId).className, "disabled");
    };
    myWorker.postMessage(pdfData);
}

//HANDLE FILE UPLOADS

function handleCourseFile(evt) {
    var file;

    //showEl("loadingScreen");
    file = evt.target.files[0];

    if (file.name.substring(file.name.length - 3) !== "csv") {
        docElId('inputFile').reset();
        //hideEl("loadingScreen");
        window.mscAlert({
            title: 'Error',
            subtitle: 'File is not .csv!'
        });
        return;
    }
    window.Papa.parse(file, {
        worker: true,
        header: true,
        dynamicTyping: false,
        encoding: "",
        skipEmptyLines: true,
        complete: function (results) {
            var requiredHeaders = [csvStrings.courseCat,csvStrings.courseNum,csvStrings.courseTime,csvStrings.courseRm];
            var missingHeader = [false, ""];
            var i;

            for ( i = 0; i < requiredHeaders.length; i++) {
                if (results.meta.fields.indexOf(requiredHeaders[i]) === -1) {
                    missingHeader[0] = true;
                    missingHeader[1] = requiredHeaders[i];
                    break;
                }
            }
            if (missingHeader[0] === true) {
                courseData = {};
                //hideEl("loadingScreen");
                window.mscAlert({
                    title: 'Error',
                  subtitle: 'Your file is missing the required header: "' + missingHeader[1] + '"'
                });
            } else {
                convertCsvDataToCourseData(results.data, results.meta.fields);
            }
            docElId('inputFile').reset();
            hideEl('parsing');
        }
    });
}

function handleAddedCourses(evt) {
    var file;

    //showEl("loadingScreen");
    file = evt.target.files[0];

    if (file.name.substring(file.name.length - 3) !== "csv") {
        docElId('freshFile').reset();
        //hideEl("loadingScreen");
        window.mscAlert({
            title: 'Error',
            subtitle: 'Not a valid .csv file.'
        });
        return;
    }
    window.Papa.parse(file, {
        worker: true,
        header: true,
        dynamicTyping: false,
        encoding: "",
        skipEmptyLines: true,
        complete: function (results) {
            var requiredHeaders = [csvStrings.courseCat,csvStrings.courseNum,csvStrings.courseTime,csvStrings.courseRm];
            var missingHeader = [false, ""];
            var hasTeachers = false;
            var i;

            stats.newDepts = [];
            stats.newKlinicDefs = [];
            stats.newCourses = []; // [{},{},{},{},...]
            stats.overwriteCourses = [];

            for ( i = 0; i < requiredHeaders.length; i++) {
                if (results.meta.fields.indexOf(requiredHeaders[i]) === -1) {
                    missingHeader[0] = true;
                    missingHeader[1] = requiredHeaders[i];
                    break;
                }
            }
            if (missingHeader[0] === true) {
                removeNewCourseArrays();
                //hideEl("loadingScreen");
                window.mscAlert({
                    title: 'Error',
                    subtitle: 'Your file is missing the required header: "' + missingHeader[1] + '"'
                });
            } else {
                if (results.meta.fields.indexOf(csvStrings.courseTchr) !== -1) {
                    hasTeachers = true;
                }
                convertNewAddedCsvData(results.data, results.meta.fields, hasTeachers); //on success, next: attempt to convert the values:
            }
            docElId('freshFile').reset();
            hideEl('parsing');
        }
    });
}

function handleTeacherFile(evt) {
    var file = evt.target.files[0];

    if (file.name.substring(file.name.length - 3) !== "csv") {
        docElId('inputTCHRS').reset();
        window.mscAlert({
            title: 'Error',
            subtitle: 'Not a valid .csv file!'
        });
        return;
    }
    window.Papa.parse(file, {
        header: true,
        worker: true,
        dynamicTyping: false,
        encoding: "",
        skipEmptyLines: true,
        complete: function (results) {
            if (results.data.length) {
                var aName,
                    aKRname,
                    i;

                if (!results.data[0].hasOwnProperty("teachers")) {
                    window.mscAlert({
                        title: '',
                        subtitle: 'File is missing the required header: "teachers"\n("강사명" is an optional ADMIN .csv display name).'
                    });
                    return;
                }
                for (i = 0; i < results.data.length; i++) {
                    aName = cleanNameCharsOnly(cleanTrimTrailingWs(results.data[i].teachers))
                    aKRname = cleanNameCharsOnly(cleanTrimTrailingWs(results.data[i]["강사명"])) || "";

                    if (aName !== "") {
                        if (tchrExists(aName) === true) { //checking in lowercase
                            if (aKRname !== "" && aKRname !== undefined){
                                var dupIndex = stats.teachers.map(function(el) { return el.en; }).indexOf(aName); //- if name already exists, then overwrite the KRname (unless it is empty)

                                stats.teachers[dupIndex].kor = aKRname;
                            }
                        } else {
                            addNewPersonAsTchr(aName, aKRname); //this function ONLY gets the csv names into input values, NOT ALTER stats.teachers
                        }
                    }
                }
            }
            docElId('inputTCHRS').reset();
        }
    });
}

function handleDeptsFile(evt) {
    var file = evt.target.files[0];

    if (file.name.substring(file.name.length - 3) !== "csv") {
        docElId('inputDEPTS').reset();
        window.mscAlert({
            title: 'Error',
            subtitle: 'Not a valid .csv file!'
        });
        return;
    }
    window.Papa.parse(file, {
        header: true,
        worker: true,
        dynamicTyping: false,
        encoding: "",
        skipEmptyLines: true,
        complete: function (results) {
            if (results.data.length) {
                var aDept,
                    aDscrptn,
                    i;

                if (!results.data[0].hasOwnProperty("shortcode")) {
                    window.mscAlert({
                        title: '',
                        subtitle: 'File is missing the required header: "shortcode"\n("description" is an optional header.)'
                    });
                    return;
                }
                for (i = 0; i < results.data.length; i++) {
                    aDept = cleanKrCharsOnly(cleanTrimTrailingWs(results.data[i].shortcode));
                    aDscrptn = cleanDngrChars(cleanTrimTrailingWs(results.data[i].description)) || "";

                    if (aDept !== "") {
                        if (deptExists(aDept) === true) {
                            if (aDscrptn !== "" && aDscrptn !== undefined) { //- if shortcode already exists, then overwrite the description (unless it is empty)
                                var dupIndex = stats.indexData.depts.map(function(el) { return el.shortcode; }).indexOf(aDept);

                                stats.indexData.depts[dupIndex].description = aDscrptn;
                            }
                        } else {
                            addNewDepartment(aDept, aDscrptn); //this function ONLY gets the csv names into input values, NOT ALTER stats.indexData.depts
                        }
                    }
                }
            }
            docElId('inputDEPTS').reset();
        }
    });
}

function parseJSONSettingsReset(result) {
    var newStats = {};
    var fileObj;

    try {
        fileObj = JSON.parse(result);
        newStats = fileObj[0];
        backUpSettings();
        chkSettingsAndAssgn(newStats); //required to throw error...
    }
    catch (e) {
        window.mscAlert({
            title: 'Error',
            subtitle: 'The JSON file you have supplied cannot be used.'
        });
        restoreSettings();
        return;
    }
    updateSettingsInputVals();
    setOverrideControls();
    displayUpdatedKlinicBtns(); //checks for stats.indexData.klinics.length; if cat "CLINIC" doesn't exist, it is created
    closeSettingsScreen(); //handleJSONSettingsReset() can only be called from the settings edit screen
    window.mscAlert({
        title: 'Success!',
        subtitle: 'Settings, departments, groups, teachers and clinic definitions have been loaded from file.'
    });
}

function handleJSONSettingsReset(evt) { //LOAD ONLY SETTINGS AND DEFINITIONS FROM JSON FILE
    var file = evt.target.files[0];
    var reader;

    if (file.name.substring(file.name.length - 4) !== "json" ) {
        docElId('uploadJSON').reset();
        window.mscAlert({
            title: 'Error',
            subtitle: 'Not a .json file!'
        });
        return;
    }
    reader = new window.FileReader();
    reader.onload = (function () {
        parseJSONSettingsReset(reader.result);
    });
    reader.readAsText(file);
    docElId('uploadJSON').reset();
}

function mockCoursesForTestJSONwithAutoBldr(cat) {
    var courseDataClone = {};
    var len = stats.indexData.courses.length;
    var cObjRef,
        i;

    for (i = 0; i < len; i++) {
        cObjRef = courseData[stats.indexData.courses[i]];

        if (cObjRef.cat === cat) {
            courseDataClone[stats.indexData.courses[i]] = {};
            courseDataClone[stats.indexData.courses[i]].assign = "";
            courseDataClone[stats.indexData.courses[i]].cat = cObjRef.cat;
            courseDataClone[stats.indexData.courses[i]].dayhr = cObjRef.dayhr;
            courseDataClone[stats.indexData.courses[i]].dept = cObjRef.dept;
            courseDataClone[stats.indexData.courses[i]].duration = cObjRef.duration;
            courseDataClone[stats.indexData.courses[i]].name = cObjRef.name;
            courseDataClone[stats.indexData.courses[i]].rm = cObjRef.rm;
            courseDataClone[stats.indexData.courses[i]].times = cObjRef.times;
            if (cObjRef.duration === "ninety") {
                courseDataClone[stats.indexData.courses[i]].allowFollow = cObjRef.allowFollow;
            }
        }
    }
    return courseDataClone;
}

function testJSONwithAutoBldr() { //required to throw error
    var aWorker = {};
    var dataArr = [];
    var dataStr,
        mockSettings,
        el0,
        el1,
        el2,
        el3,
        i;

    mockSettings = JSON.parse(JSON.stringify(stats.settings));
    mockSettings.overrides.maxHours = false;

    for (i = 0; i < stats.catData.length; i++) {
        if (stats.catData[i][0] ==="CLINIC") { continue; } //will need to test CLINIC instances separately...

        aWorker = new Worker('autoBldr_14.min.js');

        el0 = stats.indexData.schedules;
        el1 = mockCoursesForTestJSONwithAutoBldr(stats.catData[i][0]);
        el2 = mockSettings;
        el3 = "" + config.uiScheduleNumOfHrsPerDay;
        dataArr = [];
        dataArr.push(el0, el1, el2, el3);
        dataStr = JSON.stringify(dataArr);

        aWorker.onmessage = function(result) { return; };
        aWorker.onerror = function(e) {
            e.preventDefault();
            throw new Error('Cannot autoBld with this JSON.');
        }
        aWorker.postMessage(dataStr);
    }
}

function updateCsvStringsFromJSONfile(fileObj) {
    var keys = Object.keys(fileObj);

    keys.forEach( function(prop) {
        if (typeof fileObj[prop] === 'string' && fileObj[prop] !== "" && csvStrings[prop] !== undefined) {
            csvStrings[prop] = fileObj[prop];
        }
    });
}

function parseJSONresultFromFile(result, setOnly, errNum) {
    var fileObj;

    try {
        fileObj = JSON.parse(result);

        if (setOnly === true) {
            courseData = {};
            scheduleData = {};
            templateStats();
            chkSettingsAndAssgn(fileObj[0]); //required to throw error
        } else {
            stats = fileObj[0];
            courseData = fileObj[1];
            scheduleData = fileObj[2];
            updateCsvStringsFromJSONfile(fileObj[3]);
            config.uiTimeInputStartHr = fileObj[4].uiTimeInputStartHr; //json must have config value or dayhrs could get messed up
            config.uiScheduleNumOfHrsPerDay = fileObj[4].uiScheduleNumOfHrsPerDay; //json must have config value or dayhrs could get messed up
            testJSONwithAutoBldr(); //required to throw error
        }
    }
    catch(e) {
        resetFromBadJson(errNum);
        return;
    }
    try {
        loadStateFromData(true);
    } catch(e) {
        resetFromBadJson(errNum);
        resetTheWholeUI();
        return;
    }
    exitParsingScreen();
}

function handleJSONFile(evt) { //LOAD EVERYTHING FROM JSON FILE
    var file = evt.target.files[0];
    var setOnly = docElId('settingsOnly').checked;
    var reader;

    if (file.name.substring(file.name.length - 4) !== "json") {
        docElId('inputJSON').reset();
        docElId('settingsOnly').checked = false;
        window.mscAlert({
            title: 'Error',
            subtitle: 'Not a .json file!'
        });
        return;
    }
    reader = new window.FileReader();
    reader.onload = (function () {
        parseJSONresultFromFile(reader.result, setOnly, 0);
    });
    reader.readAsText(file);
    docElId('inputJSON').reset();
    docElId('settingsOnly').checked = false;
}

function handleRenamedCourses(evt){
    var file = evt.target.files[0];

    if (file.name.substring(file.name.length - 3) !== "csv") {
        docElId('inputRENAME').reset();
        window.mscAlert({ title: 'Error', subtitle: 'Not a .csv file!' });
        return;
    }
    window.Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        encoding: "",
        skipEmptyLines: true,
        complete: function(results) {
            var arr = [];

            if (results.data.length) {
                if (results.data[0].hasOwnProperty(csvStrings.oldNum) && results.data[0].hasOwnProperty(csvStrings.newNum)) { //ONLY ACCEPTS DATA FROM THE CORRECT HEADERS (old) and (new)...
                    var i;

                    for (i = 0; i < results.data.length; i++) {
                        arr.push([ cleanNumCharsOnly(cleanTrimTrailingWs(results.data[i][csvStrings.oldNum])), cleanNumCharsOnly(cleanTrimTrailingWs(results.data[i][csvStrings.newNum])) ]);
                    }
                } else {
                    window.mscAlert({
                        title: '',
                        subtitle: 'File is missing the required headers: "' + csvStrings.oldNum + '" and "' + csvStrings.newNum + '".'
                    });
                    return;
                }
            }
            populateNewCourseNameInputs(arr); //[["oldVal","newVal"],["oldVal","newVal"]...]
            docElId('inputRENAME').reset();
        }
    });
}

//PARSE CSV DATA

function chkCoursesParsed(refObj, bool) { //true: from init screen, false: when new courses added for merging
    var csvChk = chkCoursesforError(refObj, isArr);
    var isArr = !bool;

    if (csvChk > 0) {
        //hideEl("loadingScreen");
        window.mscAlert({
            title: '',
            subtitle: '' + csvChk + ' course(s) contain(s) exceptions and cannot be imported.\nPlease refer to the "CSV_ERRORS" file download for details.'
        });
    }
    if (bool === true) {
        buildStats();
        return;
    }
    prepInsertNewCoursesFromCSV();
}

function convertNewAddedCsvData(csvObj, headers, hasTeachers) {
    var len = csvObj.length;
    var teachers = stats.teachers; //prop will exist because this is not an initial upload!
    var errorArr = [];
    var newCourseObj,
        rObj,
        record,
        tchrIdx,
        i;

    for ( i = 0; i < len; i++) {
        record = csvObj[i];

        if (record[csvStrings.courseCat] === "CLINIC") { //NOTE: this only adds klinic definitions and discards instances!
            try {
                newCourseObj = {};
                newCourseObj.cat = "CLINIC";
                newCourseObj.name = record[csvStrings.courseNum];
                newCourseObj.fullname = newCourseObj.name;
                newCourseObj.rm = {};
                newCourseObj.rm.a = cleanRemoveKrChars(cleanDngrCharsAndWs(record[csvStrings.courseRm]));
                newCourseObj.dept = singleDept(cleanKrCharsOnly(record[csvStrings.courseRm]));

                if (newCourseObj.dept ==="" || newCourseObj.name ==="" || newCourseObj.rm.a ==="") { throw new Error("Parsed value is empty string"); }

                stats.newKlinicDefs.push(JSON.parse(JSON.stringify(newCourseObj)));
            }
            catch(e) {
                errorArr.push(record[csvStrings.courseCat]);
                continue;
            }
        } else {
            try {
                newCourseObj = {};
                newCourseObj.assgn = "";
                rObj = parseCsvTimeString(record[csvStrings.courseTime]); //will throw error for the day/time string
                newCourseObj.dayhr = convertDayHr(rObj); //will throw error for the day/time values being out of bounds
                newCourseObj.times = reduceTimes(rObj);
                newCourseObj.duration = rObj.type;

                if (newCourseObj.duration === "ninety") {
                    newCourseObj.allowFollow = isNinetyBools(rObj.charArr[4], rObj.charArr[9]);
                }
                newCourseObj.cat = cleanMultiWsWithSingleWs(cleanDngrChars(record[csvStrings.courseCat]));
                newCourseObj.dept = singleDept(record[csvStrings.courseRm]);
                newCourseObj.name = cleanNumCharsOnly(record[csvStrings.courseNum]);
                newCourseObj.rm = splitAndCleanRooms(record[csvStrings.courseRm], rObj.type, newCourseObj.dept);

                if (newCourseObj.cat ==="" || newCourseObj.dept ==="" || newCourseObj.name ==="" || newCourseObj.rm.a ==="") {
                    throw new Error("Parsed value is empty string");
                }
                if (hasTeachers === true) {
                    tchrIdx = teachers.filter( function (el) { return el.en === record[csvStrings.courseTchr] || el.kor === record[csvStrings.courseTchr]; })[0];

                    if (tchrIdx == undefined && record[csvStrings.courseTchr] !=="" ) {
                        stats.teachers.push({en:record[csvStrings.courseTchr],kor:record[csvStrings.courseTchr]});
                    }
                }
                stats.newCourses.push(newCourseObj);
            }
            catch(e) {
                errorArr.push(csvObj[i]);
                continue;
            }
        }
    }
    if (errorArr.length) {
        //hideEl("loadingScreen");
        window.mscAlert({
            title: '',
            subtitle: 'Some courses contain exceptions and cannot be imported.\nPlease refer to the "CSV_ERRORS" file download for details.'
        });
        exportCsvErrors(headers, errorArr);
    }
    chkCoursesParsed(stats.newCourses, false);
}

function convertCsvDataToCourseData(csvObj, headers) { //directly injecting initial courses to create courseData because it is empty: all other information discarded
    var len = csvObj.length;
    var errorArr = [];
    var idx,
        rObj,
        record,
        newcObj,
        i;

    getConfigFromParsingScreen();

    for ( i = 0; i < len; i++) {
        record = csvObj[i];

        if (record[csvStrings.courseCat] === "CLINIC"){ continue; } //any clinic definitions and instances are discarded

        try { // to catch undefined or null props
            idx = "c" + (i + 1);
            newcObj = {};
            newcObj.assgn = "";
            rObj = parseCsvTimeString(record[csvStrings.courseTime]); //will throw error for the day/time string
            newcObj.dayhr = convertDayHr(rObj); //will throw error for the day/time values being out of bounds
            newcObj.times = reduceTimes(rObj);
            newcObj.duration = rObj.type;

            if (newcObj.duration === "ninety") { newcObj.allowFollow = isNinetyBools(rObj.charArr[4], rObj.charArr[9]); }

            newcObj.cat = cleanMultiWsWithSingleWs(cleanDngrChars(record[csvStrings.courseCat]));
            newcObj.dept = singleDept(record[csvStrings.courseRm]);
            newcObj.name = cleanNumCharsOnly(record[csvStrings.courseNum]);
            newcObj.rm = splitAndCleanRooms(record[csvStrings.courseRm], rObj.type, newcObj.dept);

            if (newcObj.cat ==="" || newcObj.dept ==="" || newcObj.name ==="" || newcObj.rm.a ==="") { throw new Error("Parsed value is empty string"); }

            courseData[idx] = newcObj;
        }
        catch(e) {
            errorArr.push(csvObj[i]);
            continue;
        }
    }
    if (errorArr.length) {
        window.mscAlert({
            title: '',
            subtitle: 'Some courses contain exceptions and cannot be imported.\nPlease refer to the "CSV_ERRORS" file download for details.'
        });
        exportCsvErrors(headers, errorArr);
    }
    chkCoursesParsed(courseData, true);
}

function chkOneCourseForError(prop, idx) {
    if (!idx.hasOwnProperty(prop)) { return false; } //prop doesn't exist
    if (prop !== "assgn" && idx[prop] === "") { return false; } //value is empty string
    if (prop === "name") {
        if (idx[prop].length !== config.courseNameNumLength || Number(idx[prop]) < 1 || Number.isNaN(Number(idx[prop]))) { return false; }
    }
    if (prop === "dayhr") {
        if (idx[prop][0].identical(idx[prop][1])) { return false; }  //the dayhr map overlaps itself
    }
    return true;
}

function chkCoursesforError(refObj, isArr) { // the refObj is either: courseData {} or newCourseData [], either way: NO clinics
    var csvChk = 0;
    var objIndexes = Object.keys(refObj);
    var reqProps = ["assgn", "cat", "dayhr", "dept", "duration", "name", "rm", "times"]; //ALWAYS ASSUME THESE HEADERS TO DEFINE A COURSE OBJ.
    var reqLen = reqProps.length;
    var flag,
        bool,
        i,
        ii;

    if (isArr === true) { objIndexes = objIndexes.map( function (el) { return Number(el); }); } //newCourseData is an array because we haven't yet assigned "c" names

    for (i = objIndexes.length - 1; i >= 0; i--) {
        flag = true;

        for (ii = 0; ii < reqLen; ii++) {
            bool = chkOneCourseForError(reqProps[ii], refObj[objIndexes[i]]);
            if (!bool) { flag = false; }
        }
        if (flag === false) {
            csvChk += 1;

            if (isArr === true) {
                refObj.splice(i, 1);
            } else {
                delete refObj[objIndexes[i]]; //i.e.: {"c0":{}}
            }
        }
    }
    return csvChk;
}

function splitAndCleanRooms(rmStr, cType, dept) {
    var room = {};
    var temp = (cleanDngrCharsAndWs(rmStr)).split(dept).filter( function(el) { return el !==""; });

    room.a = temp[0];

    if (temp.length > 1 && (cType === "onehour" || cType ==="ninety")) {
        room.b = temp[1];
    }
    return room;
}

function singleDept(str) { //sometimes, a split room occurs and the department appears twice in one hour courses
    var arr = str.split(/[^\u3130-\u318F\uAC00-\uD7AF]/).filter( function(el){ return el !==""; });  //no check for undefined (split won't throw an error)
    var dept = "error";

    if (arr.length) {
        dept = arr[0];
    }
    return dept;
}

function splitTimeStr(str) {
    var rObj = {charArr:[], type:"error"};
    var krChars = str.split(/[^\u3130-\u318F\uAC00-\uD7AF]/).filter(function(el){ return el !==""; });
    var numChars = str.split(/[^0-9]/).filter(function(el){ return el !==""; });
    var kLen = krChars.length;
    var nLen = numChars.length;

    if (nLen !== 2 && nLen !== 4 && nLen !== 8) {
        return rObj;
    }
    if (kLen === 2 && nLen === 8) {
        numChars.splice(0, 0, krChars[0]);
        numChars.splice(5, 0, krChars[1]);
        rObj.type = "1"; //onehour or ninetyBool
    }
    if (kLen === 1) {
        if (nLen === 4) {
            rObj.type = "2"; //twohour or threehour
        }
        if (nLen === 2) {
            rObj.type = "3"; //clinic
        }
        numChars.unshift(krChars[0]);
    }
    rObj.charArr = numChars;
    return rObj;
}

function timeWithinBounds(num, end) {
    return num >= Number(config.uiTimeInputStartHr) && num < end;
}

function parseCsvTimeString(str) { //is required to throw error
    var rObj = getDuration(str);
    var bool = false;
    var validEndNum = Number(config.uiTimeInputStartHr) + Number(config.uiScheduleNumOfHrsPerDay);
    var validEndHrs = {
        onehour: validEndNum,
        ninety: validEndNum - 1,
        twohour: validEndNum - 1,
        threehour: validEndNum - 2,
        klinichour: validEndNum };

    if (rObj.type !== "error") {
        bool = timeWithinBounds(Number(rObj.charArr[1]), validEndHrs[rObj.type]);

        if (rObj.type !=="klinichour") {
            bool = timeWithinBounds(Number(rObj.charArr[3]), validEndHrs[rObj.type]);

            if (rObj.type !=="twohour" && rObj.type !=="threehour") {
                bool = timeWithinBounds(Number(rObj.charArr[6]), validEndHrs[rObj.type]) && timeWithinBounds(Number(rObj.charArr[8]), validEndHrs[rObj.type]);
            }
        }
    }
    if (bool !== true) {
        throw new Error("Unexpected day/time values");
    }
    return rObj;
}

function getDuration(str) {
    var rObj = splitTimeStr(str);
    var minChar = rObj.charArr[2];
    var numDiff,
        svnChar,
        ninChar,
        nthDiff;

    if (rObj.type === "error") {
        return rObj;
    }
    if (rObj.type === "3" && minChar === "00") {
        rObj.type = "klinichour";
        return rObj;
    }
    if (minChar === "00") {
        numDiff = Number(rObj.charArr[3]) - Number(rObj.charArr[1]);

        if (rObj.charArr[4] === "50") {
            if (rObj.type === "2") {
                if (numDiff === 1) {
                    rObj.type = "twohour";
                }
                if (numDiff === 2) {
                    rObj.type = "threehour";
                }
            }
            if (rObj.type === "1") {
                nthDiff = Number(rObj.charArr[8]) - Number(rObj.charArr[6]);
                svnChar = rObj.charArr[7];
                ninChar = rObj.charArr[9];

                if (numDiff === 0 && nthDiff === 0 && svnChar === "00" && ninChar === "50") {
                    rObj.type = "onehour";
                }
            }
        }
        if (rObj.charArr[4] === "15" && rObj.type === "1" && numDiff === 1) {
            nthDiff = Number(rObj.charArr[8]) - Number(rObj.charArr[6]);
            svnChar = rObj.charArr[7];
            ninChar = rObj.charArr[9];

            if (nthDiff === 1 && (svnChar === "00" || "30") && (ninChar === "15" || "45")) {
                rObj.type = "ninety";
            }
        }
    }
    if (minChar === "30" && rObj.type === "1") {
        numDiff = Number(rObj.charArr[3]) - Number(rObj.charArr[1]);

        if (rObj.charArr[4] === "45" && numDiff === 1) {
            nthDiff = Number(rObj.charArr[8]) - Number(rObj.charArr[6]);
            svnChar = rObj.charArr[7];
            ninChar = rObj.charArr[9];

            if (nthDiff === 1 && (svnChar === "00" || "30") && (ninChar === "15" || "45")) {
                rObj.type = "ninety";
            }
        }
    }
    return rObj;
}

//WE NEED TO BE ABLE TO IDENTIFY DURATION to overcome limitations in the UI (ninety minute courses)
function isNinetyBools(rObj4, rObj9) { //prop.allowFollow = true [true starts at the hour], [false starts at 30 after the hour]
    var bools = [];

    bools[0] = Boolean(false);
    bools[1] = Boolean(false);

    if (rObj4 === "15") {
        bools[0] = Boolean(true);
    }
    if (rObj9 === "15") {
        bools[1] = Boolean(true);
    }
    return bools;
}

function reduceTimes(rObj) {
    var timeStr = "";

    if (rObj.type !== "error") {
        timeStr += rObj.charArr[0] + "" + rObj.charArr[1] + ":" + rObj.charArr[2];

        if (rObj.type !== "klinichour") {
            if (rObj.type === "twohour" || rObj.type === "threehour") {
                timeStr += "-" + rObj.charArr[3] + ":" + rObj.charArr[4];
            }
            if (rObj.type === "onehour" || rObj.type === "ninety") {
                timeStr += "," + rObj.charArr[5] + "" + rObj.charArr[6] + ":" + rObj.charArr[7];
            }
        }
    }
    return timeStr; //"화15:00,목16:00" or "화15:00-16:50" or "화15:00"
}

function convertDayHr(rObj) { //is required to throw error
    var weekObj = {"월":0, "화":1, "수":2, "목":3, "금":4, "토":5};
    var matrix = [[], []];
    var startHr = Number(config.uiTimeInputStartHr);

    if (rObj.type !== "error") {
        matrix[0][0] = weekObj[rObj.charArr[0]];
        matrix[0][1] = Number(rObj.charArr[1]) - startHr;

        if (rObj.type !== "klinichour") {
            if (rObj.type === "twohour" || rObj.type === "threehour") {
                matrix[1][0] = weekObj[rObj.charArr[0]];
                matrix[1][1] = Number(rObj.charArr[3]) - startHr;

            }
            if (rObj.type === "onehour" || rObj.type === "ninety") {
                matrix[1][0] = weekObj[rObj.charArr[5]];
                matrix[1][1] = Number(rObj.charArr[6]) - startHr;
            }
        }
        if (rObj.type === "klinichour") {
            matrix[1][0] = weekObj[rObj.charArr[0]];
            matrix[1][1] = Number(rObj.charArr[1]) - startHr;
        }
        // dupHrs
        if (matrix[0][0] === matrix[1][0] && matrix[0][1] === matrix[1][1]) {
            rObj.type = "error";
        }
    }
    if (rObj.type === "error") {
        throw new Error("Unexpected day/time values");
    }
    return matrix;
}

//TEACHERS

function changeTchr(sParam) { //triggered by click on #tchrset (ref: tchrAssgnments(el))
    editSelectedTchr(sParam);
    hideEl('tchrsee' + sParam);
    showEl('tchrchg' + sParam);
}

function clearAssgndtchr(sParam) { //triggered by click on #tchrclr (ref: tchrAssgnments(el))
    var el = docElId('tchrset' + sParam);

    if (el.textContent !== 'unassigned') {
        el.textContent = 'unassigned';
        scheduleData[sParam].tchr = '';
        noClrBtnIfUnassigned(sParam);
    }
}

function saveTchrChange(sParam) { //triggered by click on #tchrsve (ref: tchrAssgnments(el)) //chks if this person has been assigned to a different schedule already
    var stsRef,
        len,
        i;

    if (stats.teachers.length) {
        var assigndTchr = docElId('tchredt' + sParam).options[docElId('tchredt' + sParam).selectedIndex].value;

        if (assigndTchr !== "") {
            len = stats.indexData.schedules.length;

            for (i = 0; i < len; i++) {
                stsRef = stats.indexData.schedules[i];

                if (scheduleData[stsRef].hasOwnProperty('tchr')) {
                    if (stsRef === sParam) { continue; }
                    if (scheduleData[stsRef].tchr === assigndTchr) {
                        window.mscAlert({
                            title: '',
                            subtitle: '' + assigndTchr + ' has already been assigned to schedule ' + stsRef + ''
                        });
                        clearAssgndtchr(sParam);
                        hideEl('tchrchg' + sParam);
                        showEl('tchrsee' + sParam);
                        return;
                    }
                }
            }
            docElId('tchrset' + sParam).textContent = assigndTchr;
        } else {
            docElId('tchrset' + sParam).textContent = "unassigned";
        }
        scheduleData[sParam].tchr = assigndTchr;
    }
    hideEl('tchrchg' + sParam);
    noClrBtnIfUnassigned(sParam);
    showEl('tchrsee' + sParam);
}

function noClrBtnIfUnassigned(sParam) { //clear btn is hidden if the schedule is unassigned, otherwise: it is shown
    if (scheduleData[sParam].tchr === "" || !scheduleData[sParam].hasOwnProperty('tchr')) {
        hideEl('tchrclr' + sParam);
        return;
    }
    showEl('tchrclr' + sParam);
}

function editSelectedTchr(sParam) {
    var selectTarget = docElId('tchredt' + sParam);
    var frag = document.createDocumentFragment();
    var newFirstOpt = document.createElement("option");
    var len = stats.teachers.length;
    var newSecondOpt,
        i;

    emptyContent(selectTarget);

    newFirstOpt.value = "";
    newFirstOpt.textContent = "select teacher";
    frag.appendChild(newFirstOpt);

    if (len) {
        for (i = 0; i < len; i++) {
            newSecondOpt = document.createElement("option");
            newSecondOpt.value = "" + stats.teachers[i].en;
            newSecondOpt.textContent = newSecondOpt.value;
            frag.appendChild(newSecondOpt);
        }
    }
    selectTarget.appendChild(frag);
    selectTarget.options[0].disabled = true;

    if (scheduleData[sParam].hasOwnProperty('tchr') && scheduleData[sParam].tchr !== "") {
        for (i = 1; i < selectTarget.options.length; i++) { //ignore default disabled select.option[0]
            if (scheduleData[sParam].tchr === selectTarget.options[i].value) {
                selectTarget.selectedIndex = i;
                break;
            }
        }
    }
}

function showTchrsForEditing() {
    var len = stats.indexData.schedules.length;
    var statsRef,
        i;

    tchrShowToggleOff();
    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.schedules[i];
        noClrBtnIfUnassigned(statsRef);
        showTchr(statsRef);
        showEl("tchrsee" + statsRef);
    }
}

function hideTchrsForEditing() {
    var len = stats.indexData.schedules.length;
    var statsRef,
        i;

    tchrShowToggleOn();
    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.schedules[i];
        hideEl("tchrsee" + statsRef);
        hideTchr(statsRef);
        hideEl('tchrchg' + statsRef);
    }
}

function tchrExists(tchr) {
    var exists = false;
    var len = stats.teachers.length;
    var i;

    if (len) {
        for (i = 0; i < len; i++) {
            if ((stats.teachers[i].en).toLowerCase() === (tchr).toLowerCase()) {
                exists = true;
                break;
            }
        }
    }
    return exists;
}

function showUpdateTchrs() {
    var len = stats.indexData.schedules.length;
    var statsRef,
        i;

    displayTchrList();
    hideEl('displayOverrides');
    hideEl('left');
    hideEl('right');
    initTchrListeners();
    showEl('tchrs-section');

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.schedules[i];
        if ( !docElId(statsRef).classList.contains('show-teacher')) { continue; }
        showEl("tchrsee" + statsRef);
        hideEl('tchrchg' + statsRef);
    }
}

function exitUpdateTchrs() {
    emptyContent(docElId('alltchrs'));
    hideEl('tchrs-section');
    removeTchrListeners();
    showEl('displayOverrides');
    showEl('left');
    showEl('right');
}

function newBlankTchr() { //if we don't do this, then the remove click handler for addNewPersonAsTchr() could fire multiple times
    addNewPersonAsTchr("","");
}

function saveUpdatedTchrs() {
    var alltchrs = docElId('alltchrs').childNodes;
    var tchrObj,
        len,
        statsRef,
        i;

    stats.teachers = []; //THEY WILL ALL BE REPRESENTED!
    for (i = 0; i < alltchrs.length; i++) {
        if (alltchrs[i].nodeType == 1) { //div container for each person
            if (alltchrs[i].childNodes[0].value !== "" && alltchrs[i].childNodes[0].value !== undefined) { //ignore any values set to empty string
                tchrObj = {};
                tchrObj.en = alltchrs[i].childNodes[0].value;
                tchrObj.kor = alltchrs[i].childNodes[1].value;
                stats.teachers.push(tchrObj);
            }
        }
    }
    if (stats.teachers.length) {
        for (i = 0; i < stats.teachers.length; i++) {
            stats.teachers[i].en = cleanTrimTrailingWs(cleanNameCharsOnly(stats.teachers[i].en));
            stats.teachers[i].kor = cleanTrimTrailingWs(cleanNameCharsOnly(stats.teachers[i].kor));
        }
        stats.teachers.sort(function (a, b) { return a.en.localeCompare(b.en); });
        stats.teachers = uniqueObjs(stats.teachers, "en");
    }
    len = stats.indexData.schedules.length;

    for (i = 0; i < len; i++) { //if a name got deleted on save, update the UI with: clearAssgndtchr(sParam);
        statsRef = stats.indexData.schedules[i];

        if (scheduleData[statsRef].hasOwnProperty('tchr') && scheduleData[statsRef].tchr !== "") {
            if (!stats.teachers.length ) {
                clearAssgndtchr(statsRef);
            } else if (stats.teachers.map(function(el) { return el.en; }).indexOf(scheduleData[statsRef].tchr) === -1) { //...because now stats.teachers is an array of objects
                clearAssgndtchr(statsRef);
            }
        }
    }
    exitUpdateTchrs();
}

//DEPARTMENTS

function deptExists(dept) {
    var exists = false;
    var len = stats.indexData.depts.length;
    var i;

    if (len) {
        for (i = 0; i < len; i++) {
            if (stats.indexData.depts[i].shortcode === dept) {
                exists = true;
                break;
            }
        }
    }
    return exists;
}

function newBlankDept() { //if we don't do this, then the remove click handler for addNewDepartment() would fire multiple times
    addNewDepartment("","");
}

function deleteDepartmentChk(deptCode){
    var canDelete = true;
    var len = stats.indexData.courses.length;
    var statsRef;
    var i;

    for (i = 0; i < len; i++) { //break when the dept is found being used in a course
        statsRef = stats.indexData.courses[i];

        if (courseData[statsRef].dept === deptCode) {
            canDelete = false;
            break;
        }
    }
    return canDelete;
}

function deleteDeptChkUI(elId) { //dept MUST NOT be in use before we can delete it! THIS IS A non-save function!
    var canDelete = true;
    var deptCode = cleanKrCharsOnly(docElId(elId).value);

    if (deptCode !== "" && deptExists(deptCode) === true && deleteDepartmentChk(deptCode) !== true) { //is the dept being used in any course?
        canDelete = false;

        window.mscAlert({
            title: '',
            subtitle: 'The department: ' + deptCode + ' is currently assigned to one or more courses and cannot be deleted.'
        });
    }
    return canDelete; //otherwise, is OK to hide and clear for deletion
}

function saveUpdatedDepts() {
    var alldepts = docElId('deptEDIT').childNodes;
    var newDeptList = [];
    var deletedList = [];
    var newShortcode,
        newDescription,
        targetIndex,
        deptObj,
        len,
        grpsRef,
        targetShortcode,
        isStillHere,
        i,
        ii,
        iii;

    len = alldepts.length;

    for (i = 0; i < len; i++) {
        if (alldepts[i].nodeType == 1) { //div container for each dept
            newShortcode = cleanKrCharsOnly(alldepts[i].childNodes[0].value);
            newDescription = cleanDngrChars(alldepts[i].childNodes[1].value);
            targetIndex = stats.indexData.depts.map(function(el) { return el.shortcode; }).indexOf(newShortcode);

            if (newShortcode !== undefined && newShortcode !== "") { //ignore any values set to empty string
                deptObj = {};
                deptObj.shortcode = newShortcode;
                deptObj.description = newDescription;
                newDeptList.push(deptObj); //building an array of the new list //push the new elements to stats.indexData.depts - if shortcode already exists, then overwrite the description
                if(targetIndex === -1) {
                    stats.indexData.depts.push(deptObj);
                } else {
                    stats.indexData.depts[targetIndex].description = newDescription;
                }
            }
        }
    }
    len = stats.indexData.depts.length;

    if (len) {
        stats.indexData.depts.sort(function (a, b) {
            return a.shortcode.localeCompare(b.shortcode);
        });
        stats.indexData.depts = uniqueArrOfObjs(stats.indexData.depts, "shortcode");
    }

    for (i = 0; i < len; i++) { //find out which elements of stats.indexData.depts are not in newDeptList and delete them if unused //push those depts to deletedList, otherwise leave them be
        targetShortcode = stats.indexData.depts[i].shortcode;
        isStillHere = newDeptList.map(function(el) { return el.shortcode; }).indexOf(targetShortcode);
        if (isStillHere === -1) {
            if (deleteDepartmentChk(targetShortcode) === true){ //can it be deleted? true if YES, false if exists in a course
               deletedList.push(targetShortcode);
            }
        }
    }
    len = deletedList.length;

    for (i = 0; i < len; i++) { //delete elements of deletedList from stats.indexData.depts
        for (ii = stats.indexData.depts.length-1; ii >= 0; ii--) {
            if (stats.indexData.depts[ii].shortcode === deletedList[i]) {
                stats.indexData.depts.splice(ii,1);
            }
        }
    }
    populateNewCourseDepts(); //rebuild the select.options under courses (regardless of where the change was made)
    grpsRef = stats.settings.deptGrps;

    if (grpsRef.length && len) { //delete any instances of the deletedList elements that exist in stats.settings.deptGrps (not changing the number of nested groups)
        for (i = 0; i < len; i++) {
            for (ii = 0; ii < grpsRef.length; ii++) {
                for (iii = grpsRef[ii].length-1; iii >= 0; iii--) {
                    if (grpsRef[ii][iii] === deletedList[i]) {
                        grpsRef[ii].splice(iii,1);
                    }
                }
            }
        }
    }
    chkDeptGrpsAfterEdit(); //...chk for any group becoming empty (and change dataset value if so)

    if (docElId("setting-section").classList.contains("nodisplay")) {
        displayUpdatedDeptGroups(); //rebuild the textContent of dept groups displayed on the main UI
    }
    else {
        getAllDeptsOnUI(); //rebuild the list of departments shown for groups in schedule settings
        rebuildDeptGrpString(); //rebuild the list of dept GROUPS defined in schedule settings
    }
    exitEDITdepts();
}

function deptHelpInfo(sParam){
    var assgndDepts = [];
    var elRef = scheduleData[sParam].cRef;
    var len = elRef.length;
    var uniqueDepts,
        i;

    for (i = 0; i < len; i++) {
       assgndDepts.push(courseData[elRef[i]].dept);
    }
    assgndDepts.sort();
    uniqueDepts = uniqueValues(assgndDepts);
    len = uniqueDepts.length;

    for (i = 0; i < len; i++) {
        uniqueDepts[i] = '\n' + uniqueDepts[i] + ' = ' + deptRef(uniqueDepts[i]);
    }
    return uniqueDepts;
}

function deptRef(dept){
    var lookupValue = stats.indexData.depts.filter( function (el) {
        return el.shortcode === dept;
    })[0];

    if (lookupValue == undefined) { return ""; }

    return lookupValue.description;
}

function getNewDeptsFromCSV() {
    var len = stats.newCourses.length;
    var dptIdx,
        deptObj,
        i;

    for (i = 0; i < len; i++) { //put new depts into stats.newDepts
        if (stats.newCourses[i] == undefined) { continue; }

        dptIdx = stats.indexData.depts.map(function(el) { return el.shortcode; }).indexOf(stats.newCourses[i].dept);

        if (dptIdx === -1) {
            deptObj = {};
            deptObj.shortcode = stats.newCourses[i].dept;
            deptObj.description = "";
            stats.newDepts.push(deptObj);
        }
    }
    if (stats.newDepts.length > 1) {
        stats.newDepts.sort(function (a, b) {
            return a.shortcode.localeCompare(b.shortcode);
        });
        stats.newDepts = uniqueArrOfObjs(stats.newDepts, "shortcode");
    }
}

function pushNewDeptsFromCSV() {
    var len = stats.newDepts.length;
    var i;

    if (len) {
        for (i = 0; i < len; i++) {
            stats.indexData.depts.push(stats.newDepts[i]);
        }
        if (stats.indexData.depts.length > 1) {
            stats.indexData.depts.sort(function (a, b) {
                return a.shortcode.localeCompare(b.shortcode);
            });
        }
        stats.newDepts = [];
    }
    delete stats.newDepts;
}

/**********************Defining Department Groups (user)***************************/

function defineDeptGrp(optId, bool) {
    var grpIndex = Number((docElId('newgroupid')).dataset.grpindex);
    var optIdNode = docElId(optId);
    var deptName = optIdNode.dataset.deptname;
    var stsRef = stats.settings.deptGrps;

    if (bool === true) { //add a department to a group
        optIdNode.style.backgroundColor = "#3498db";
        optIdNode.style.color = "#ffffff";
        optIdNode.style.borderColor = "#3498db";

        if (!stsRef.length || !stsRef[grpIndex]) { stats.settings.deptGrps.push([]); }
        if (stsRef[grpIndex].indexOf(deptName) === -1) { stats.settings.deptGrps[grpIndex].push(deptName); }
        return;
    }
    //subtract a department from a group
    optIdNode.style.backgroundColor = "";
    optIdNode.style.color = "";
    optIdNode.style.borderColor = "";

    stsRef = stats.settings.deptGrp;

    if (!stsRef[grpIndex]) { return; }
    if (stsRef[grpIndex].length && stsRef[grpIndex].indexOf(deptName) !== -1) {
        stats.settings.deptGrps[grpIndex].splice(stats.settings.deptGrps[grpIndex].indexOf(deptName), 1);
    }
}

function deleteDeptGroupViaUI(el) { //identifying the clicked list to remove from deptGrp array
    if (el.target !== el.currentTarget) {
        if ((el.target.id).substring(0, 6) == "remove") {
            var indexForDeletion = Number(el.target.id.substring(6));

            if (stats.settings.deptGrps[indexForDeletion]) {
                rebuildDeptGrpDefinitions(indexForDeletion);
            }
        }
    }
    el.stopPropagation();
}

function rebuildDeptGrpDefinitions(indexForDeletion) {
    stats.settings.deptGrps.splice(indexForDeletion, 1); //remove the corresponding array in deptGrps
    docElId('newgroupid').dataset.grpindex = stats.settings.deptGrps.length; //update data-grpindex...(#newgroupid)
    rebuildDeptGrpString();
}

//KLINICS
//using deleteCourseNoWarning() to unassign and destroy klinics
//NOTE: deleteCourseNoWarning() includes a call to: removeAssignmentViaUI() which - in turn - includes a call to toggleColorsOnOff();

function defineKlinics() { //define klinics through the UI...
    if (!stats.indexData.depts.length) { //check that any dept exists (cannot define courses without cat.s or depts existing)
        window.mscAlert({
            title: '',
            subtitle: 'Please define at least one department first.\n(New course or category -> Edit departments)'
        });
        return;
    }
    hideEl('displayOverrides');
    docElId('left').style.visibility = 'hidden';
    docElId('right').style.visibility = 'hidden';
    initKlinicListeners();
    initKlinicsEditing();
    showEl('defineklinics');
}

function exitUpdateKlinics() {
    hideEl('defineklinics');
    removeKlinicListeners();
    editorHandlerOff();
    docElId('left').style.visibility = 'visible';
    docElId('right').style.visibility = 'visible';
    showEl('displayOverrides');
}

function clearKlinicInputs(elId) { //clear the inputs and hide the container when delete button is hit (non-destructive delete)
    var defParam = elId.substring(6); //"kldel_"

    docElId("klnm_" + defParam).value = "";
    docElId("klfn_" + defParam).value = "";
    hideEl("kl_" + defParam);
}

function dupsChk(dupsArr, bool) {
    var i;

    if (bool === true) {
        for (i = 0; i< dupsArr.length; i++) {
            dupsArr[i] = dupsArr[i].toLowerCase();
        }
    }
    return (dupsArr.length !== uniqueValues(dupsArr).length); //true if there were dup.s
}

function holdKlinic(){ //onchange handler, @mainUIlisteners
    if (docElId("klinicHold").checked) {
        stats.tempKlinic.isHeld = true;
        return;
    }
    stats.tempKlinic.isHeld = false;
}

function klinicLock(state) { //force state from code
    if (state === "on") {
        docElId("klinicHold").checked = true;
    } else {
        docElId("klinicHold").checked = false;
    }
    holdKlinic();
}

function klinicDayHrToStr(dayHrId){ //a klinic only has one hour [0,0]
    var replaceVal = config.monToSatKr;
    var timeStr = "" + replaceVal[dayHrId[0]] + (('0' + (dayHrId[1] + Number(config.uiTimeInputStartHr))).slice(-2)) + ":00"; //formerly "dayHrId[1] + 9"

    return timeStr;
}

function klinicCatChk() {
    var len,
        i;

    len = stats.catData.length;

    if (len) {
        for (i = 0; i < len; i++) {
            if (stats.catData[i][0] === "CLINIC") {
                return;
            }
        }
    }
    stats.catData.push(["CLINIC", 0, buildDefaultScheduleUiArr(0)]); //update stats.catData if cat "CLINIC" not found
    len = stats.catData.length; //length has changed!

    displayNewCat(len);
    docElId("courselist" + len).setAttribute("class", "show");
}

function makeNewKlinicRef(elId, tempKlinicName) {
    var newcParam = createOneKlinic(elId, tempKlinicName);
    var len = stats.catData.length;
    var container,
        i;

    if (newcParam == undefined) { return; } //createOneKlinic creates the cat "CLINIC" if none exists, this is a failsafe for an internal error

    for (i = 0; i < len; i++) {
        if (stats.catData[i][0] === courseData[newcParam[1]].cat) {
            container = i + 1;
            break;
        }
    }
    displayNewCourseRef(newcParam[1], container);
    setAssignmentViaUI(newcParam[0], newcParam[1]); //make the assignment
}

function findInKlinics(el) { //identify the clicked element in "klinics-section"
    if (el.target !== el.currentTarget) {
        if ((el.target.id).substring(0, 6) === "kldel_") {
            clearKlinicInputs(el.target.id);
        }
    }
}

function pushNewKlinicDefsFromCSV() {
    var len = stats.newKlinicDefs.length;
    var kIdx,
        i;

    if (len) {
        if (!catExists("CLINIC")) {
            createNewCat(false, "CLINIC");
        }
        for ( i = 0; i < len; i++) {
            kIdx = stats.indexData.klinics.map(function(el) { return el.name; }).indexOf(stats.newKlinicDefs[i].name);
            if (kIdx === -1) {
                stats.indexData.klinics.push(stats.newKlinicDefs[i]);
            }
        }
        stats.indexData.klinics.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        stats.newKlinicDefs = [];
    }
    delete stats.newKlinicDefs;
}

//LOCAL STORAGE

function chkLocalStorage() {
    var stats = window.localStorage.getItem('lastStats'); //null if no item exists
    var cData = window.localStorage.getItem('lastCourseData'); //null if no item exists
    var sData = window.localStorage.getItem('lastScheduleData'); //null if no item exists
    var csvStr = window.localStorage.getItem('lastCsvStrs'); //null if no item exists
    var cfg = window.localStorage.getItem('lastCfg'); //null if no item exists
    var lastSession;

    if (stats === null || cData === null || sData === null || cfg === null) {
        window.mscAlert({
            title: '',
            subtitle: 'No previous session available.'
        });
        return;
    };
    lastSession = "[" + stats + "," + cData + "," + sData;
    if (csvStr !== null) { lastSession += "," + csvStr; } else { lastSession += ",{}" }
    lastSession += "," + cfg + "]";

    parseJSONresultFromFile(lastSession, false, 1);
}

function saveToLocalStorage() {
    var removeCount,
        cfg,
        i;

    if (isObjEmpty(stats)) { return; } //if dataObjects got cleared because a bad file was uploaded, then don't clear the previous localStorage
    if (!stats.hasOwnProperty('catData')) { return; } //this might be a "settings only" file
    if (stats.catData.length) { //remove any deleted cat.s
        for (i = stats.catData.length - 1; i >= 0; i--) {
            if ((stats.catData[i][0]).substring(0, 8) === "$deleted") {
                stats.catData.splice(i, 1);
            }
        }
        removeCount = 0; //attempt to remove any surplus empty schedules
        if (stats.indexData.schedules.length > stats.indexData.courses.length / (stats.settings.maxHours / 2)) {
            removeCount = stats.indexData.schedules.length - Math.round(stats.indexData.courses.length / (stats.settings.maxHours / 2));
        }
        for (i = stats.indexData.schedules.length - 1; i >= 0; i--) {
            if (scheduleData[stats.indexData.schedules[i]].cRef.length) {
                continue;
            }
            else if (scheduleData[stats.indexData.schedules[i]].dayOff !== 6) {
                continue;
            } else {
                removeCount--;
                if (removeCount <= 0) {
                    break;
                } else {
                    delete scheduleData[stats.indexData.schedules[i]]; //remove the empty schedule from the list of current schedules
                    stats.indexData.schedules.splice(i, 1);
                }
            }
        }
    }
    cfg = {};
    cfg.uiTimeInputStartHr = config.uiTimeInputStartHr; //json must have config value or dayhrs could get messed up
    cfg.uiScheduleNumOfHrsPerDay = config.uiScheduleNumOfHrsPerDay; //json must have config value or dayhrs could get messed up

    window.localStorage.clear();
    window.localStorage.setItem('lastStats', JSON.stringify(stats));
    window.localStorage.setItem('lastCourseData', JSON.stringify(courseData));
    window.localStorage.setItem('lastScheduleData', JSON.stringify(scheduleData));
    window.localStorage.setItem('lastCsvStrs', JSON.stringify(csvStrings));
    window.localStorage.setItem('lastCfg', JSON.stringify(cfg));
}

function resetFromBadJson(errNum) {
    var msg = [
        'The JSON file you have supplied cannot be used.',
        'The last saved session is unusable and has been deleted.'
    ]

    stats = {};
    courseData = {};
    scheduleData = {};
    csvStrings = {
        courseCat: setDefaultCsvString("courseCat"),
        courseNum: setDefaultCsvString("courseNum"),
        courseTime: setDefaultCsvString("courseTime"),
        courseRm: setDefaultCsvString("courseRm"),
        courseTchr: setDefaultCsvString("courseTchr"),
        oldNum: setDefaultCsvString("oldNum"),
        newNum: setDefaultCsvString("newNum")
    };
    getConfigFromParsingScreen();
    docElId('inputJSON').reset();
    docElId('settingsOnly').checked = false;
    docElId("configStartHr").disabled = false;
    docElId("configNumOfHrsPerDay").disabled = false;
    showEl("parsing");
    window.mscAlert({
        title: '',
        subtitle: msg[errNum]
    });
    if (errNum === 1) { window.localStorage.clear(); }
}

function backUpSettings() {
    window.localStorage.setItem('statsBkUp', JSON.stringify(stats));
}

function restoreSettings() {
    var storedStats = JSON.parse(window.localStorage.getItem('statsBkUp')); //null if no item exists

    stats = {};
    if (!isObjEmpty(storedStats)) { //if it exists AND has props: true
        stats = storedStats;
    }
    window.localStorage.removeItem('statsBkUp');
}

//EXPORTING DATA

function createFileAndDownload(fileName, fileType, data) {
    var rightNow = cleanWsReturnUnderscores((new Date()).toDateString()); //.replace(/\s/g, '_');
    var dlName = "" + fileName + "_" + rightNow  + "." + fileType;
    var dataStr,
        blob;

    if (fileType === "csv") {
        dataStr = window.Papa.unparse(data);
    } else {
        dataStr = data;
    }
    blob = new Blob([dataStr], {type: config.uriTypes[fileType]});
    window.saveAs(blob, dlName);
}

function exportCsvErrors(headers, arr) {
    var csvObj = { fields:[], data:[] };

    csvObj.fields = headers;
    csvObj.data = arr;
    createFileAndDownload("CSV_ERRORS", "csv", csvObj);
}

function dayhrAsStr(num, modifier) {
    return ("0" + ((num + Number(config.uiTimeInputStartHr) + modifier).toString())).slice(-2);
}

function saveCourseDataAsCSV() {
    var csvObj = {
        fields: [csvStrings.courseCat, csvStrings.courseNum, csvStrings.courseTchr, "대상학과", csvStrings.courseTime, csvStrings.courseRm],
        data: []
    };
    var replaceVal = ["월", "화", "수", "목", "금", "토"];
    var len = stats.indexData.courses.length;
    var tMap = {};
    var record = [];
    var kTchrIdx,
        cRef,
        i;

    for (i = 0; i < len; i++) {
        cRef = courseData[stats.indexData.courses[i]];
        tMap.tmeStr = "";
        tMap.rmStr = "";
        tMap.numStr = "00";
        record = [cRef.cat, cRef.name, "", "", "", ""];
        tMap.krDay0 = replaceVal[cRef.dayhr[0][0]];
        tMap.krDay1 = replaceVal[cRef.dayhr[1][0]];
        tMap.dyhr01 = cRef.dayhr[0][1];
        tMap.dyhr11 = cRef.dayhr[1][1];
        tMap.sRef = scheduleData[cRef.assgn]; //can be undefined

        if (cRef.assgn !== "") {
            if (tMap.sRef.hasOwnProperty('tchr')) {
                kTchrIdx = stats.teachers.map(function(el) { return el.en; }).indexOf(tMap.sRef.tchr); //using the .kor name if it exists

                if (kTchrIdx !== -1 && stats.teachers[kTchrIdx].kor !== "") {
                   record[2] = stats.teachers[kTchrIdx].kor;
                } else {
                   record[2] = tMap.sRef.tchr;
                }
            }
        }
        if (cRef.duration === "onehour") {
            tMap.numStr = dayhrAsStr(tMap.dyhr01, 0);
            tMap.tmeStr += "" + tMap.krDay0 + "(" + tMap.numStr + ":00∼" + tMap.numStr + ":50) ";
            tMap.numStr = dayhrAsStr(tMap.dyhr11, 0);
            tMap.tmeStr += "" + tMap.krDay1 + "(" + tMap.numStr + ":00∼" + tMap.numStr + ":50)";
        }
        if (cRef.duration === "twohour" || cRef.duration === "threehour") {
            tMap.numStr = dayhrAsStr(tMap.dyhr01, 0);
            tMap.tmeStr += "" + tMap.krDay0 + "(" + tMap.numStr + ":00∼";

            if (cRef.duration === "twohour") { tMap.numStr = dayhrAsStr(tMap.dyhr01, 1); }
            if (cRef.duration === "threehour") { tMap.numStr = dayhrAsStr(tMap.dyhr01, 2); }
            tMap.tmeStr += tMap.numStr + ":50)";
        }
        if (cRef.duration === "ninety") {
            tMap.numStr = dayhrAsStr(tMap.dyhr01, 0);
            tMap.tmeStr += "" + tMap.krDay0 + "(" + tMap.numStr;
            tMap.numStr = dayhrAsStr(tMap.dyhr01, 1);

            if (cRef.allowFollow[0] === true) { tMap.tmeStr += ":00∼" + tMap.numStr + ":15) "; }
            if (cRef.allowFollow[0] === false)  { tMap.tmeStr += ":30∼" + tMap.numStr + ":45) "; }

            tMap.numStr = dayhrAsStr(tMap.dyhr11, 0);
            tMap.tmeStr += "" + tMap.krDay1 + "(" + tMap.numStr;
            tMap.numStr = dayhrAsStr(tMap.dyhr11, 1);

            if (cRef.allowFollow[1] === true) { tMap.tmeStr += ":00∼" + tMap.numStr + ":15)"; }
            if (cRef.allowFollow[1] === false) { tMap.tmeStr += ":30∼" + tMap.numStr + ":45)"; }
        }
        if (cRef.duration === "klinichour") {
            tMap.numStr = dayhrAsStr(tMap.dyhr01, 0);
            tMap.tmeStr += "" + tMap.krDay0 + "(" + tMap.numStr + ":00∼" + tMap.numStr + ":50)";
        }
        record[4] = tMap.tmeStr;
        tMap.rmStr = cRef.dept + cRef.rm.a;

        if (cRef.rm.hasOwnProperty("b") && cRef.rm.a !== cRef.rm.b) { tMap.rmStr += " " + cRef.dept + cRef.rm.b; }
        record[5] = tMap.rmStr;
        csvObj.data.push(record);
    }
    createFileAndDownload("AllCourseData_", "csv", csvObj);
}

function saveSessionAsJSON() {
    var removeCount = 0;
    var statsClone = JSON.parse(JSON.stringify(stats)); //deep clone stats and scheduleData...DO NOT AFFECT CURRENT SESSION!
    var scheduleDataClone = JSON.parse(JSON.stringify(scheduleData));
    var cfg = {uiTimeInputStartHr:config.uiTimeInputStartHr,uiScheduleNumOfHrsPerDay:config.uiScheduleNumOfHrsPerDay}; //json must have config value or dayhrs could get messed up
    var TEXTdoc = [];
    var i;

    if (statsClone.catData.length) { //remove any deleted cat.s
        for (i = statsClone.catData.length - 1; i >= 0; i--) {
            if ((statsClone.catData[i][0]).substring(0, 8) === "$deleted") {
                statsClone.catData.splice(i, 1);
            }
        }
    }
    if (statsClone.indexData.schedules.length > statsClone.indexData.courses.length / (statsClone.settings.maxHours / 2)) { //attempt to remove any surplus empty schedules
        removeCount = statsClone.indexData.schedules.length - Math.round(statsClone.indexData.courses.length / (statsClone.settings.maxHours / 2));
    }
    for (i = statsClone.indexData.schedules.length - 1; i >= 0; i--) {
        if (scheduleDataClone[statsClone.indexData.schedules[i]].cRef.length) { continue; }
        if (scheduleDataClone[statsClone.indexData.schedules[i]].dayOff !== 6) { continue; }
        removeCount--;

        if (removeCount <= 0) {
            break;
        } else {
            delete scheduleDataClone[statsClone.indexData.schedules[i]]; //remove the empty schedule from the list of current schedules
            statsClone.indexData.schedules.splice(i, 1);
        }
    }
    TEXTdoc.push(statsClone);
    TEXTdoc.push(courseData);
    TEXTdoc.push(scheduleDataClone);
    TEXTdoc.push(csvStrings);
    TEXTdoc.push(cfg);
    createFileAndDownload("Schedules_", "json", JSON.stringify(TEXTdoc));
}

//ROOM SPLITS

function addDeptsFromGrpArrIfNotExist(arr) {
    var len = arr.length;
    var el,
        i;

    if (!len) { return; }
    if (!stats.hasOwnProperty("indexData")) { return; };
    if (!stats.indexData.hasOwnProperty("depts")) { return; };

    for (i = 0; i < arr.length; i++) {
        el = arr[i];

        if (deptExists(el) === true) { continue; }

        stats.indexData.depts.push({shortcode: el, description: ""});
    }
}

function chkSettingsAndAssgn(jsonObj) { //required to throw error
    var idx,
        objRef,
        arrRef,
        keys,
        len,
        i,
        ii;

    if (!jsonObj.hasOwnProperty("settings")) { throw new Error("Prop 'settings' is undefined."); }
    if (!jsonObj.settings.hasOwnProperty("overrides")) { throw new Error("Prop 'overrides' is undefined."); }
    if (jsonObj.settings.deptGrpsSetBy === "day" || jsonObj.settings.deptGrpsSetBy === "week") { stats.settings.deptGrpsSetBy = jsonObj.settings.deptGrpsSetBy; }
    if (jsonObj.settings.maxHours <= config.uiScheduleNumOfHrsPerDay * 5) { stats.settings.maxHours = jsonObj.settings.maxHours; }
    if (jsonObj.settings.maxHrsPerDay <= config.uiScheduleNumOfHrsPerDay) { stats.settings.maxHrsPerDay = jsonObj.settings.maxHrsPerDay; }
    if (jsonObj.settings.maxSeqHrs === 2 || jsonObj.settings.maxSeqHrs === 3) { stats.settings.maxSeqHrs = jsonObj.settings.maxSeqHrs; }

    keys = Object.keys(jsonObj.settings.overrides);
    keys.forEach( function(prop) {
        if (typeof jsonObj.settings.overrides[prop] === "boolean" && stats.settings.overrides[prop] !== undefined) {
            stats.settings.overrides[prop] = jsonObj.settings.overrides[prop];
        }
    });
    if (jsonObj.settings.hasOwnProperty("deptGrps") && jsonObj.settings.deptGrps.length) {
        for (i = 0; i < jsonObj.settings.deptGrps.length; i++) {
            arrRef = jsonObj.settings.deptGrps[i].map( function(el) { return cleanKrCharsOnly(el); }).filter( function (elem) { return elem !==""; });

            if (!arrRef.length) { continue; }

            idx = -1;
            for (ii = 0; ii < stats.settings.deptGrps.length; ii++) {
                if ((arrRef).identical(stats.settings.deptGrps[ii])) {
                    idx = 1;
                    break;
                }
            }
            if (idx !== 1) {
                addDeptsFromGrpArrIfNotExist(arrRef); //depts not indexed in: stats.indexData.depts added now (if stats has indexData && depts props)
                stats.settings.deptGrps.push(arrRef);
            }
        }
    }
    if (jsonObj.hasOwnProperty("teachers") && jsonObj.teachers.length) {
        for (i = 0; i < jsonObj.teachers.length; i++) {
            if (!jsonObj.teachers[i].hasOwnProperty("en")) { throw new Error("Prop 'en' is undefined."); }

            jsonObj.teachers[i].en = cleanNameCharsOnly(jsonObj.teachers[i].en);
            objRef = jsonObj.teachers[i];

            if (objRef.en ==="") { continue; }
            if (tchrExists(objRef.en) === false){
                stats.teachers.push(objRef);
                continue;
            }
            stats.teachers[idx].kor = objRef.kor || stats.teachers[idx].kor;
        }
    }
    if (!jsonObj.hasOwnProperty("indexData")) { return; }
    if (jsonObj.indexData.hasOwnProperty("klinics") && jsonObj.indexData.klinics.length) { //klinic definitions only

        for (i = 0; i < jsonObj.indexData.klinics.length; i++) {
            if (!jsonObj.indexData.klinics[i].hasOwnProperty("name")) { throw new Error("Prop 'name' is undefined."); }
            if (!jsonObj.indexData.klinics[i].hasOwnProperty("fullname")) { throw new Error("Prop 'fullname' is undefined."); }
            if (!jsonObj.indexData.klinics[i].hasOwnProperty("dept")) { throw new Error("Prop 'dept' is undefined."); }
            if (!jsonObj.indexData.klinics[i].hasOwnProperty("rm")) { throw new Error("Prop 'rm' is undefined."); }
            if (!jsonObj.indexData.klinics[i].rm.hasOwnProperty("a")) { throw new Error("Prop 'rm.a' is undefined."); }

            jsonObj.indexData.klinics[i].dept = cleanKrCharsOnly(jsonObj.indexData.klinics[i].dept);
            jsonObj.indexData.klinics[i].rm.a = cleanRemoveKrChars(cleanDngrCharsAndWs(jsonObj.indexData.klinics[i].rm.a));

            if (jsonObj.indexData.klinics[i].dept ==="") { throw new Error("Value of 'dept' is an empty string."); }
            if (jsonObj.indexData.klinics[i].rm.a ==="") { throw new Error("Value of 'rm.a' is an empty string."); }

            objRef = jsonObj.indexData.klinics[i];
            idx = stats.indexData.klinics.map(function(el) { return el.name; }).indexOf(objRef.name);

            if (idx === -1) {
                if (jsonObj.indexData.hasOwnProperty("depts") && deptExists(jsonObj.indexData.klinics[i].dept) === false) { //depts not indexed in: stats.indexData.depts added now (if stats has depts prop)
                    jsonObj.indexData.depts.push(jsonObj.indexData.klinics[i].dept);
                }
                stats.indexData.klinics.push(objRef);
            } else {
                stats.indexData.klinics[idx].fullname = objRef.fullname; //if this is an empty string (err) then it will prompt user to define in the edit klinics screen
                stats.indexData.klinics[idx].dept = objRef.dept; //if this is not indexed (err) then it will prompt user to select in the edit klinics screen
                stats.indexData.klinics[idx].rm = {};
                stats.indexData.klinics[idx].rm.a = objRef.rm.a;
            }
        }
    }
    if (jsonObj.indexData.hasOwnProperty("depts") && jsonObj.indexData.depts.length) {

        for (i = 0; i < jsonObj.indexData.depts.length; i++) {
            if (!jsonObj.indexData.depts[i].hasOwnProperty("shortcode")) { throw new Error("Prop 'shortcode' is undefined."); }

            jsonObj.indexData.depts[i].shortcode = cleanKrCharsOnly(jsonObj.indexData.depts[i].shortcode);
            objRef = jsonObj.indexData.depts[i];

            if (objRef.shortcode ==="") { continue; }
            if (deptExists(objRef.shortcode) === false) {
                stats.indexData.depts.push(objRef);
                continue;
            }
            stats.indexData.depts[idx].description = objRef.description || stats.indexData.depts[idx].description;
        }
    }
}

function getErrorsForCreateOneCourse(idx, cName) {
    var errMsg = [
        "Please choose a " + config.courseNameNumLength + " digit course name greater than zero.",
        "A course named : " + cName + " already exists.\nPlease choose a different name.",
        "Please define all parameters.",
        "Classes cannot have overlapping times!",
        "Both classes cannot start at the same time!"
    ];

    window.mscAlert({
        title: '',
        subtitle: errMsg[idx]
    });
    return;
}

function createOneCourse() { //creates a new course via user input...
    var dParam = defineNewCourseDuration(); //returns: duration (string)
    var valObj = defineNewCourseStrings(dParam); //returns {}
    var dayHrMapParam = getNewDayHrMap(dParam); //returns: [dayHr,allowFollow]
    var newCourseId = "c1";
    var len = stats.indexData.courses.length;
    var i;

    if (len) { newCourseId = "c" + ((Number((stats.indexData.courses[len - 1]).substring(1))) + 1); }

    if (valObj.newName.length !== config.courseNameNumLength || Number(valObj.newName) < 1 || Number.isNaN(Number(valObj.newName))) {
        getErrorsForCreateOneCourse(0);
        return "nada";
    }
    for (i = 0; i < len; i++) { //check that the course name is unique
        if (courseData[stats.indexData.courses[i]].name === valObj.newName) {
            getErrorsForCreateOneCourse(1, valObj.newName);
            return "nada";
        }
    }
    if (valObj.newName === "" || valObj.newCat === "" || valObj.newDept === "" || valObj.newRm.a === "") { //check for empty inputs
        getErrorsForCreateOneCourse(2);
        return "nada";
    }
    //check for sequential dayHr overlaps in 'ninety' min. courses
    if (dParam === "ninety" && dayHrMapParam[0][0][0] === dayHrMapParam[0][1][0]) { //if the days are the same...
        if ((dayHrMapParam[0][0][1]) + 1 === dayHrMapParam[0][1][1]) { //if the hours are sequential...
            if (dayHrMapParam[1][0] !== true || (dayHrMapParam[1][0] === true && dayHrMapParam[1][1] !== false)) {
                getErrorsForCreateOneCourse(3);
                return "nada";
            }
        } else if (dayHrMapParam[0][0][1] === (dayHrMapParam[0][1][1]) + 1) { //if the hours (reversed) are sequential..
            if (dayHrMapParam[1][1] !== true || (dayHrMapParam[1][1] === true && dayHrMapParam[1][0] !== false)) {
                getErrorsForCreateOneCourse(3);
                return "nada";
            }
        }
    }
    //check for identical dayHrs....
    if (dayHrMapParam[0][0].identical(dayHrMapParam[0][1])) {
        getErrorsForCreateOneCourse(4);
        return "nada";
    }
    stats.indexData.courses.push(newCourseId);
    courseData[newCourseId] = {};
    courseData[newCourseId].cat = valObj.newCat;
    courseData[newCourseId].dept = valObj.newDept;
    courseData[newCourseId].rm = {};
    courseData[newCourseId].rm.a = valObj.newRm.a;

    if (valObj.newRm.hasOwnProperty("b")) {
        courseData[newCourseId].rm.b = valObj.newRm.b;
    }
    courseData[newCourseId].dayhr = dayHrMapParam[0];
    courseData[newCourseId].name = valObj.newName;
    courseData[newCourseId].times = valObj.newTimes;
    courseData[newCourseId].duration = dParam;
    courseData[newCourseId].assgn = "";

    if (dayHrMapParam[1].length) { courseData[newCourseId].allowFollow = dayHrMapParam[1]; }
    //stats.catData.length has been chked by: makeNewCourseRef() before this function had been called...
    //update stats.catData: the numOfOccurances and the dayHrMap
    for (i = 0; i < stats.catData.length; i++) {
        if (stats.catData[i][0] === courseData[newCourseId].cat) {
            stats.catData[i][1] += 1;
            stats.catData[i][2][courseData[newCourseId].dayhr[0][0]][courseData[newCourseId].dayhr[0][1]] += 1;
            stats.catData[i][2][courseData[newCourseId].dayhr[1][0]][courseData[newCourseId].dayhr[1][1]] += 1;
            if (courseData[newCourseId].duration === "threehour") {
                stats.catData[i][2][courseData[newCourseId].dayhr[0][0]][courseData[newCourseId].dayhr[0][1] + 1] += 1; //middle hour
            }
            break;
        }
    }
    return newCourseId;
}

function createOneCourseFromCSV(newCourseId, cObj) {
    var i;

    stats.indexData.courses.push(newCourseId);
    courseData[newCourseId] = {};
    courseData[newCourseId].cat = cObj.cat;
    courseData[newCourseId].dept = cObj.dept;
    courseData[newCourseId].rm = {};
    courseData[newCourseId].rm.a = cObj.rm.a;

    if (cObj.rm.hasOwnProperty("b")) {
        courseData[newCourseId].rm.b = cObj.rm.b;
    }
    courseData[newCourseId].dayhr = cObj.dayhr;
    courseData[newCourseId].name = cObj.name;
    courseData[newCourseId].times = cObj.times;
    courseData[newCourseId].duration = cObj.duration;
    courseData[newCourseId].assgn = "";

    if (cObj.hasOwnProperty("allowFollow")) { courseData[newCourseId].allowFollow = cObj.allowFollow; } //update stats.catData: the numOfOccurances and the dayHrMap
    for (i = 0; i < stats.catData.length; i++) {
        if (stats.catData[i][0] === courseData[newCourseId].cat) {
            stats.catData[i][1] += 1;
            stats.catData[i][2][courseData[newCourseId].dayhr[0][0]][courseData[newCourseId].dayhr[0][1]] += 1;
            stats.catData[i][2][courseData[newCourseId].dayhr[1][0]][courseData[newCourseId].dayhr[1][1]] += 1;

            if (courseData[newCourseId].duration === "threehour") {
                stats.catData[i][2][courseData[newCourseId].dayhr[0][0]][courseData[newCourseId].dayhr[0][1] + 1] += 1; //middle hour
            }
            break;
        }
    }
}

function insertNewCoursesFromCSV(bool) {
    var highestCourseNum = 0;
    var newCourseId,
        ovwrRef,
        cRef,
        cParam,
        sParam,
        i,
        ii;

    pushNewDeptsFromCSV();
    if (bool === true) { //if the overwrite-course has a different cat to the current one: place that record back into: newCourseNames and splice it from: stats.indexData.overwrites
        for ( i = stats.overwriteCourses.length - 1; i >= 0; i-- ) {
            for ( ii = stats.indexData.courses.length -1; i >= 0; ii-- ) {
                ovwrRef = stats.overwriteCourses[i];
                cRef = courseData[stats.indexData.courses[ii]];

                if (ovwrRef.name === cRef.name) {
                    if (ovwrRef.cat !== cRef.cat) {
                        stats.newCourses.push(ovwrRef);
                        stats.overwriteCourses.splice(i, 1);
                        deleteCourseNoWarning(stats.indexData.courses[ii]); //there is no overwrite for this course, it will be simply replaced (handles unassignment and UI also)
                    }
                    break; //...out of the nested loop: (ii)
                }
            }
        }
    }
    if (stats.indexData.courses.length) { highestCourseNum = Number((stats.indexData.courses[stats.indexData.courses.length - 1]).substring(1)); }
    if (stats.newCourses.length) {
        for ( i = 0; i < stats.newCourses.length; i++ ) {
            cRef = stats.newCourses[i];

            if (!catExists(cRef.cat)) { createNewCat(false, cRef.cat); }
            highestCourseNum++; //increment the cParam by 1
            newCourseId = "c" + highestCourseNum + "";
            createOneCourseFromCSV(newCourseId, cRef);
        }
    }
    pushNewKlinicDefsFromCSV();
    if (bool === true) { //cache the sParam of the assignment, unassign the course (via the UI), change the data, attempt to reassign the course (via the UI)
        for ( i = 0; i < stats.overwriteCourses.length; i++) {
            ovwrRef = stats.overwriteCourses[i];
            cParam = objKeyFromPropVal(ovwrRef.name, courseData);
            cRef = courseData[cParam];
            sParam = "" + cRef.assgn;

            if(sParam !== "") { removeAssignmentViaUI(sParam, cParam); }
            cRef.dept = ovwrRef.dept;
            cRef.rm = {};
            cRef.rm.a = ovwrRef.rm.a;

            if (ovwrRef.rm.hasOwnProperty("b")) {
                cRef.rm.b = ovwrRef.rm.b;
            }
            cRef.dayhr = ovwrRef.dayhr;
            cRef.times = ovwrRef.times;
            cRef.duration = ovwrRef.duration;

            if (ovwrRef.hasOwnProperty("allowFollow")) { cRef.allowFollow = ovwrRef.allowFollow; }
            if(sParam !== "") {
                makeAssignment(sParam, cParam); //try to assign it again. If it fails, then it is because a check in makeAssignment failed
                //...test that the assignment passed again...and update the display if it did.
                if (!canAssignHereChk(sParam, cParam)) { //is the course assigned here? true if not assigned here, false if already assigned here
                    toggleColorsOnOff(sParam, cParam, "on");
                    updateCatListOnSchedule(sParam);
                    checkTooFewCourses(sParam, cParam);
                }
            }
        }
    }
    if(isObjEmpty(scheduleData)) { //ONLY if there are no schedules present!
        stats.indexData.schedules = [];
        defineInitBlankSchedules(true); //defines & populates: scheduleData and stats.indexData.schedules anew
    } else {
        defineInitBlankSchedules(false); //add extra schedules if needed
    }
    //now we need to refresh the UI and close the addNewCourses screen
    removeNewCourseArrays();
    resetTheWholeUI();
    loadStateFromData(true);
    exitChangesToCourse();
}

function updateKlinicInstances(klinicObj) { //if the definition for an existing klinic changes, the courseData records for each instance should be updated as well as the parameters shown under #references
    var sRef,
        cRef,
        i;

    for ( i = 0; i < stats.indexData.courses.length; i++) {
        sRef = stats.indexData.courses[i];
        cRef = courseData[sRef];

        if (cRef.cat === "CLINIC") {
            if (cRef.name === klinicObj.name){ //update the courseData record
                cRef.fullname = klinicObj.fullname;
                cRef.dept = klinicObj.dept;
                cRef.rm = {};
                cRef.rm.a = klinicObj.rm.a;
                rebuildKlinicReference(sRef);
            }
        }
    }
}

function errorsForSaveUpdatedKlinics(idx) {
    var errMsg = [
        "Each nickname can contain only English or Korean characters.",
        "Please complete each full name with an appropriate description.",
        "Please select the department.",
        "Please check that each nickname is unique",
        "Please check that each definition is unique."
    ];

    window.mscAlert({
        title: '',
        subtitle: errMsg[idx]
    });
    return;
}

function saveUpdatedKlinics() {
    var allKlinicDefs = docElId('klinic-section').childNodes;
    var holdingArr = [];
    var removalsArr = [];
    var kObj,
        kDefEl,
        dupNameChk,
        dupParamsChk,
        kIdx,
        i,
        ii;

    for (i = 0; i < allKlinicDefs.length; i++) { //loop through childNodes, clean the input values and place them in a list of records that mirrors: stats.indexData.klinics
        kDefEl = allKlinicDefs[i];
        if (kDefEl.nodeType == 1) { //inputs and select
            kObj = {};
            kObj.name = cleanRemoveAllWs(cleanNameCharsOnly(kDefEl.childNodes[0].value)); //ABSOLUTELY NO WHITESPACE!
            kObj.fullname = cleanDngrCharsAndWs(kDefEl.childNodes[1].value); //((kDefEl.childNodes[1].value).replace(/[,=<>$/'"&\t]/g, '')).replace(/[\s\t]+$/, '');
            kObj.dept = kDefEl.childNodes[2].value;
            kObj.rm = {};
            kObj.rm.a = cleanAlphaNumericAndDashOnlyChars(kDefEl.childNodes[3].value); // (kDefEl.childNodes[3].value).replace(/[^a-zA-Z0-9\-]/gmi, '');
            holdingArr.push(kObj);
        }
    }
    //run checks on the values
    if (holdingArr.length) {
        dupNameChk = [];
        dupParamsChk = [];

        for (i = holdingArr.length-1; i >= 0; i--) {
            if (holdingArr[i].name === "" && holdingArr[i].fullname === "") { //if BOTH nickname AND fullname inputs are blank: ignore and splice
                holdingArr.splice(i, 1);
            } else {
                if (holdingArr[i].name === "") { //if any nicknames OR fullnames are blank...
                    errorsForSaveUpdatedKlinics(0);
                    return;
                }
                if (holdingArr[i].fullname === "") {
                    errorsForSaveUpdatedKlinics(1);
                    return;
                }
                if (holdingArr[i].dept === "") { //check that a dept was selected (or face errors in courseData calls!)
                    errorsForSaveUpdatedKlinics(2);
                    return;
                }
                dupNameChk.push(holdingArr[i].name);
                dupParamsChk.push("" + holdingArr[i].fullname + holdingArr[i].dept + holdingArr[i].rm.a);
            }
        }
        if (dupsChk(dupNameChk, false) === true) { //check for duplicate descriptions...
            errorsForSaveUpdatedKlinics(3);
            return;
        }
        if (dupsChk(dupParamsChk, true) === true) {
            errorsForSaveUpdatedKlinics(4);
            return;
        }
    }
    if (holdingArr.length > 1) { //sort the array by .name
        holdingArr.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    for (i = 0; i < stats.indexData.klinics.length; i++) { //loop through stats.indexData.klinics and look for elem.s with nicknames that are absent in the holding arr
        kIdx = holdingArr.map(function(el) { return el.name; }).indexOf(stats.indexData.klinics[i].name);

        if (kIdx === -1) {
            removalsArr.push(stats.indexData.klinics[i].name);
        } else {
            updateKlinicInstances(holdingArr[kIdx]); //if the value is present, then update existing courses under that definition in case any parameters changed:
        }
    }
    //loop BACKWARDS through the removals arr and destroy COURSES with: cat === "CLINIC" && THAT NICKNAME that is not present
    if (removalsArr.length) {
        for (i = removalsArr.length-1; i >= 0; i--) {
            for (ii = stats.indexData.courses.length-1; ii >= 0; ii--) {
                kObj = stats.indexData.courses[ii];

                if (courseData[kObj].cat === "CLINIC" && courseData[kObj].name === removalsArr[i]) {
                    deleteCourseNoWarning(kObj);
                }
            }
        }
    }
    stats.indexData.klinics = []; //reset the current array

    for (i = 0; i < holdingArr.length; i++) {
        stats.indexData.klinics.push(holdingArr[i]); //push each elem of the holdingArr to: stats.indexData.klinics
    }
    exitUpdateKlinics();
}

//when you click on a Klinic button, the Id is held in stats.tempKlinic, any subsequent click on a schedule cell invokes createOneKlinic()
function createOneKlinic(elId, tempKlinicName) { //elId is the currently clicked schedule cell, klinicName is the value kept in stats.tempKlinic
    var elTokens = buildTokens(elId);
    var newCourseId = "c1";
    var dayHrArr,
        dayHrId,
        newCourseId,
        kIdx,
        cRef,
        sRef,
        i;
    //if this is not an empty cell, we must ignore the assignment
    if (elTokens.length !== 4) { return; }
    if (elTokens[1] !== 0) { return; }

    dayHrArr = [];
    dayHrId = [elTokens[2], elTokens[3]];
    dayHrArr.push(dayHrId, dayHrId); //duplicate 2nd hour

    if (stats.indexData.courses.length) { //(instances created a.k.a. createOneCourse)
        newCourseId = "c" + ((Number((stats.indexData.courses[stats.indexData.courses.length - 1]).substring(1))) + 1);
    }
    kIdx = stats.indexData.klinics.map(function(el) { return el.name; }).indexOf(tempKlinicName);

    if (!stats.indexData.klinics.length) { return; }
    if (kIdx === -1) { return; }

    sRef = stats.indexData.klinics[kIdx];
    stats.indexData.courses.push(newCourseId);
    courseData[newCourseId] = {};
    courseData[newCourseId].cat = "CLINIC";
    courseData[newCourseId].dept = sRef.dept;
    courseData[newCourseId].rm = {};
    courseData[newCourseId].rm.a = sRef.rm.a;
    courseData[newCourseId].dayhr = dayHrArr;
    courseData[newCourseId].name = sRef.name;
    courseData[newCourseId].fullname = sRef.fullname;
    courseData[newCourseId].times = klinicDayHrToStr(dayHrId);
    courseData[newCourseId].duration = "klinichour";
    courseData[newCourseId].assgn = "";

    for (i = 0; i < stats.catData.length; i++) { //update stats.catData: the numOfOccurances and the dayHrMap
        if (stats.catData[i][0] === courseData[newCourseId].cat) {
            stats.catData[i][1] += 1;
            stats.catData[i][2][courseData[newCourseId].dayhr[0][0]][courseData[newCourseId].dayhr[0][1]] += 1;
            break;
        }
    }
    if (stats.tempKlinic.isHeld === false) { stats.tempKlinic.kbtn = ""; }
    return [elTokens[0], newCourseId]; //return to: makeNewKlinicRef() - and not call this function...
}

function preFlightBuildStats() {
    var uniqueNewNames = [];
    var klinicDefinitions = [];
    var noOfKlinics = 0;
    var courseKeys = Object.keys(courseData); //because: stats is still === {} at this point!
    var cObjRef,
        kObj,
        i;

    for (i = 0; i < courseKeys.length; i++) {
        cObjRef = courseData[courseKeys[i]];

        if (cObjRef.cat === "CLINIC") {
            noOfKlinics += 1;
            kObj = {};
            kObj.name = cObjRef.name;
            kObj.fullname = cObjRef.name; //CLINIC fullname cannot be defined on the csv, so a prop with a value must be created
            kObj.dept = cObjRef.dept;
            kObj.rm = {};
            kObj.rm.a = cObjRef.rm.a;
            klinicDefinitions.push(kObj);
        } else {
            uniqueNewNames.push(cObjRef.name); //grab the regular course names while we are here - to look for dup.s (if not CLINIC)
        }
    }
    uniqueNewNames.sort(); //sort and filter uniqueNewNames, then compare its length to stats.indexData.courses (minus the klinics)
    uniqueNewNames = uniqueValues(uniqueNewNames);

    if (courseKeys.length - noOfKlinics !== uniqueNewNames.length) {
        stats = {};
        courseData = {};
        scheduleData = {};
        resetTheWholeUI();
        window.mscAlert({
            title: '',
            subtitle: 'Please check that each course has a unique name (ID).\nSome new course names are duplicates.'
        });
        return false;
    }
    if (klinicDefinitions.length && noOfKlinics > 0) { //sort and filter new klinic definitions so we can return them to buildStats()
        klinicDefinitions.sort(function (a, b) { return a.name.localeCompare(b.name); });
        klinicDefinitions = uniqueArrOfObjs(klinicDefinitions, "name");
        return klinicDefinitions;
    }
    return true; //otherwise: no klinics in the upload
}

function displayNewCourseRef(cParam, container) {
    var frag = document.createDocumentFragment();
    var firstDiv = document.createElement("div");
    var secondDiv = document.createElement("div");
    var thirdDiv = document.createElement("div");
    var fourthDiv = document.createElement("div");
    var firstSpan = document.createElement("span");
    var secondSpan = document.createElement("span");
    var thirdSpan = document.createElement("span");
    var fourthSpan = document.createElement("span");
    var elText = "" + courseData[cParam].name + " - " + courseData[cParam].dept + courseData[cParam].rm.a;
    var newText;

    if (courseData[cParam].rm.hasOwnProperty("b")) {
        elText += "/" + courseData[cParam].dept + courseData[cParam].rm.b;
    }
    elText += " - " + courseData[cParam].times;

    if (courseData[cParam].duration === "ninety") {
        elText += " - (90분)";
    }
    newText = document.createTextNode(elText);
    firstDiv.id = "contain" + cParam;
    firstDiv.className = "row";
    secondDiv.className = "col-lg-12";
    thirdDiv.id = "ref" + cParam;
    thirdDiv.className = "whitecircle";
    fourthDiv.id = "edredit-" + cParam;
    fourthDiv.className = "nodisplay";
    firstSpan.id = "edrinit-" + cParam;
    firstSpan.className = "btn-xs btn-warning pull-left nodisplay";
    firstSpan.textContent = "Edit";
    secondSpan.id = "edrsave-" + cParam;
    secondSpan.className = "btn-xs btn-primary pull-left nodisplay";
    secondSpan.textContent = "Save";
    thirdSpan.id = "sSgn" + cParam;
    thirdSpan.className = "sSgnd";
    fourthSpan.id = "edrdel-" + cParam;
    fourthSpan.className = "btn btn-xs btn-danger pull-right nodisplay";
    fourthSpan.textContent = "\u2716";

    if (courseData[cParam].cat === "CLINIC") {
        fourthDiv.className += " disabled";
        firstSpan.className += " disabled";
        secondSpan.className += " disabled";
        fourthSpan.className += " disabled";
    }
    thirdDiv.appendChild(newText);
    thirdDiv.appendChild(thirdSpan);
    secondDiv.appendChild(firstSpan);
    secondDiv.appendChild(secondSpan);
    secondDiv.appendChild(thirdDiv);
    secondDiv.appendChild(fourthDiv);
    secondDiv.appendChild(fourthSpan);
    firstDiv.appendChild(secondDiv);
    frag.appendChild(firstDiv);
    docElId('courselist' + container).appendChild(frag);
    displayAutoBuilderIcon();
}

function getDataForUpdateDataFromChanges(cParam) {
    var valsObj = {};

    valsObj.name = docElId("edrname-" + cParam).value;
    valsObj.dept = docElId("edrdept-" + cParam).value;
    valsObj.rmA = docElId("edrrm-" + cParam).value;
    valsObj.rmB = docElId("edrrmB-" + cParam) !== null ? docElId("edrrmB-" + cParam).value : "";
    valsObj.timeDay1 = "" + docElId("edrday1-" + cParam).value + docElId("edrstart1-" + cParam).value;
    valsObj.timeDay2 = "" + docElId("edrday2-" + cParam).value + docElId("edrstart2-" + cParam).value;
    valsObj.idxDay1 = docElId("edrday1-" + cParam).selectedIndex;
    valsObj.idxStart1 = docElId("edrstart1-" + cParam).selectedIndex;
    valsObj.idxDay2 = docElId("edrday2-" + cParam).selectedIndex;
    valsObj.idxStart2 = docElId("edrstart2-" + cParam).selectedIndex;
    return valsObj;
}

function errorsForGetEditorValuesOnSave(idx) {
    var errMsg = [
        "A course with that name already exists!",
        "Please choose a " + config.courseNameNumLength + " digit course name greater than zero.",
        "Both classes cannot start at the same time!",
        "Please define all parameters with appropriate values"
    ];

    window.mscAlert({
        title: '',
        subtitle: errMsg[idx]
    });
    return;
}

function getEditorValuesOnSave(cParam) { //when save is clicked in Edit Mode, update the course...
    var valsObj = getDataForUpdateDataFromChanges(cParam);
    var cObjRef = courseData[cParam];
    var sParam = "";
    var uniqueName;

    if (cObjRef.cat === "CLINIC") { return; }

    valsObj.name = cleanNumCharsOnly(valsObj.name);
    uniqueName = findcRefByCourseName(valsObj.name); //returns cParam string or 'undefined'
    valsObj.rmA = cleanDngrCharsAndWs(valsObj.rmA);
    valsObj.rmB = cleanDngrCharsAndWs(valsObj.rmB);

    if (uniqueName !== undefined && uniqueName !== cParam) {
        errorsForGetEditorValuesOnSave(0);
        return;
    }
    if (valsObj.name.length !== config.courseNameNumLength || Number(valsObj.name) < 1 || Number.isNaN(Number(valsObj.name))) {
        errorsForGetEditorValuesOnSave(1);
        return;
    }
    if (isSameDayHrSelected(cParam)) {
        errorsForGetEditorValuesOnSave(2);
        return;
    }
    if (valsObj.rmA === "" || valsObj.name === "") {
        errorsForGetEditorValuesOnSave(3);
        return;
    }
    if (cObjRef.assgn !== "") {
        sParam = '' + cObjRef.assgn;
        removeAssignmentViaUI(sParam, cParam); //remove the course from the schedule and update the UI...
    }
    hideEditingControls(cParam); //close editing for this course...
    if (updateDataFromChanges(cParam, valsObj)) {
        rebuildcReference(cParam);
        reAssignAfterChange(sParam, cParam); //..attempt to reassign the course, if it had been previously
    }
}

function updateDataFromChanges(cParam, valsObj) { //NOTE: not comparing for changes, just replacing all values //stats.catData[i][0] is the cat, //stats.catData[i][2] is the dayHr map
    var cObjRef = courseData[cParam];
    var strTimes,
        b4change,
        catIndex,
        i;

    if (cObjRef.cat === "CLINIC") { return; }

    for (i = 0; i < stats.catData.length; i++) {
        if (stats.catData[i][0] === cObjRef.cat) {
            catIndex = i;
            break;
        }
    }
    cObjRef.name = valsObj.name;
    cObjRef.dept = valsObj.dept;
    cObjRef.rm.a = valsObj.rmA;

    if (cObjRef.rm.hasOwnProperty("b")) { delete cObjRef.rm.b; }
    if (valsObj.rmB !=="" && valsObj.rmB !== cObjRef.rm.a) { cObjRef.rm.b = valsObj.rmB; }

    strTimes = valsObj.timeDay1;

    if (cObjRef.duration !== "twohour" && cObjRef.duration !== "threehour") {
        strTimes += ',' + valsObj.timeDay2;
    }
    if (cObjRef.duration === "threehour") { strTimes += '-' + (valsObj.idxStart1 + 11) + ':50'; }
    if (cObjRef.duration === "twohour") { strTimes += '-' + (valsObj.idxStart1 + 10) + ':50'; }

    cObjRef.times = strTimes;
    b4change = [[], []]; //copy old values to new array for stats removal:
    b4change[0].push(cObjRef.dayhr[0][0]);
    b4change[0].push(cObjRef.dayhr[0][1]);
    b4change[1].push(cObjRef.dayhr[1][0]);
    b4change[1].push(cObjRef.dayhr[1][1]);
    stats.catData[catIndex][2][b4change[0][0]][b4change[0][1]] -= 1;
    stats.catData[catIndex][2][b4change[1][0]][b4change[1][1]] -= 1;

    if (cObjRef.duration === "threehour") { stats.catData[catIndex][2][b4change[0][0]][b4change[0][1] + 1] -= 1; }

    cObjRef.dayhr[0][0] = valsObj.idxDay1;

    if (cObjRef.duration === "ninety") { //changing dayhr to new values...
        cObjRef.dayhr[1][0] = valsObj.idxDay2;

        if (valsObj.idxStart1 % 2 === 1) {
            cObjRef.dayhr[0][1] = (valsObj.idxStart1 - 1) / 2;
            cObjRef.allowFollow[0] = false;
        } else {
            cObjRef.dayhr[0][1] = valsObj.idxStart1 / 2;
            cObjRef.allowFollow[0] = true;
        }
        if (valsObj.idxStart2 % 2 === 1) {
            cObjRef.dayhr[1][1] = (valsObj.idxStart2 - 1) / 2;
            cObjRef.allowFollow[1] = false;
        } else {
            cObjRef.dayhr[1][1] = valsObj.idxStart2 / 2;
            cObjRef.allowFollow[1] = true;
        }
    } else {
        cObjRef.dayhr[0][1] = valsObj.idxStart1;

        if (cObjRef.duration === "twohour" || cObjRef.duration === "threehour") {
            cObjRef.dayhr[1][0] = valsObj.idxDay1;

            if (cObjRef.duration === "twohour") { cObjRef.dayhr[1][1] = valsObj.idxStart1 + 1; }
            if (cObjRef.duration === "threehour") { cObjRef.dayhr[1][1] = valsObj.idxStart1 + 2; }
        } else {
            cObjRef.dayhr[1][0] = valsObj.idxDay2;
            cObjRef.dayhr[1][1] = valsObj.idxStart2;
        }
    }
    //update stats with new values...
    stats.catData[catIndex][2][cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1]] += 1;
    stats.catData[catIndex][2][cObjRef.dayhr[1][0]][cObjRef.dayhr[1][1]] += 1;

    if (cObjRef.duration === "threehour") { stats.catData[catIndex][2][cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1] + 1] += 1; }
    return true;
}

function formatTimeStrForNinetyMinCourse(time) { //display correct start and end times for ninety min. courses on pdf
    var timeArr = {};
    var tempArr = time.split(/[^(0-9)]/g).filter( function(el) { return el !==""; } );

    timeArr.a = "" + tempArr[0] + ":" + tempArr[1] + "-" + (Number(tempArr[0])+1) + ":" + (Number(tempArr[1])+15);
    timeArr.b = "" + tempArr[2] + ":" + tempArr[3] + "-" + (Number(tempArr[2])+1) + ":" + (Number(tempArr[3])+15);
    return timeArr;
}

function buildPDF(){
    var pdfObj = { pageSize:"A4", content:[], styles:{ default:{ fontSize:10, alignment:"center"} } };
    var len = stats.indexData.schedules.length;
    var pdfTable,
        pdfDepts,
        pdfHeader,
        grid,
        cStrB,
        cStrA,
        cDetailsColor,
        drtnStr,
        statsRef,
        sObjRef,
        cObjRef,
        catListToArr,
        str,
        i,
        ii,
        iii;

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.schedules[i];
        sObjRef = scheduleData[statsRef];

        if (!sObjRef.cRef.length) { continue; }

        catListToArr = (getCatListForSchedule(statsRef)).split(', '); //a list of cats for reColoring
        pdfHeader = {text:[]}; //{"text":["string", {"text:"string","color":"string"}, "string"]};
        pdfHeader.text.push("" + sObjRef.display + " - ");

        for (ii = 0; ii < catListToArr.length; ii++) {
            pdfHeader.text.push(pdfCatColor(catListToArr, catListToArr[ii]));
        }
        pdfHeader.text.push("\n");

        grid = buildDefaultScheduleUiArr(""); //the grid is Mon to Sat...sat hours are added at the end of this block (if they exist)
        pdfTable = { style:"default", table:{ widths:[], body:[] } };
        pdfTable.table.body.push(["","Monday","Tuesday","Wednesday","Thursday","Friday"]); //ALWAYS ASSUME MON TO FRI
        pdfTable.table.body.push([config.pdfBlankHr,"","","","",""]);

        for (ii = 0; ii < grid[0].length; ii++) {
            str = "\n" + (config.uiTimeInputStartHr + ii) + ":00-" + (config.uiTimeInputStartHr + ii) + ":50"; //ALWAYS ASSUME COURSES START ON THE HOUR
            str += "\n(" + (ii + 1) + ")";
            pdfTable.table.body.push([str]);
        }
        pdfDepts = { pageBreak:"after", text:[] };

        for (ii = 0; ii < sObjRef.cRef.length; ii++) {
            cObjRef = courseData[scheduleData[statsRef].cRef[ii]];
            cStrB = "" + cObjRef.name;
            cStrA = "" + cObjRef.name;
            cDetailsColor = pdfCatColor(catListToArr, cObjRef.cat);

            if (cObjRef.cat === "CLINIC") { cStrA = "" + cObjRef.fullname; }

            cStrA += "\n" + cObjRef.cat + "\n" + cObjRef.dept + cObjRef.rm.a;
            cStrB += "\n" + cObjRef.cat + "\n" + cObjRef.dept;

            if (cObjRef.rm.hasOwnProperty("b")) { cStrB += "" + cObjRef.rm.b; }
            else { cStrB += "" + cObjRef.rm.a; }

            if (cObjRef.hasOwnProperty("allowFollow")) { //need to include the start,end times for 90min. courses
                drtnStr = formatTimeStrForNinetyMinCourse(cObjRef.times);
                cStrA += "\n(" + drtnStr.a +")";
                cStrB += "\n(" + drtnStr.b +")";
            }
            grid[cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1]] = {text: cStrA, color: cDetailsColor.color};

            if (cObjRef.rm.hasOwnProperty("b")) {
                grid[cObjRef.dayhr[1][0]][cObjRef.dayhr[1][1]] = {text: cStrB, color: cDetailsColor.color};
            } else {
                grid[cObjRef.dayhr[1][0]][cObjRef.dayhr[1][1]] = {text: cStrA, color: cDetailsColor.color};
            }
            if (cObjRef.duration === "threehour") { grid[cObjRef.dayhr[0][0]][cObjRef.dayhr[0][1] + 1] = {text: cStrA, color: cDetailsColor.color}; }
        }

        if ( sObjRef.hasOwnProperty('tchr') ) {
            if( sObjRef.tchr !== "" ) {
                pdfHeader.text.push("Instructor: " + sObjRef.tchr);
            }
        }
        pdfHeader.text.push("\n\n");

        if (sObjRef.hasOwnProperty('isSat')) { //add Sat hours from grid (if exist)
            pdfTable.table.widths = ["15%","14.166%","14.166%","14.166%","14.166%","14.166%","14.166%"];
            pdfTable.table.body[0].push("Saturday");
            pdfTable.table.body[1].push("");
        } else {
            pdfTable.table.widths = ["15%","17%","17%","17%","17%","17%"];
        }
        for (ii = 2; ii < pdfTable.table.body.length; ii++) { //formerly: "<= 9" which didn't allow for variable schedule length
            for(iii = 0; iii < pdfTable.table.widths.length - 1; iii++) {
                pdfTable.table.body[ii].push(grid[iii][ii-2]);
            }
        }
        pdfDepts.text = deptHelpInfo(statsRef);
        pdfObj.content.push(pdfHeader);
        pdfObj.content.push(pdfTable);
        pdfObj.content.push(pdfDepts);
    }
    //replaced Roboto.ttf with UnBatang.ttf in vfs_fonts.js and renamed it as: 'Roboto' (suggested methods all failed with Korean text)
    //without worker, this would be: window.pdfMake.createPdf(pdfObj).download('' +fileName+ '.pdf');
    return JSON.stringify(pdfObj); //using worker...
}

function buildClinicsPDF(){
    var clinicObj = formatClinicInstances();
    var pdfObj = { pageSize:"A4", content:[], styles:{ default:{ fontSize:10, alignment:"center"} } };
    var len = clinicObj.length;
    var pdfHeader,
        pdfTable,
        grid,
        pdfPageBreak,
        str,
        cDetails,
        i,
        ii,
        iii;

    for (i = 0; i < len; i++) {
        if (clinicObj[i].inst.length) {
            var clinicName = clinicObj[i].inst[0].fullname;
            var enDept = deptRef(clinicObj[i].inst[0].dept);

            if (clinicName === "") {
                clinicName = clinicObj[i].def;
            }
            pdfHeader = {text:"" + clinicName + " clinic - " + clinicObj[i].inst[0].rm.a + " " + enDept + "\n\n" };
            pdfTable = { style:"default", table:{ widths:[], body:[] } };

            grid = buildDefaultScheduleUiArr(""); //the grid is Mon to Sat...sat hours are added at the end of this block (if they exist)
            pdfTable = { style:"default", table:{ widths:[], body:[] } };
            pdfTable.table.body.push(["","Monday","Tuesday","Wednesday","Thursday","Friday"]); //ALWAYS ASSUME MON TO FRI
            pdfTable.table.body.push([config.pdfBlankHr,"","","","",""]);

            for (ii = 0; ii < grid[0].length; ii++) {
                str = "\n" + (config.uiTimeInputStartHr + ii) + ":00-" + (config.uiTimeInputStartHr + ii) + ":50"; //ALWAYS ASSUME COURSES START ON THE HOUR
                str += "\n(" + (ii + 1) + ")";
                pdfTable.table.body.push([str]);
            }
            pdfPageBreak = { pageBreak:"after",text:[] };

            for (ii = 0; ii < clinicObj[i].inst.length; ii++) {
                cDetails = {text: "\n"};

                cDetails.text += "" + clinicObj[i].inst[ii].tchr;

                if (clinicObj[i].inst[ii].tchr === "unassigned") {
                    cDetails.color = config.pdfCourseColors[2];
                }
                if (grid[clinicObj[i].inst[ii].dayhr[0][0]][clinicObj[i].inst[ii].dayhr[0][1]].hasOwnProperty("text")) { //"adding" text to Obj. to make double bookings apparent
                    cDetails.color = config.pdfCourseColors[1];
                    cDetails.text += grid[clinicObj[i].inst[ii].dayhr[0][0]][clinicObj[i].inst[ii].dayhr[0][1]].text;
                }
                grid[clinicObj[i].inst[ii].dayhr[0][0]][clinicObj[i].inst[ii].dayhr[0][1]] = cDetails; //just one hour in a CLINIC
            }
            if (clinicObj[i].inst.hasOwnProperty('isSat')) { //add Sat hours from grid (if exist)
                pdfTable.table.widths = ["15%","14.166%","14.166%","14.166%","14.166%","14.166%","14.166%"];
                pdfTable.table.body[0].push("Saturday");
                pdfTable.table.body[1].push("");
            } else {
                pdfTable.table.widths = ["15%","17%","17%","17%","17%","17%"];
            }

            for (ii = 2; ii < pdfTable.table.body.length; ii++) { //formerly: "<= 9" which didn't allow for variable schedule length
                for(iii = 0; iii < pdfTable.table.widths.length - 1; iii++) {
                    pdfTable.table.body[ii].push(grid[iii][ii-2]);
                }
            }
            pdfObj.content.push(pdfHeader);
            pdfObj.content.push(pdfTable);
            pdfObj.content.push(pdfPageBreak);
        }
    }
    //replaced Roboto.ttf with UnBatang.ttf in vfs_fonts.js and renamed it as: 'Roboto' (suggested methods all failed with Korean text)
    //without worker, this would be: window.pdfMake.createPdf(pdfObj).download('' +fileName+ '.pdf');
    return JSON.stringify(pdfObj); //using worker...
}

//DOM PUNCHING

function resetTheWholeUI() {
    var frag = document.createDocumentFragment();
    var frag2 = document.createDocumentFragment();
    var newOpt = document.createElement("option");
    var newOpt2 = document.createElement("option");

    emptyContent(docElId('schedule-instances'));
    emptyContent(docElId('references'));
    emptyContent(docElId('newcoursecat'));
    emptyContent(docElId('newcoursedept'));

    newOpt.textContent = "select";
    newOpt.value = "";
    newOpt2.textContent = "select";
    newOpt2.value = "";

    frag.appendChild(newOpt);
    frag2.appendChild(newOpt2);
    docElId('newcoursecat').appendChild(frag);
    docElId('newcoursedept').appendChild(frag2);
    docElId('newcoursecat').options[0].disabled = true;
    docElId('newcoursedept').options[0].disabled = true;
}

function makeNewCourseRef() { //triggered on Save from New Course Modal
    var len = stats.catData.length;
    var container,
        newcParam,
        i;

    if (!len) { //at least one category must exist
        window.mscAlert({
            title: '',
            subtitle: 'At least one category must be defined before a course can be created.'
        });
        return;
    }
    newcParam = createOneCourse(); //returns the cParam of a newly created course, or 'nada' if failed

    if (newcParam === 'nada') {
        return;
    }
    docElId('newcoursename').value = ""; //reset the input values!
    docElId('newcourseroom').value = "";
    docElId('newcourseroomB').value = "";
    docElId('newcoursecat').selectedIndex = 0;
    docElId('newcoursedept').selectedIndex = 0;
    docElId('newdayone').selectedIndex = 0;
    docElId('newhrsone').selectedIndex = 0;
    docElId('newdaytwo').selectedIndex = 0;
    docElId('newhrstwo').selectedIndex = 0;

    for (i = 0; i < len; i++) {
        if (stats.catData[i][0] === courseData[newcParam].cat) {
            container = i + 1;
            break;
        }
    }
    displayNewCourseRef(newcParam, container);
    window.mscConfirm({
        title: 'Success!',
        subtitle: 'Course: ' + courseData[newcParam].name + ' has been created.\nCreate another?',
        cancelText: 'Exit',
        onOk: function () {
            return;
        },
        onCancel: function () {
            exitChangesToCourse();
            scrollToCourse(newcParam);
        }
    });
}

function defineTimeArrForPopulateClassTimes() { //ALWAYS ASSUME COURSES START ON THE HOUR
    var times = { arr:[], lastEl:"" };
    var arrLen = config.uiScheduleNumOfHrsPerDay - 1;
    var str0 = ":00";
    var str1 = ":30";
    var hr,
        i;

    for (i = 0; i < arrLen; i++) {
        hr = ("0" + (config.uiTimeInputStartHr + i)).slice(-2);
        times.arr.push("" + hr + str0);
        times.arr.push("" + hr + str1);
    }
    times.lastEl += config.uiTimeInputStartHr + (config.uiScheduleNumOfHrsPerDay - 1) + str0;
    return times;
}

function populateClassTimes(durationTime) {
    var times = defineTimeArrForPopulateClassTimes(); //returns {}
    //times.arr: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
    //times.lastEl = "16:00"
    var timeArr = times.arr;
    var len = timeArr.length;
    var frag = document.createDocumentFragment();
    var frag2 = document.createDocumentFragment();
    var newOpt,
        newOpt2,
        newSecondOpt,
        newSecondOpt2,
        newLastOpt,
        newLastOpt2,
        arrEl,
        i;

    emptyContent(docElId('newhrsone'));
    emptyContent(docElId('newhrstwo'));

    if (durationTime === "ninety") {
        for (i = 0; i < len; i++) {
            arrEl = timeArr[i];
            newOpt = document.createElement("option");
            newOpt2 = document.createElement("option");
            newOpt.value = arrEl;
            newOpt.textContent = arrEl;
            newOpt2.value = arrEl;
            newOpt2.textContent = arrEl;
            frag.appendChild(newOpt);
            frag2.appendChild(newOpt2);
        }
    } else {
        for (i = 0; i < len; i += 2) {
            arrEl = timeArr[i];
            newSecondOpt = document.createElement("option");
            newSecondOpt2 = document.createElement("option");
            newSecondOpt.value = arrEl;
            newSecondOpt.textContent = arrEl;
            newSecondOpt2.value = arrEl;
            newSecondOpt2.textContent = arrEl;
            frag.appendChild(newSecondOpt);
            frag2.appendChild(newSecondOpt2);
        }
        if (durationTime === "threehour") { frag.removeChild(frag.lastChild); } //remove a further hour for three hour block start times
        if (durationTime === "onehour") {
            newLastOpt = document.createElement("option");
            newLastOpt2 = document.createElement("option");
            newLastOpt.value = times.lastEl;
            newLastOpt.textContent = times.lastEl;
            newLastOpt2.value = times.lastEl;
            newLastOpt2.textContent = times.lastEl;
            frag.appendChild(newLastOpt);
            frag2.appendChild(newLastOpt2);
        }
    }
    docElId('newhrsone').appendChild(frag);
    docElId('newhrstwo').appendChild(frag2);
}

function disableUIforDeletedCat(catNumber) {
    var frag = document.createDocumentFragment();
    var firstSpan = document.createElement("span");
    var secondSpan = document.createElement("span");
    var recycleSpan = document.createElement("span");

    emptyContent(docElId('catcontain' + catNumber));
    emptyContent(docElId('catref' + catNumber));
    emptyContent(docElId('courselist' + catNumber));

    firstSpan.id = "catedt" + catNumber;
    firstSpan.className = "catedt btn-xs btn-warning pull-left nodisplay";
    firstSpan.textContent = "Edit";
    firstSpan.style.display = "none";
    secondSpan.id = "bldr" + catNumber;
    secondSpan.className = "autobuilder pull-right icon-flash nodisplay";
    secondSpan.style.display = "none";
    recycleSpan.id = "recycle" + catNumber;
    recycleSpan.className = "pull-right recycler icon-recycle";
    recycleSpan.style.display = "none";

    frag.appendChild(firstSpan);
    frag.appendChild(secondSpan);
    frag.appendChild(recycleSpan);
    docElId('catref' + catNumber).appendChild(frag);
    docElId('list' + catNumber).style.display = 'none';
    docElId('catcontain' + catNumber).style.display = 'none';
    docElId('catref' + catNumber).style.display = 'none';
    docElId('courselist' + catNumber).style.display = 'none';
}

//plz leave the commented code *in*!
function newScheduleUI(newScheduleId, day) {
    var arr = buildDefaultScheduleUiArr(0);
    var daysArr = (config.monToSatEn).slice();
    var percent = 'p16c'; //css classname
    var frag = document.createDocumentFragment();
    var firstDiv = document.createElement("div");
    var secondDiv = document.createElement("div");
    var thirdDiv = document.createElement("div");
    var fourthDiv = document.createElement("div");
    var fifthDiv = document.createElement("div");
    var sixthDiv = document.createElement("div");
    var seventhDiv = document.createElement("div");
    var twelfthDiv = document.createElement("div");
    var firstSpan = document.createElement("span");
    var recycleSpan = document.createElement("span");
    var secondSpan = document.createElement("span");
    var thirdSpan = document.createElement("span");
    var fourthSpan = document.createElement("span");
    var newSelect = document.createElement("select");
    var newOpt = document.createElement("option");
    var i,
        ii;

    if (day !== 'Sat') { //Mon. to Fri.
        arr.pop();
        daysArr.pop();
        percent = 'p20c'; //css classname
    }
    firstDiv.id = "" + newScheduleId;
    firstDiv.className = "col-lg-3 col-md-3 col-sm-3 col-xs-3 bordered";
    secondDiv.className = "row text-center";
    secondDiv.style.paddingLeft = 43 + "px";
    secondDiv.textContent = scheduleData[newScheduleId].display;
    firstSpan.id = "del" + newScheduleId;
    firstSpan.className = "btn btn-xs btn-danger pull-right";
    firstSpan.textContent = "\u2716";
    recycleSpan.id = "reset" + newScheduleId;
    recycleSpan.className = "btn btn-xs icon-recycle pull-right";
    thirdDiv.className = "row text-center";
    fourthDiv.id = "tchrsee" + newScheduleId;
    fourthDiv.className = "tchrsee nodisplay";
    secondSpan.id = "tchrclr" + newScheduleId;
    secondSpan.className = "btn-xs btn-warning pull-left";
    secondSpan.textContent = "Clear";
    thirdSpan.id = "tchrset" + newScheduleId;
    thirdSpan.className = "btn-xs btn-whiteBlue tchrset";
    thirdSpan.textContent = "unassigned";
    fifthDiv.id = "tchrchg" + newScheduleId;
    fifthDiv.className = "tchrchg nodisplay";
    fourthSpan.id = "tchrsve" + newScheduleId;
    fourthSpan.className = "btn btn-xs btn-primary pull-left";
    fourthSpan.textContent = "Save";
    newSelect.id = "tchredt" + newScheduleId;
    newSelect.className = "select-styles tchredt";
    newOpt.value = "";
    newOpt.textContent = "select teacher";
    sixthDiv.id = "catlist" + newScheduleId;
    sixthDiv.className = "row text-center cat-list";
    seventhDiv.className = "row text-center dayofweek " + percent;
    twelfthDiv.className = "row text-center " + percent;

    secondDiv.appendChild(firstSpan);
    secondDiv.appendChild(recycleSpan);
    fourthDiv.appendChild(secondSpan);
    fourthDiv.appendChild(thirdSpan);
    newSelect.appendChild(newOpt);
    fifthDiv.appendChild(fourthSpan);
    fifthDiv.appendChild(newSelect);
    thirdDiv.appendChild(fourthDiv);
    thirdDiv.appendChild(fifthDiv);

    for (i = 0; i < daysArr.length; i++) {
        var eighthDiv = document.createElement("div");
        eighthDiv.textContent = daysArr[i];
        seventhDiv.appendChild(eighthDiv);
    }
    // if (day === 'Sat') {
    //     var ninthDiv = document.createElement("div");
    //     ninthDiv.textContent = "S";
    //     seventhDiv.appendChild(ninthDiv);
    // }
    firstDiv.appendChild(secondDiv); //"row text-center" gets appended to the firstDiv
    firstDiv.appendChild(thirdDiv);
    firstDiv.appendChild(sixthDiv);
    firstDiv.appendChild(seventhDiv);

    for (i = 0; i < arr[0].length; i++) {
        var tenthDiv = document.createElement("div");
        tenthDiv.className = "row text-center " + percent;

        for (ii = 0; ii < arr.length; ii++) {
            var eleventhDiv = document.createElement("div");
            eleventhDiv.id = newScheduleId + "c0d" + [ii] + "t" + [i];
            eleventhDiv.textContent = "0";
            tenthDiv.appendChild(eleventhDiv);
        }
        firstDiv.appendChild(tenthDiv);
    }
    for (i = 0; i < daysArr.length; i++) { //(i = 0; i < 5; i++) //DO *NOT* ASSUME [] Mon to Fri this time!
        var thirteenthDiv = document.createElement("div");
        thirteenthDiv.id = "off" + [i] + "" + newScheduleId;
        thirteenthDiv.className = "dayoff";
        thirteenthDiv.textContent = "\u25b2";
        twelfthDiv.appendChild(thirteenthDiv);
    }
    // if (day === 'Sat') {
    //     var lastDiv = document.createElement("div");
    //     lastDiv.id = "off5" + newScheduleId;
    //     lastDiv.className = "dayoff";
    //     lastDiv.textContent = "\u25b2";
    //     twelfthDiv.appendChild(lastDiv);
    // }
    firstDiv.appendChild(twelfthDiv);
    frag.appendChild(firstDiv);

    docElId('schedule-instances').appendChild(frag);
    docElId("tchredt" + newScheduleId).options[0].disabled = true;

    if (stats.indexData.schedules.length) { //make sure the new schedule is the correct height!
        if (docElId(stats.indexData.schedules[0]).classList.contains('show-teacher')){
            showEl("tchrsee"+newScheduleId);
            showTchr(newScheduleId);
            noClrBtnIfUnassigned(newScheduleId);
        }
    }
}

function displayNewCat(catNumber) {
    var frag = document.createDocumentFragment();
    var firstDiv = document.createElement("div");
    var secondDiv = document.createElement("div");
    var thirdDiv = document.createElement("div");
    var fourthDiv = document.createElement("div");
    var firstSpan = document.createElement("span");
    var secondSpan = document.createElement("span");
    var thirdSpan = document.createElement("span");
    var fourthSpan = document.createElement("span");
    var recycleSpan = document.createElement("span");
    var newInput = document.createElement("input");
    var newCatVal = stats.catData[catNumber - 1][0];
    var newText = document.createTextNode(newCatVal);

    firstDiv.id = "list" + catNumber;
    firstDiv.className = "" + setColorFromCat(newCatVal, true) + "courselist";
    secondDiv.id = "catcontain" + catNumber;
    secondDiv.className = "nodisplay";
    thirdDiv.id = "catref" + catNumber;
    fourthDiv.id = "courselist" + catNumber;
    fourthDiv.className = "hide";
    firstSpan.id = "catsve" + catNumber;
    firstSpan.className = "btn btn-xs btn-primary pull-left";
    firstSpan.textContent = "Rename";
    newInput.type = "text";
    newInput.id = "catchg" + catNumber;
    newInput.className = "inputstyle btn-xs";

    if (newCatVal === "CLINIC") {
        newInput.className += " disabled";
        firstSpan.textContent = "Delete only";
    }
    newInput.value = newCatVal;
    secondSpan.id = "catdel" + catNumber;
    secondSpan.className = "btn btn-xs btn-danger pull-right";
    secondSpan.textContent = "\u2716";
    thirdSpan.id = "catedt" + catNumber;
    thirdSpan.className = "catedt btn-xs btn-warning pull-left nodisplay";
    thirdSpan.textContent = "Edit";
    fourthSpan.id = "bldr" + catNumber;
    fourthSpan.className = "autobuilder pull-right icon-flash nodisplay";
    recycleSpan.id = "recycle" + catNumber;
    recycleSpan.className = "pull-right recycler icon-recycle";

    secondDiv.appendChild(firstSpan);
    secondDiv.appendChild(newInput);
    secondDiv.appendChild(secondSpan);
    thirdDiv.appendChild(thirdSpan);
    thirdDiv.appendChild(newText);
    thirdDiv.appendChild(fourthSpan);
    thirdDiv.appendChild(recycleSpan);
    firstDiv.appendChild(secondDiv);
    firstDiv.appendChild(thirdDiv);
    frag.appendChild(firstDiv);
    frag.appendChild(fourthDiv);
    docElId("references").appendChild(frag);
}

function populateNewCourseCats() {
    var frag = document.createDocumentFragment();
    var newFirstOpt = document.createElement("option");
    var newSecondOpt,
        stsRef,
        i;

    emptyContent(docElId('newcoursecat')); //reset the select.options

    newFirstOpt.value = "";
    newFirstOpt.textContent = "select";
    frag.appendChild(newFirstOpt);

    for (i = 0; i < stats.catData.length; i++) {
        stsRef = stats.catData[i][0];
        if (stsRef === "CLINIC") { continue; }
        if (stsRef.substring(0, 8) === "$deleted") { continue; }

        newSecondOpt = document.createElement("option");
        newSecondOpt.value = "" + stsRef;
        newSecondOpt.textContent = stsRef;
        frag.appendChild(newSecondOpt);
    }
    docElId('newcoursecat').appendChild(frag);
    docElId('newcoursecat').options[0].disabled = true;
    docElId('newcoursecat').options[0].selected = true;
}

function populateNewCourseDepts() {
    var frag = document.createDocumentFragment();
    var newFirstOpt = document.createElement("option");
    var newSecondOpt,
        i;

    emptyContent(docElId('newcoursedept')); //reset the select.options

    newFirstOpt.value = "";
    newFirstOpt.textContent = "select";
    frag.appendChild(newFirstOpt);

    for (i = 0; i < stats.indexData.depts.length; i++) {
        newSecondOpt = document.createElement("option");
        newSecondOpt.value = "" + stats.indexData.depts[i].shortcode;
        newSecondOpt.textContent = newSecondOpt.value;
        frag.appendChild(newSecondOpt);
    }
    docElId('newcoursedept').appendChild(frag);
    docElId('newcoursedept').options[0].disabled = true;
    docElId('newcoursedept').options[0].selected = true;
}

function openRenameAllCourses(cParam) {
    var frag = document.createDocumentFragment();
    var newSpan = document.createElement("span"); //oldName-
    var newInput = document.createElement("input"); //newName-
    var newText = document.createTextNode(" -> ");

    newSpan.textContent = courseData[cParam].name;
    newSpan.style.paddingLeft = 60 + "px";
    newInput.id = "newName-" + cParam;
    newInput.type = "number";
    newInput.className = "btn-xs";
    newInput.style.width = 60 + "px";
    newInput.style.verticalAlign = "middle";
    newInput.style.padding = 2 + "px";
    newInput.value = "";
    newInput.maxLength = config.courseNameNumLength;
    newInput.minLength = config.courseNameNumLength;
    newInput.min = (Math.pow(10, config.courseNameNumLength - 1)).toString().split("").reverse().join(""); //(10 ** (config.courseNameNumLength - 1)) es2017!
    newInput.max = "" +( Math.pow(10, config.courseNameNumLength) - 1); //((10 ** config.courseNameNumLength) - 1); es2017!

    frag.appendChild(newSpan);
    frag.appendChild(newText);
    frag.appendChild(newInput);
    docElId("edredit-" + cParam).appendChild(frag);
}

function getAllDeptsOnUI() { //first call opening schedule settings
    var frag = document.createDocumentFragment();
    var firstSpan,
        i;

    emptyContent(docElId('alldepartments'));

    for (i = 0; i < stats.indexData.depts.length; i++) {
        firstSpan = document.createElement("span");
        firstSpan.id = "opt" + [i + 1];
        firstSpan.dataset.deptname = "" + stats.indexData.depts[i].shortcode; //data-deptname=""+stats.indexData.depts[i].shortcode;
        firstSpan.className = "btn btn-xs btn-dept";
        firstSpan.textContent = stats.indexData.depts[i].shortcode;
        frag.appendChild(firstSpan);
    }
    docElId('alldepartments').appendChild(frag);
}

function newBlankKlinic() { //dynamically update the depts each time the klinics modal is opened (ibid. edit individual courses)
    var newId = docElId('klinic-section').childNodes.length; //GRAB THE LAST ID!...
    var frag = document.createDocumentFragment();
    var container = document.createElement("div"); //kl_
    var firstInput = document.createElement("input"); //klnm_
    var secondInput = document.createElement("input"); //klfn_
    var firstSelect = document.createElement("select"); //kldp_
    var thirdInput = document.createElement("input"); //klrm_
    var secondSpan = document.createElement("span"); //kldel_
    var firstOpt = document.createElement("option"); //disabled opt[0]
    var deptOpt,
        i;

    secondSpan.id = "kldel_" + newId;
    secondSpan.className = "btn btn-xs btn-danger deletex pull-right";
    secondSpan.textContent = "\u2716";
    container.id = "kl_" + newId;
    firstInput.id = "klnm_" + newId;
    firstInput.type = "text";
    firstInput.className = "btn-xs";
    firstInput.style.width = 90 + "px";
    firstInput.style.verticalAlign = "middle";
    firstInput.style.padding = 2 + "px";
    firstInput.value = "";
    firstInput.maxLength = 8;
    firstInput.placeholder = "nickname";
    secondInput.id = "klfn_" + newId;
    secondInput.type = "text";
    secondInput.className = "inputStyle";
    secondInput.style.width = 160 + "px";
    secondInput.style.verticalAlign = "middle";
    secondInput.style.padding = 2 + "px";
    secondInput.value = "";
    secondInput.maxLength = 32;
    secondInput.placeholder = "full .pdf name";
    firstSelect.id = "kldp_" + newId;
    firstSelect.className = "select-styles";
    firstSelect.style.marginRight = 1 + "px";
    thirdInput.id = "klrm_" + newId;
    thirdInput.type = "text";
    thirdInput.className = "inputStyle";
    thirdInput.style.width = 80 + "px";
    thirdInput.style.verticalAlign = "middle";
    thirdInput.style.padding = 2 + "px";
    thirdInput.value = "";
    thirdInput.maxLength = 8;
    thirdInput.placeholder = "room";
    firstOpt.value = "";
    firstOpt.textContent = "dept";

    firstSelect.appendChild(firstOpt);

    for (i = 0; i < stats.indexData.depts.length; i++) {
        deptOpt = document.createElement("option"); //options for select: dept
        deptOpt.value = "" + stats.indexData.depts[i].shortcode;
        deptOpt.textContent = deptOpt.value;
        firstSelect.appendChild(deptOpt);
    }
    container.appendChild(firstInput);
    container.appendChild(secondInput);
    container.appendChild(firstSelect);
    container.appendChild(thirdInput);
    container.appendChild(secondSpan);
    frag.appendChild(container);
    docElId('klinic-section').appendChild(frag);
    docElId("kldp_" + newId).options[0].disabled = true;
}

function displayUpdatedKlinicBtns() { //show a list of defined Klinics as btns above the courselist
    var frag,
        newSpan,
        elName,
        i;

    emptyContent(docElId("klinicscontainer"));
    stats.tempKlinic.kbtn = "";

    if (!stats.indexData.klinics.length) {
        hideEl("klinicHolder");
        return;
    }
    frag = document.createDocumentFragment();
    klinicCatChk(); //if the cat doesn't exist, create it

    for (i = 0; i < stats.indexData.klinics.length; i++) {
        newSpan = document.createElement("span"); //kbtn_
        elName = stats.indexData.klinics[i].name;
        newSpan.id = "kbtn_" + elName;
        newSpan.className = "btn btn-xs btn-whiteBlue";
        newSpan.textContent = elName;
        newSpan.style.marginRight = 5 + "px";
        frag.appendChild(newSpan);
    }
    docElId("klinicscontainer").appendChild(frag);
    showEl("klinicHolder");
    showEl("klinicscontainer");
}

function rebuildDeptGrpString() {
    var frag = document.createDocumentFragment();
    var newDiv,
        newSpan,
        stsRef,
        i,
        ii;

    emptyContent(docElId('allgroups')); //clear the content..as the content is outdated

    for (i = 0; i < stats.settings.deptGrps.length; i++) { //reBuild contents of #allgroups from updated deptGrps arrays
        newDiv = document.createElement("div");
        newSpan = document.createElement("span");
        newSpan.id = "remove" + i;
        newSpan.className = "btn btn-xs btn-danger";
        newSpan.textContent = "delete";
        newDiv.textContent = "(";
        stsRef = stats.settings.deptGrps[i];

        for (ii = 0; ii < stsRef.length - 1; ii++) {
            newDiv.textContent += stsRef[ii] + ", ";
        }
        newDiv.textContent += "" + stsRef[stsRef.length - 1] + ") ";
        newDiv.appendChild(newSpan);
        frag.appendChild(newDiv);
    }
    docElId('allgroups').appendChild(frag);
}

function displayDeptList() {
    var frag = document.createDocumentFragment();
    var newDiv,
        newInput,
        newInput2,
        newSpan,
        i;

    emptyContent(docElId('deptEDIT'));

    for (i = 0; i < stats.indexData.depts.length; i++) {
        newDiv = document.createElement("div");
        newInput = document.createElement("input");
        newInput2 = document.createElement("input");
        newSpan = document.createElement("span");

        newDiv.id = "dpts" + [i];
        newInput.type = "text";
        newInput.id = "deptnm" + [i];
        newInput.className = "inputstylenarrow disabled";
        newInput.value = stats.indexData.depts[i].shortcode;
        newInput.maxLength = 8;
        newInput.placeholder = "shortcode";
        newInput2.type = "text";
        newInput2.id = "ddesc" + [i];
        newInput2.className = "inputstyle";
        newInput2.value = stats.indexData.depts[i].description;
        newInput2.maxLength = 32;
        newInput2.placeholder = "description";
        newSpan.id = "deptdel" + [i];
        newSpan.className = "btn btn-xs btn-danger deletex pull-right";
        newSpan.textContent = "\u2716";

        newDiv.appendChild(newInput);
        newDiv.appendChild(newInput2);
        newDiv.appendChild(newSpan);
        frag.appendChild(newDiv);
    }
    docElId('deptEDIT').appendChild(frag);
}

function addNewDepartment(str, dscrptn) {
    var newId = docElId('deptEDIT').childNodes.length; //GRAB THE LAST ID!...
    var frag = document.createDocumentFragment();
    var newDiv = document.createElement("div");
    var newInput = document.createElement("input");
    var newInput2 = document.createElement("input");
    var newSpan = document.createElement("span");

    newDiv.id = "dpts" + newId;
    newInput.type = "text";
    newInput.id = "deptnm" + newId;
    newInput.className = "inputstylenarrow";
    newInput.value = str;
    newInput.maxLength = 8;
    newInput.placeholder = "shortcode";
    newInput2.type = "text";
    newInput2.id = "ddesc" + newId;
    newInput2.className = "inputstyle";
    newInput2.value = dscrptn;
    newInput2.maxLength = 32;
    newInput2.placeholder = "description";
    newSpan.id = "deptdel" + newId;
    newSpan.className = "btn btn-xs btn-danger deletex";
    newSpan.textContent = "\u2716";

    newDiv.appendChild(newInput);
    newDiv.appendChild(newInput2);
    newDiv.appendChild(newSpan);
    frag.appendChild(newDiv);
    docElId('deptEDIT').appendChild(frag);
}

function setDeptGrpViaUI() {
    var grpIndex = Number((docElId('newgroupid')).dataset.grpindex);
    var stsRef = stats.settings.deptGrps[grpIndex];
    var allDeptsChildren = docElId('alldepartments').childNodes;
    var frag,
        newDiv,
        newSpan,
        i;

    if (stsRef && stsRef.length) {
        frag = document.createDocumentFragment();
        newDiv = document.createElement("div");
        newSpan = document.createElement("span");
        newSpan.id = "remove" + grpIndex;
        newSpan.className = "btn btn-xs btn-danger";
        newSpan.textContent = "delete";
        newDiv.textContent = "(";

        for (i = 0; i < stsRef.length - 1; i++) {
            newDiv.textContent += stsRef[i] + ", ";
        }
        newDiv.textContent += "" + stsRef[stsRef.length - 1] + ") ";
        newDiv.appendChild(newSpan);
        frag.appendChild(newDiv);
        docElId('allgroups').appendChild(frag);
        docElId('newgroupid').dataset.grpindex = stats.settings.deptGrps.length; //reset data-grpindex
    }

    for (i = 0; i < allDeptsChildren.length; i++) { //clear the green styling of childnodes under #alldepartments
        if (allDeptsChildren[i].nodeType == 1) {
            allDeptsChildren[i].style.backgroundColor = "";
            allDeptsChildren[i].style.color = "";
            allDeptsChildren[i].style.borderColor = "";
        }
    }
}

function displayTchrList() {
    var frag = document.createDocumentFragment();
    var newDiv,
        newInput,
        newInputKR,
        newSpan,
        i;

    emptyContent(docElId('alltchrs'));

    for (i = 0; i < stats.teachers.length; i++) {
        newDiv = document.createElement("div");
        newInput = document.createElement("input");
        newInputKR = document.createElement("input");
        newSpan = document.createElement("span");

        newDiv.id = "prsn" + [i];
        newInput.type = "text";
        newInput.id = "prsnnm" + [i];
        newInput.className = "inputstyle";
        newInput.value = stats.teachers[i].en;
        newInput.maxLength = 32;
        newInputKR.type = "text";
        newInputKR.id = "prsnKR" + [i];
        newInputKR.className = "inputstyle";
        newInputKR.value = stats.teachers[i].kor;
        newInputKR.maxLength = 32;
        newInputKR.placeholder = "csv name";
        newSpan.id = "prsndel" + [i];
        newSpan.className = "btn btn-xs btn-danger deletex pull-right";
        newSpan.textContent = "\u2716";

        newDiv.appendChild(newInput);
        newDiv.appendChild(newInputKR);
        newDiv.appendChild(newSpan);
        frag.appendChild(newDiv);
    }
    docElId('alltchrs').appendChild(frag);
}

function addNewPersonAsTchr(str, KR) {
    var newId = docElId('alltchrs').childNodes.length; //GRAB THE LAST ID!...
    var frag = document.createDocumentFragment();
    var newDiv = document.createElement("div");
    var newInput = document.createElement("input");
    var newInputKR = document.createElement("input");
    var newSpan = document.createElement("span");

    newDiv.id = "prsn" + newId;
    newInput.type = "text";
    newInput.id = "prsnnm" + newId;
    newInput.className = "inputstyle";
    newInput.value = str;
    newInput.maxLength = 32;
    newInput.placeholder = "new teacher";
    newInputKR.type = "text";
    newInputKR.id = "prsnKR" + newId;
    newInputKR.className = "inputstyle";
    newInputKR.value = KR;
    newInputKR.maxLength = 32;
    newInputKR.placeholder = "csv name";
    newSpan.id = "prsndel" + newId;
    newSpan.className = "btn btn-xs btn-danger deletex";
    newSpan.textContent = "\u2716";

    newDiv.appendChild(newInput);
    newDiv.appendChild(newInputKR);
    newDiv.appendChild(newSpan);
    frag.appendChild(newDiv);
    docElId('alltchrs').appendChild(frag);
}

function initKlinicsEditing() { //append each defined klinic (if exists) to "klinic-section" div
    var frag,
        len,
        kcRef,
        container,
        firstInput,
        secondInput,
        firstSelect,
        thirdInput,
        secondSpan,
        firstOpt,
        deptOpt,
        depart,
        i,
        ii;

    emptyContent(docElId("klinic-section")); //empty the section div
    if (!stats.indexData.klinics.length) { return; }

    frag = document.createDocumentFragment();
    len = stats.indexData.klinics.length;

    for (i = 0; i < len; i++) {
        container = document.createElement("div"); //kl_
        firstInput = document.createElement("input"); //klnm_
        secondInput = document.createElement("input"); //klfn_
        firstSelect = document.createElement("select"); //kldp_
        thirdInput = document.createElement("input"); //klrm_
        secondSpan = document.createElement("span"); //kldel_
        firstOpt = document.createElement("option"); //disabled opt[0]

        kcRef = stats.indexData.klinics[i];
        secondSpan.id = "kldel_" + i;
        secondSpan.className = "btn btn-xs btn-danger deletex pull-right";
        secondSpan.textContent = "\u2716";
        container.id = "kl_" + i;
        firstInput.id = "klnm_" + i;
        firstInput.type = "text";
        firstInput.className = "btn-xs disabled"; //force user to delete the klinic definition (nickname is the UID)
        firstInput.style.width = 90 + "px";
        firstInput.style.verticalAlign = "middle";
        firstInput.style.padding = 2 + "px";
        firstInput.value = kcRef.name;
        secondInput.id = "klfn_" + i;
        secondInput.type = "text";
        secondInput.className = "inputStyle";
        secondInput.style.width = 160 + "px";
        secondInput.style.verticalAlign = "middle";
        secondInput.style.padding = 2 + "px";
        secondInput.value = kcRef.fullname;
        secondInput.maxLength = 32;
        secondInput.placeholder = "full .pdf name";
        firstSelect.id = "kldp_" + i;
        firstSelect.className = "select-styles";
        firstSelect.style.marginRight = 1 + "px";
        thirdInput.id = "klrm_" + i;
        thirdInput.type = "text";
        thirdInput.className = "inputStyle";
        thirdInput.style.width = 80 + "px";
        thirdInput.style.verticalAlign = "middle";
        thirdInput.style.padding = 2 + "px";
        thirdInput.value = kcRef.rm.a;
        thirdInput.maxLength = 8;
        thirdInput.placeholder = "room";
        firstOpt.value = "";
        firstOpt.textContent = "dept";
        firstSelect.appendChild(firstOpt);

        for (ii = 0; ii < stats.indexData.depts.length; ii++) {
            deptOpt = document.createElement("option"); //options for select: dept
            deptOpt.value = stats.indexData.depts[ii].shortcode;
            deptOpt.textContent = deptOpt.value;
            firstSelect.appendChild(deptOpt);
        }
        container.appendChild(firstInput);
        container.appendChild(secondInput);
        container.appendChild(firstSelect);
        container.appendChild(thirdInput);
        container.appendChild(secondSpan);
        frag.appendChild(container);
    }
    docElId("klinic-section").appendChild(frag);

    for (i = 0; i < stats.indexData.klinics.length; i++) { //set selectedIndexes
        depart = docElId("kldp_" + i);
        depart.options[0].disabled = true;

        for ( ii = 1; ii < depart.options.length; ii++) { //ignore default disabled select.option[0]
            if (stats.indexData.klinics[i].dept === depart.options[ii].value) {
                depart.selectedIndex = ii;
                break;
            }
        }
    }
}

function rebuildcReference(cParam) { //NOTE: klinics ignored in both caller functions
    var cObjRef = courseData[cParam];
    var frag = document.createDocumentFragment();
    var firstSpan = document.createElement("span");
    var elText = "" + cObjRef.name + " - " + cObjRef.dept + cObjRef.rm.a;
    var idStr = "ref" + cParam;
    var newText;

    if (cObjRef.rm.hasOwnProperty("b")) {
        elText += "/" + cObjRef.dept + cObjRef.rm.b;
    }
    elText += " - " + cObjRef.times + "";

    emptyContent(docElId(idStr)); //update the "ref"+cParam text + the span that got removed

    if (cObjRef.duration === "ninety") {
        elText += " - (90분)";
    }
    firstSpan.id = "sSgn" + cParam;
    firstSpan.className = "sSgnd";
    newText = document.createTextNode(elText);

    frag.appendChild(newText);
    frag.appendChild(firstSpan);
    docElId(idStr).appendChild(frag);
}

function rebuildKlinicReference(cParam) { //update the textContent on the map:
    var cRef = courseData[cParam];
    var newIdOne = "" + cRef.assgn + "" + cParam + "d" + cRef.dayhr[0][0] + "t" + cRef.dayhr[0][1];
    var frag = document.createDocumentFragment();
    var firstSpan = document.createElement("span");
    var elText = "";
    var newText;

    docElId(newIdOne).textContent = '' + cRef.name + '(' + cRef.dept + ')';

    emptyContent(docElId("ref" + cParam)); //update the "ref"+cParam text + the span that got removed

    elText = "" + cRef.name + " - " + cRef.dept + "" + cRef.rm.a + " - " + cRef.times + "";
    newText = document.createTextNode(elText);
    firstSpan.id = "sSgn" + cParam;
    firstSpan.className = "sSgnd";

    frag.appendChild(newText);
    frag.appendChild(firstSpan);
    docElId("ref" + cParam).appendChild(frag);
    docElId("sSgn" + cParam).textContent = '' + cRef.assgn;
}

function initEditing(cParam) { //IMPORTANT: Editor can't change cat. or duration of course! Use: delete and create new course
    var times,
        timeArr,
        dayArr,
        frag,
        firstInput,
        secondInput,
        secondInputB,
        firstSelect,
        secondSelect,
        thirdSelect,
        fourthSelect,
        fifthSelect,
        newSpan,
        opt1,
        opt2,
        opt3,
        opt4,
        opt5,
        opt6,
        opt7,
        opt8,
        opt9,
        i;

    if (courseData[cParam].cat === "CLINIC") { return; }

    times = defineTimeArrForPopulateClassTimes(); //returns {}
    timeArr = times.arr; //["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"]
    dayArr = (config.monToSatKr).slice();
    frag = document.createDocumentFragment();
    firstInput = document.createElement("input"); //edrname-
    secondInput = document.createElement("input"); //edrrm-
    firstSelect = document.createElement("select"); //edrdept-
    secondSelect = document.createElement("select"); //edrday1-
    thirdSelect = document.createElement("select"); //edrday2-
    fourthSelect = document.createElement("select"); //edrstart1-
    fifthSelect = document.createElement("select"); //edrstart2-
    newSpan = document.createElement("span"); //edrduration-

    emptyContent(docElId("edredit-" + cParam));

    firstInput.id = "edrname-" + cParam;
    firstInput.type = "number";
    firstInput.className = "btn-xs";
    firstInput.style.width = 60 + "px";
    firstInput.style.verticalAlign = "middle";
    firstInput.style.padding = 2 + "px";
    firstInput.value = courseData[cParam].name;
    firstInput.maxLength = config.courseNameNumLength;
    firstInput.minLength = config.courseNameNumLength;
    firstInput.min = (Math.pow(10, config.courseNameNumLength - 1)).toString().split("").reverse().join(""); //(10 ** (config.courseNameNumLength - 1)) es2017!
    firstInput.max = "" + (Math.pow(10, config.courseNameNumLength) - 1); //((10 ** config.courseNameNumLength) - 1); es2017!
    firstSelect.id = "edrdept-" + cParam;
    firstSelect.className = "select-styles";
    firstSelect.style.marginRight = 1 + "px";
    secondInput.id = "edrrm-" + cParam;
    secondInput.type = "text";
    secondInput.className = "inputStyle";
    secondInput.style.width = 80 + "px";
    secondInput.style.verticalAlign = "middle";
    secondInput.style.padding = 2 + "px";
    secondInput.value = courseData[cParam].rm.a; //.replace(/[^a-zA-Z0-9\-]/gmi, '');

    if (courseData[cParam].duration === "onehour" || courseData[cParam].duration === "ninety") {
        secondInputB = document.createElement("input"); //edrrmB-
        secondInputB.id = "edrrmB-" + cParam;
        secondInputB.type = "text";
        secondInputB.className = "inputStyle";
        secondInputB.style.width = 80 + "px";
        secondInputB.style.verticalAlign = "middle";
        secondInputB.style.padding = 2 + "px";
        secondInputB.value = courseData[cParam].rm.b || courseData[cParam].rm.a; //in the event that: !courseData[cParam].rm.hasOwnProperty("b")
    } //prop "b" will be deleted on save if empty or matches prop "a"
    secondSelect.id = "edrday1-" + cParam;
    secondSelect.className = "select-styles";
    thirdSelect.id = "edrday2-" + cParam;
    thirdSelect.className = "select-styles";
    fourthSelect.id = "edrstart1-" + cParam;
    fourthSelect.className = "select-styles";
    fifthSelect.id = "edrstart2-" + cParam;
    fifthSelect.className = "select-styles";
    newSpan.id = "edrduration-" + cParam;

    if (courseData[cParam].duration === "ninety") { newSpan.textContent = " 90분(2)"; }
    if (courseData[cParam].duration === "twohour") { newSpan.textContent = " 2시간(1)"; }
    if (courseData[cParam].duration === "threehour") { newSpan.textContent = " 3시간(1)"; }
    if (courseData[cParam].duration === "onehour") { newSpan.textContent = " 1시간(2)"; }

    for (i = 0; i < stats.indexData.depts.length; i++) {
        opt1 = document.createElement("option"); //options for select: dept
        opt1.value = stats.indexData.depts[i].shortcode;
        opt1.textContent = opt1.value;
        firstSelect.appendChild(opt1);
    }
    for (i = 0; i < dayArr.length; i++) {
        opt2 = document.createElement("option"); //options for select: day
        opt3 = document.createElement("option");
        opt2.value = dayArr[i];
        opt2.textContent = opt2.value;
        opt3.value = opt2.value; //repeated values
        opt3.textContent = opt2.value;
        secondSelect.appendChild(opt2);
        thirdSelect.appendChild(opt3);
    }
    if (courseData[cParam].duration === "ninety") {
        for (i = 0; i < timeArr.length; i++) {
            opt4 = document.createElement("option"); //options for select: start1
            opt5 = document.createElement("option"); //options for select: start2
            opt4.value = timeArr[i];
            opt4.textContent = opt4.value;
            opt5.value = opt4.value; //repeated values
            opt5.textContent = opt5.value;
            fourthSelect.appendChild(opt4);
            fifthSelect.appendChild(opt5);
        }
    } else {
        for (i = 0; i < timeArr.length; i += 2) {
            opt6 = document.createElement("option"); //options for select: start1
            opt7 = document.createElement("option"); //options for select: start2
            opt6.value = timeArr[i];
            opt6.textContent = opt6.value;
            opt7.value = opt6.value; //repeated values
            opt7.textContent = opt6.value;
            fourthSelect.appendChild(opt6);
            fifthSelect.appendChild(opt7);
        }
        if (courseData[cParam].duration === "threehour") {
            fourthSelect.removeChild(fourthSelect.lastChild); //dont remove the last child of fifth select! we need the value for dayhr[1][1]
        }
        if (courseData[cParam].duration === "onehour") {
            opt8 = document.createElement("option");
            opt9 = document.createElement("option");
            opt8.value = times.lastEl;
            opt8.textContent = times.lastEl;
            opt9.value = times.lastEl;
            opt9.textContent = times.lastEl;
            fourthSelect.appendChild(opt8);
            fifthSelect.appendChild(opt9);
        }
    }
    frag.appendChild(firstInput);
    frag.appendChild(firstSelect);
    frag.appendChild(secondInput);

    if (courseData[cParam].duration === "onehour" || courseData[cParam].duration === "ninety") {
        frag.appendChild(secondInputB);
    }
    frag.appendChild(secondSelect);
    frag.appendChild(fourthSelect);
    frag.appendChild(thirdSelect);
    frag.appendChild(fifthSelect);
    frag.appendChild(newSpan);
    docElId("edredit-" + cParam).appendChild(frag);
    setEditingDefaultVals(cParam);
}

//UI & DISPLAY

function hideEl(elId) {
    if (!docElId(elId).classList.contains('nodisplay')) {
        docElId(elId).className += ' nodisplay';
    }
}

function showEl(elId) {
    docElId(elId).className = docElId(elId).className.replace(/(?:^|\s)nodisplay(?!\S)/g, '');
}

function showTchr(elId) {
    if (!docElId(elId).classList.contains('show-teacher')) {
        docElId(elId).className += ' show-teacher';
    }
}

function hideTchr(elId){
    docElId(elId).className = cleanClssLstRemove(docElId(elId).className, "show-teacher");
}

function showHideEl(el) { //shows and hides the list of categories/courses in the reference section
    var nextEl = docElId("courselist" + el.substring(6));
    if (nextEl.getAttribute("class") !== "hide") {
        nextEl.setAttribute("class", "hide");
    }
    else {
        nextEl.setAttribute("class", "show");
    }
}

function toggleBehaviorForUpdateCsvs(elId) {
    var el = docElId(elId);
    var isEditMode = el.classList.contains("btn-warning");
    var isUpdateMode = el.classList.contains("btn-primary");

    if (isUpdateMode === true) {
        updateCsvHdrs(false, elId);
    } else if (isEditMode === true) {
        updateCsvHdrs(true, elId);
    }
}

function toggleUpdateCsvA() {
    toggleBehaviorForUpdateCsvs("updateHdrsA");
}

function toggleUpdateCsvB() {
    toggleBehaviorForUpdateCsvs("updateHdrsB");
}

function closeSettingsScreen() {
    removeSettingsListeners();
    getMaxHrsFromUser();
    chkDeptGrpsAfterEdit();
    updateSettingsUI();
    hideEl('setting-section');
    showEl('displayOverrides');
    showEl('left');
    showEl('right');
}

function showInfoA() {
    showEl('information');
    hideEl('parsing');
}

function hideInfoA() {
    hideEl('information');
    showEl('parsing');
}

function showInfoB() {
    showEl('information');
    hideEl('displayOverrides');
    hideEl('left');
    hideEl('right');
}

function hideInfoB() {
    hideEl('information');
    showEl('displayOverrides');
    showEl('left');
    showEl('right');
}

function showStats() {
    initStatsListener();
    showEl('statistics');
    hideEl('displayOverrides');
    hideEl('left');
    hideEl('right');
}

function hideStats() {
    removeStatsListener();
    hideEl('statistics');
    showEl('displayOverrides');
    showEl('left');
    showEl('right');
}

/*******************Settings OVERRIDES**************************/
function addnewCourse() {
    hideEl('displayOverrides');
    docElId('left').style.visibility = 'hidden';
    docElId('right').style.visibility = 'hidden';
    initNewCourseListeners();
    showEl('newcoursemodal');
}

function addNewEmptyMtoFSchedule() {
    displayNewEmptySchedule('MtoF');
    docElId('pagebottom').scrollIntoView({
        behavior: "smooth"
    });
}

function addNewEmptySatSchedule() {
    displayNewEmptySchedule('Sat');
    docElId('pagebottom').scrollIntoView({
        behavior: "smooth"
    });
}

function genericChkBypass(prop, elId) {
    if (stats.settings.overrides[prop] === true) {
        stats.settings.overrides[prop] = false;
        docElId(elId).className = cleanClssLstRemove(docElId(elId).className, "bypass");
        return;
    }
    stats.settings.overrides[prop] = true;
    docElId(elId).className += " bypass";
}

function deptsChkBypass() {
    genericChkBypass("deptGrps", "deptgrpsbyps");
}

function schedChkBypass() {
    genericChkBypass("maxHours", "schedhrsbyps");
}

function dayChkBypass() {
    genericChkBypass("maxHrsPerDay", "dayhrsbyps");
}

function seqChkBypass() {
    genericChkBypass("maxSeqHrs", "seqhrsbyps");
}

function toggleXtraCourseInputs(state) {
    docElId('select-styleF').style.visibility = state;
    docElId('select-styleG').style.visibility = state;
    docElId('newcourseroomB').style.visibility = state;
}

function durationone() {
    populateClassTimes("onehour");
    toggleXtraCourseInputs("visible");
}

function durationninety() {
    populateClassTimes("ninety");
    toggleXtraCourseInputs("visible");
}

function durationtwo() {
    populateClassTimes("twohour");
    toggleXtraCourseInputs("hidden");
}

function durationthree() {
    populateClassTimes("threehour");
    toggleXtraCourseInputs("hidden");
}

function makeNewCat() {
    hideEl('chooseexistingcats');
    showEl('choosenewcat');
}

function exitMakeNewCat() {
    showEl('chooseexistingcats');
    hideEl('choosenewcat');
}

function updateDisplayAllCourses() {
    var len = stats.indexData.courses.length;
    var cObjRef,
        statsRef,
        i;

    populateNewCourseOpts();
    emptyContent(docElId('references'));
    displayAllCourseRefs();
    //update the display if the courses have been assigned: part of loadStateFromData()
    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];
        cObjRef = courseData[statsRef];

        if (cObjRef.assgn !== "") {
            toggleColorsOnOff(cObjRef.assgn, statsRef, "off");
            toggleColorsOnOff(cObjRef.assgn, statsRef, "on");
        }
        if (cObjRef.cat !== "CLINIC") {
            docElId("edrinit-" + statsRef).style.display = "inline-block";
            docElId("ref" + statsRef).style.display = "inline-block";
        }
    }
}

function hideCatEdit(catNumber) {
    showEl('catref' + catNumber);
    hideEl('catcontain' + catNumber);
}

function showCatEdit(catNumber) {
    hideEl('catref' + catNumber);
    showEl('catcontain' + catNumber);
}

/****************************DISPLAY AND TRIGGERS****************************/
function buildTokens(idx) { //if no course assigned, "c" === 0
    var tokens = idx.split(/[scdt]/).map(Number); //idx.split(/[scdt]+/).map(Number); //s=schedule, c=course, d=day,t=time(hour)

    tokens.shift();
    return tokens;
}

function shiftOrAltShiftWithClick(el, elId) {
    var cParam = (elId).substring(3);

    scrollToSchedule(elId);

    if (shiftKeyDepressed(el)) {
        if (courseData[cParam].cat ==="CLINIC") {
            deleteCourseNoWarning(cParam);
            return;
        }
        if (!altKeyDepressed(el)) {
            removeAssignmentUsingcParam(cParam);
            return;
        }
        stats.tempCparam = "" + cParam;
        docElId(elId).style.backgroundColor = "#2c3e50";
        docElId(elId).style.color = "#ffffff";
    }
}

function hasClickedOnEditor(elId) {
    var substr0_8 = (elId).substring(0, 8);
    var substr8 = (elId).substring(8);

    if (substr0_8 === "edrinit-") {
        initEditing(substr8);
        return;
    }
    if (substr0_8 === "edrsave-") {
        getEditorValuesOnSave(substr8);
        return;
    }
    if ((elId).substring(0, 7) === "edrdel-") {
        destroyOneCourse((elId).substring(7));
        return;
    }
}

function hasClickedOnCat(elId) {
    var substr6 = (elId).substring(0, 6);
    var catname = (elId).substring(6);

    switch (substr6) {
        case "catedt": showCatEdit(catname);
        break;
        case "catsve": saveNewCatName(catname);
        break;
        case "catdel": triggerCatDelete(catname);
        break;
        case "catref": showHideEl(elId);
        break;
        default: return;
    }
}

function findInList(el) { //identifying the clicked cell on the reference course list...
    var elId,
        str,
        tempCid;

    if (stats.tempCparam !== "") {
        tempCid = "ref" + stats.tempCparam + "";
        
        try { //edge case...UI unresponsive when course deleted but not cleared in schedule (cannot replicate error)
            docElId(tempCid).style.backgroundColor = "";
            docElId(tempCid).style.color = "";
        } catch (e) {
            stats.tempCparam = "";
        } 
    }
    klinicLock("off");

    if (stats.tempKlinic.kbtn !== "") {
        toggleKlinicBtn(null, "off");
        stats.tempKlinic.kbtn = "";
    }
    if (el.target !== el.currentTarget) {
        elId = el.target.id;
        str = elId.substring(0, 3);

        switch (str) {
            case "rec": recycleOneCat(elId);
            break;
            case "bld": initAutoBuilder(elId);
            break;
            case "ref": shiftOrAltShiftWithClick(el, elId);
            break;
            case "cat": hasClickedOnCat(elId);
            break;
            case "edr": hasClickedOnEditor(elId);
            break;
            default: return;
        }
    }
    el.stopPropagation();
}

function toggleKlinicBtn(elId, state) {
    var parentEl = docElId("klinicscontainer");
    var childEl,
        i;

    if (parentEl.hasChildNodes()) {
        childEl = parentEl.childNodes;
        for (i = 0; i < childEl.length; i++) {
            childEl[i].className = cleanClssLstRemove(childEl[i].className, "active")
        }
    }
    if (state === "on") {
        docElId("kbtn_" + elId).className += " active";
    }
}

function handleScheduleClickedFromMap(el, elId)  {
    var elTokens = buildTokens(elId);
    var cParam,
        tempKlinicName;

    if (elTokens.length !== 4) { return; } //for if the mouse slips: user hiccups

    cParam = "c0";

    if (elTokens[1] !== 0) { cParam = "c" + elTokens[1]; }
    //ASSIGNING
    if (elTokens[1] === 0) { //assigning a regular course
        if (stats.tempKlinic.kbtn === "") {
            if (shiftKeyDepressed(el) && altKeyDepressed(el) && stats.tempCparam !== "") {
                if (courseData[stats.tempCparam].cat !== "CLINIC")  {
                    setAssignmentViaUI(elTokens[0], stats.tempCparam);
                    stats.tempCparam = "";
                }
            } else {
                toggleColor(el.target.id, elTokens); //rotate through regular assignments
            }
        } else { //assigning a klinic
            tempKlinicName = "" + stats.tempKlinic.kbtn;
            makeNewKlinicRef(el.target.id, tempKlinicName);

            if (stats.tempKlinic.isHeld === false) {
                stats.tempKlinic.kbtn = "";
            }
            return;
        }
    } else {
    //UNASSIGNING
        if (courseData[cParam].cat !== "CLINIC") { //UNassigning a regular course
            if (shiftKeyDepressed(el)) {
                removeAssignmentUsingsParam(elTokens);
            } else {
                toggleColor(el.target.id, elTokens); //rotate through regular assignments
            }
        } else { //UNassigning a klinic
            toggleKlinicBtn(null, "off");
            stats.tempKlinic.kbtn = "";
            deleteCourseNoWarning(cParam);
        }
    }
}

function findInMap(el) { //identifying the clicked cell in schedules list
    var elId,
        substr1,
        substr3,
        substr4,
        tempCid;

    if (stats.tempCparam !== "") {
        tempCid = "ref" + stats.tempCparam + "";
            
        try { //edge case...UI unresponsive when course deleted but not cleared in schedule (cannot replicate error)
            docElId(tempCid).style.backgroundColor = "";
            docElId(tempCid).style.color = "";
        } catch (e) {
            stats.tempCparam = "";
        } 
    }
    if (stats.tempKlinic.kbtn !== "" && stats.tempKlinic.isHeld === false) { toggleKlinicBtn(null, "off"); }
    if (stats.tempKlinic.kbtn === "" && stats.tempKlinic.isHeld !== false) {
        klinicLock("off");
        toggleKlinicBtn(null, "off");
    }
    if (el.target !== el.currentTarget) {
        elId = el.target.id;
        substr1 = elId.substring(0, 1);

        if (substr1 === "s") {
            handleScheduleClickedFromMap(el, elId); //clicking a schedule assignment cell...
        } else {
            substr3 = elId.substring(0, 3);

            if (substr3 === "del") {
                removeScheduleFromDisplay(elId);
            } else if (substr3 === "off") {
                if (shiftKeyDepressed(el)) {
                    resetDayOff(elId);
                } else {
                    setNewDayOff(elId);
                }
            } else {
                substr4 = elId.substring(0, 4);

                if (substr4 === "tchr") {
                    tchrAssgnments(elId);
                } else if (substr4 === "rese") {
                    recycleOneSchedule(elId);
                }
            }
        }
        el.stopPropagation();
    }
}

function activateKlinicWhenClicked(el, elId) { //"kbtn_"
    if (shiftKeyDepressed(el)) {
        stats.tempKlinic.kbtn = "";
        toggleKlinicBtn(null, "off");
        return;
    }
    //selecting only saves the name to stats.tempKlinic
    //presence of this value when subsequently clicking on a schedule cell init.s  createOneKlinic(elId, tempKlinicName);
    stats.tempKlinic.kbtn = elId.substring(5);
    toggleKlinicBtn(stats.tempKlinic.kbtn, "on");
}

function findInLeftMainUi(el) {
    if (el.target !== el.currentTarget) {
        var elId = el.target.id;

        if (elId.substring(0,5) === "kbtn_"){
            activateKlinicWhenClicked(el, elId);
        }
        else {
            switch (elId) {
                case "addnewcourse": addnewCourse();
                break;
                case "renamer": initRenamingCourses();
                break;
                case "purger": purgeAllCourses();
                break;
                case "openklinics": defineKlinics();
                break;
                case "coursefinder": searchCourses();
                break;
                case "savenewCNames": verifyNewCourseNames();
                break;
                case "exitnewCNames": closeRenamingCourses();
                break;
                default: return;
            }
        }
    }
    el.stopPropagation();
}

function findInRightMainUi(el) {
    if (el.target !== el.currentTarget) {
        var elId = el.target.id;

        switch (elId) {
            case "deptgrpsbyps": deptsChkBypass();
            break;
            case "dayhrsbyps":
            case "dayhrsset": dayChkBypass();
            break;
            case "downloadjson": saveSessionAsJSON();
            break;
            case "downloadcsv": saveCourseDataAsCSV();
            break;
            case "downloadpdf":
            case "dlklinicpdf": makePDFinit(elId);
            break;
            case "newmontofri": addNewEmptyMtoFSchedule();
            break;
            case "newmontosat": addNewEmptySatSchedule();
            break;
            case "schedhrsbyps":
            case "schedhrsset": schedChkBypass();
            break;
            case "seqhrsbyps":
            case "seqhrsset": seqChkBypass();
            break;
            case "open-settings": openSettings();
            break;
            case "updatenames": showUpdateTchrs();
            break;
            default: return;
        }
    }
    el.stopPropagation();
}

function findInMakeNewCourse(el) {
    if (el.target !== el.currentTarget) {
        var elId = el.target.id;

        switch (elId) {
            case "newcoursecatmake": makeNewCat();
            break;
            case "savenewcat": createNewCat(true, docElId('definenewcat').value);
            break;
            case "savecoursechanges": makeNewCourseRef();
            break;
            case "exitchoosenewcat": exitMakeNewCat();
            break;
            case "exitcoursechanges": exitChangesToCourse();
            break;
            default: return;
        }
    }
    el.stopPropagation();
}

function tchrAssgnments(el) {
    var str = (el).substring(4, 7);
    var sParam = (el).substring(7);

    switch (str) {
        case "set": changeTchr(sParam);
        break;
        case "clr": clearAssgndtchr(sParam);
        break;
        case "sve": saveTchrChange(sParam);
        break;
        default: return;
    }
}

function shiftKeyDepressed(el) {
    if (el.shiftKey) {
        return true;
    }
    return false;
}

function altKeyDepressed(el) {
    if (el.altKey) {
        return true;
    }
    return false;
}

function clickedDayOff(el) {
    var sParam = el.substring(4); //get the schedule Id: "off" + "5" + "s1" -> "s1" //note: default dayOff is 6 (Sun./undefined)
    var i;

    for (i = 0; i < 5; i++) { //ALWAYS ASSUME [] Mon to Fri
        docElId("off" + "" + i + "" + sParam + "").style.color = ""; //reset the colors...
    }
    if (scheduleData[sParam].hasOwnProperty('isSat')) {
        docElId("off5" + sParam + "").style.color = "";
    }
    docElId(el).style.color = "#2c3e50"; //set the color of the active triangle e.g. off0s1 is the newDayOff
    return sParam;
}

function toggleColor(el, elTokens) { //fired only when a schedule 'assignment' cell is clicked
    var sParam = "s" + elTokens[0];
    var dayHrId = [elTokens[2], elTokens[3]];
    var cParamFound,
        replaceText,
        currentcParam,
        nextcParamFound;

    if (elTokens[1] === 0) { //assigning first available course when clicking on an empty cell
        cParamFound = fillTimeWithFirstChoice(sParam, dayHrId); //returns: cParam | nada
        if (cParamFound !== "nada") {
            toggleColorsOnOff(sParam, cParamFound, "on");
            updateCatListOnSchedule(sParam);
        } else {
            docElId(el).textContent = 'X';
            replaceText = window.setTimeout(function () {
                docElId(el).textContent = '0';
                window.clearTimeout(replaceText);
            }, 800);
        }
    }
    if (elTokens[1] !== 0) { //assigning next available course when clicking on an assigned cell
        currentcParam = "c" + elTokens[1];
        nextcParamFound = rotateToNextAvailableCourse(sParam, dayHrId, currentcParam); //returns: cParam | nada

        if (nextcParamFound !== "nada") {
            toggleColorsOnOff(sParam, nextcParamFound, "on");
            updateCatListOnSchedule(sParam);
        } else {
            removeAssignmentViaUI(sParam, currentcParam);  //exhausted all possibilities...
        }
    }
    checkTooFewCourses(sParam);
}

function stopKlinicInterfering() {
    if (stats.indexData.klinics.length){ return; } //no length means that there are no klinics to check

    klinicLock("off");
    toggleKlinicBtn(null, "off");
    stats.tempKlinic.kbtn = "";
}

function updateCatListOnSchedule(sParam) { //update or append cats to #catlist on a UI schedule
    docElId("catlist" + sParam).textContent = getCatListForSchedule(sParam);
}

function setColorFromCat(catName, bool) { //false: cParam, true: cat
    var colorRef = config.alphabet;
    var colorRefValue = ''; //default color is #2c3e50
    var param,
        len,
        i;

    if (bool === true) {
        param = catName;
    } else {
        param = courseData[catName].cat;
    }
    len = stats.catData.length;

    for (i = 0; i < len; i++) {
        if (stats.catData[i][0] === param) {
            if (i >= colorRef.length) {
                colorRefValue = colorRef[i - colorRef.length];
                break;
            } else {
                colorRefValue = colorRef[i];
                break;
            }
        }
    }
    return colorRefValue;
}

function toggleColorsOnOff(sParam, cParam, state) { //this is required to throw errors when the objects have been updated incorrectly...
    var cObjRef = courseData[cParam];
    var oldIdOne,
        oldIdTwo,
        oldIdMid,
        newIdMid,
        newIdOne,
        newIdTwo;

    if (state === 'off') {
        oldIdOne = "" + sParam + cParam + "d" + cObjRef.dayhr[0][0] + "t" + cObjRef.dayhr[0][1];
        oldIdTwo = "" + sParam + cParam + "d" + cObjRef.dayhr[1][0] + "t" + cObjRef.dayhr[1][1];
        newIdOne = "" + sParam + "c0" + "d" + cObjRef.dayhr[0][0] + "t" + cObjRef.dayhr[0][1];
        newIdTwo = "" + sParam + "c0" + "d" + cObjRef.dayhr[1][0] + "t" + cObjRef.dayhr[1][1];

        if (cObjRef.duration ==="threehour") {
            oldIdMid = "" + sParam + cParam + "d" + cObjRef.dayhr[0][0] + "t" + (cObjRef.dayhr[0][1] + 1);
            newIdMid = "" + sParam + "c0" + "d" + cObjRef.dayhr[0][0] + "t" + (cObjRef.dayhr[0][1] + 1);
        }
        docElId(oldIdOne).setAttribute("id", newIdOne);
        docElId(newIdOne).className = "";
        docElId(newIdOne).textContent = "0";

        if (cObjRef.duration !=="klinichour") {
            docElId(oldIdTwo).setAttribute("id", newIdTwo);
            docElId(newIdTwo).className = "";
            docElId(newIdTwo).textContent = "0";
        }
        if (cObjRef.duration ==="threehour") {
            docElId(oldIdMid).setAttribute("id", newIdMid);
            docElId(newIdMid).className = "";
            docElId(newIdMid).textContent = "0";
        }
    } else if (state === 'on' || 'init') {
        oldIdOne = "" + sParam + "c0" + "d" + cObjRef.dayhr[0][0] + "t" + cObjRef.dayhr[0][1];
        oldIdTwo = "" + sParam + "c0" + "d" + cObjRef.dayhr[1][0] + "t" + cObjRef.dayhr[1][1];
        newIdOne = "" + sParam + cParam + "d" + cObjRef.dayhr[0][0] + "t" + cObjRef.dayhr[0][1];
        newIdTwo = "" + sParam + cParam + "d" + cObjRef.dayhr[1][0] + "t" + cObjRef.dayhr[1][1];

        if (cObjRef.duration ==="threehour") {
            oldIdMid = "" + sParam + "c0" + "d" + cObjRef.dayhr[0][0] + "t" + (cObjRef.dayhr[0][1] + 1);
            newIdMid = "" + sParam + cParam + "d" + cObjRef.dayhr[0][0] + "t" + (cObjRef.dayhr[0][1] + 1);
        }
        docElId(oldIdOne).setAttribute("id", newIdOne);
        docElId(newIdOne).className = "selected" + setColorFromCat(cParam, false);
        docElId(newIdOne).textContent = '' + cObjRef.name + '(' + cObjRef.dept + ')';

        if (cObjRef.duration !=="klinichour") {
            docElId(oldIdTwo).setAttribute("id", newIdTwo);
            docElId(newIdTwo).className = "selected" + setColorFromCat(cParam, false);
            docElId(newIdTwo).textContent = '' + cObjRef.name + '(' + cObjRef.dept + ')';
        }
        if (cObjRef.duration ==="threehour") {
            docElId(oldIdMid).setAttribute("id", newIdMid);
            docElId(newIdMid).className = "selected" + setColorFromCat(cParam, false);
            docElId(newIdMid).textContent = '' + cObjRef.name + '(' + cObjRef.dept + ')';
        }
    }
    if (state !== 'init') {
        scrollToCourse(cParam);
    }
    toggleCourseRef(cParam);
}

function findInTchrs(el) { //setting teacher.value to empty string on UI only (changes to stats.teachers made on save only)
    var dParam;

    if (el.target !== el.currentTarget) {
        if ((el.target.id).substring(0, 7) == "prsndel") {
            dParam = (el.target.id).substring(7);
            docElId('prsnnm' + dParam).value = "";
            docElId('prsn' + dParam).style.display = "none";
        }
    }
    el.stopPropagation();
}

function scrollToSchedule(el) {
    var sParam = courseData["" + el.substring(3) + ""].assgn;
    var replaceColor;

    if (sParam !== "") {
        docElId(sParam).scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
        docElId(sParam).className += " highlight";
        replaceColor = window.setTimeout(function () {
            //docElId(sParam).className = docElId(sParam).className.replace(/(?:^|\s)highlight(?!\S)/g, '');
            docElId(sParam).className = cleanClssLstRemove(docElId(sParam).className, "highlight");
            window.clearTimeout(replaceColor);
        }, 3000);
    }
}

function scrollToCourse(cParam) {
    if (cParam !== "c0") {
        docElId("contain" + cParam).scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function toggleCourseRef(cParam) { //updates the assigned status of a course in the reference section
    var ref = docElId("ref" + cParam);
    var sSgn = docElId("sSgn" + cParam);
    var activeColor;

    if (courseData[cParam].assgn === "") { //chk for non-assigned
        ref.setAttribute("class", "whitecircle");
        sSgn.textContent = '';
        return;
    }
    activeColor = 'activecircle' + setColorFromCat(cParam, false); //...returns string character: A-Z or empty
    ref.setAttribute("class", activeColor);
    sSgn.textContent = ' ' + courseData[cParam].assgn + '';
}

function displayAllCourseRefs() {
    var tempAllCats = [];
    var cLen = stats.catData.length;
    var len = stats.indexData.courses.length;
    var statsRef,
        catRef,
        i;

    for (i = 0; i < cLen; i++) { //get all the categories onto the UI...note: stats.catData is sorted!
        catRef = stats.catData[i][0];
        displayNewCat(i + 1);
        tempAllCats.push(catRef);

        if (catRef.substring(0, 8) === "$deleted") { //on the offchance that there were $deleted cats left in the data somewhere...
            disableUIforDeletedCat(i + 1);
        }
    }
    for (i = 0; i < len; i++) { //This will add them one by one....
        statsRef = stats.indexData.courses[i];
        displayNewCourseRef(statsRef, tempAllCats.indexOf(courseData[statsRef].cat) + 1);
    }
    displayAutoBuilderIcon();
}

function displayAutoBuilderIcon() {
    var i;

    for (i = 0; i < stats.catData.length; i++) {
        if (stats.catData[i][0] !== "CLINIC") {
            if (Number(stats.catData[i][1]) > (Number(stats.settings.maxHours) / 2)) {
                showEl('bldr' + [i + 1]);
            }
        }
    }
}

function showOrHideEditingControls(cParam, bool) { //bool = true (show)
    var str1 = "none";
    var str2 = "inline-block";
    var cObjRef = courseData[cParam];

    if (cObjRef.cat === "CLINIC") { return; }
    if (!bool) {
        str2 = "none";
        str1 = "inline-block";
    }
    docElId("ref" + cParam).style.display = str1;
    docElId("edrinit-" + cParam).style.display = str1;

    if (cObjRef.duration === "twohour" || cObjRef.duration === "threehour") {
        docElId("edrday2-" + cParam).style.display = "none";
        docElId("edrstart2-" + cParam).style.display = "none";
    }
    docElId("edrsave-" + cParam).style.display = str2;
    docElId("edredit-" + cParam).style.display = str2;
    docElId("edrdel-" + cParam).style.display = str2;
}

function showEditingControls(cParam) {
    showOrHideEditingControls(cParam, true);
}

function hideEditingControls(cParam) {
    showOrHideEditingControls(cParam, false);
}

function displayUpdatedDeptGroups() {
    var i;

    docElId('deptgroupsset').textContent = '';
    if (!stats.settings.deptGrps.length) {
        hideEl('deptgrpcontrol');
        showEl('nodeptgrps');
        return;
    }
    for (i = 0; i < stats.settings.deptGrps.length - 1; i++) {
        docElId('deptgroupsset').textContent += ' ' + stats.settings.deptGrps[i] + ' -';
    }
    docElId('deptgroupsset').textContent += ' ' + stats.settings.deptGrps[stats.settings.deptGrps.length - 1] + '';
    showEl('deptgrpcontrol');
    hideEl('nodeptgrps');
}

function updateSettingsUI() { //on save/exit of edit settings...push all settings values to textContent
    docElId('schedhrsset').textContent = stats.settings.maxHours;
    docElId('dayhrsset').textContent = stats.settings.maxHrsPerDay;

    if (stats.settings.maxSeqHrs === 2) {
        docElId('seqhrsset').textContent = "2-2-3(3)";
    } else {
        docElId('seqhrsset').textContent = "3-4-3(6)";
    }
    togglebypassControlClass(stats.settings.overrides.deptGrps, "deptgrpsbyps");
    displayUpdatedDeptGroups();
    showEl('displayOverrides');
}

function exitChangesToCourse() { //triggered when exiting add new course
    hideEl('newcoursemodal');
    removeNewCourseListeners();
    editorHandlerOff();
    docElId('left').style.visibility = 'visible';
    docElId('right').style.visibility = 'visible';
    showEl('displayOverrides');
}

function findInDepts(el) { //click handler....setting dept.value to empty string on UI
    var dParam,
        elId;

    if (el.target !== el.currentTarget) {
        if ((el.target.id).substring(0, 7) == "deptdel") {
            dParam = (el.target.id).substring(7);
            elId = 'deptnm' + dParam;

            if (deleteDeptChkUI(elId) === true) { //check that the dept is not in use
                docElId(elId).value = "";
                docElId('dpts' + dParam).style.display = "none";
            }
        }
    }
    el.stopPropagation();
}

function findInScheduleSettings(el) {
    if (el.target !== el.currentTarget) {
        if (el.target.id === "makegroup") {
            setDeptGrpViaUI();
        }
    }
    el.stopPropagation();
}

function findInDeptGroup(el) { //identifying the clicked cell on the reference dept list
    if (el.target !== el.currentTarget) {
        if ((el.target.id).substring(0, 3) == "opt") {
            if (el.shiftKey) {
                defineDeptGrp(el.target.id, false); //deselect
            } else {
                defineDeptGrp(el.target.id, true); //select
            }
        }
    }
    el.stopPropagation();
}

/***************************EDITING COURSES triggers***************************/
function openEditing() {
    var len = stats.indexData.courses.length;
    var statsRef,
        i;

    docElId('left').style.width = "40%";
    docElId('right').style.width = "60%";
    docElId('rightsidesettings').style.width = "60%";
    docElId('leftsidesettings').style.width = "40%";
    docElId('right').className += " disabled";
    docElId('rightsidesettings').className += " disabled";

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];
        if (courseData[statsRef].cat === "CLINIC") { continue; }
        docElId("edrinit-" + statsRef).style.display = "inline-block";
        docElId("ref" + statsRef).style.display = "inline-block";
    }
    for (i = 0; i < stats.catData.length; i++) {
        showEl('catedt' + [i + 1]);
    }
}

function closeEditing() {
    var len = stats.indexData.courses.length;
    var statsRef,
        i;

    docElId('left').style.width = "";
    docElId('right').style.width = "";
    docElId('rightsidesettings').style.width = "";
    docElId('leftsidesettings').style.width = "";
    docElId('right').className = cleanClssLstRemove(docElId('right').className, "disabled");
    docElId('rightsidesettings').className = cleanClssLstRemove(docElId('rightsidesettings').className, "disabled");

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];

        if (docElId("edredit-" + statsRef).hasChildNodes) {
            emptyContent(docElId("edredit-" + statsRef));
        }
        docElId("edrinit-" + statsRef).style.display = "none";
        docElId("edrsave-" + statsRef).style.display = "none";
        docElId("edredit-" + statsRef).style.display = "none";
        docElId("edrdel-" + statsRef).style.display = "none";
        docElId("ref" + statsRef).style.display = "block";
    }
    for (i = 0; i < stats.catData.length; i++) {
        hideEl('catcontain' + [i + 1]);
        hideEl('catedt' + [i + 1]);
        showEl('catref' + [i + 1]);
    }
}

//initial course definitions come with temporary names...the university changes all course names after having been finalized...
function initRenamingCourses() {
    var len = stats.indexData.courses.length;
    var statsRef,
        i;

    hideEl('renamer');

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];
        if (courseData[statsRef].cat === "CLINIC") { continue; }
        if (docElId("edredit-" + statsRef).hasChildNodes) {
            emptyContent(docElId("edredit-" + statsRef));
        }
        docElId("edrinit-" + statsRef).style.display = "none";
        docElId("edrsave-" + statsRef).style.display = "none";
        docElId("edrdel-" + statsRef).style.display = "none";
        docElId("ref" + statsRef).style.display = "none";
        docElId("edredit-" + statsRef).style.display = "inline-block";
        openRenameAllCourses(statsRef); //...oldName (text) -> newName (input)
    }
    for (i = 0; i < stats.catData.length; i++) {
        showHideEl("catref" + [i + 1]); //show all lists...
        hideEl('catedt' + [i + 1]);
    }
    showEl('newCNames');
    hideEl('purger');
    hideEl('addnewcourse');
    hideEl('openklinics');
}

function closeRenamingCourses() {
    var len = stats.indexData.courses.length;
    var statsRef,
        i;

    hideEl('newCNames');

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.courses[i];
        docElId("edredit-" + statsRef).style.display = "none";

        if (docElId("edredit-" + statsRef).hasChildNodes) {
            emptyContent(docElId("edredit-" + statsRef));
        }
        docElId("ref" + statsRef).style.display = 'inline-block';

        if (courseData[statsRef].cat !== "CLINIC") {
            docElId("edrinit-" + statsRef).style.display = 'inline-block';
        }
    }
    for (i = 0; i < stats.catData.length; i++) {
        showHideEl("catref" + [i + 1]); //collapse all lists...
        showEl('catedt' + [i + 1]);
    }
    showEl('renamer');
    showEl('purger');
    showEl('addnewcourse');
    showEl('openklinics');
}

function updateCsvHdrs(bool, elId) {
    var elsArr = [];
    var i;

    if (elId === "updateHdrsA") {
        elsArr = ["strHdr1", "strHdr2", "strHdr3", "strHdr4"];
    } else {
        elsArr = ["strHdr5", "strHdr6"];
    }

    for (i = 0; i < elsArr.length; i++) {
        updateCsvString(elsArr[i]);
        docElId(elsArr[i]).disabled = !(bool); //enable or disable the input
    }

    if (bool === false) {
        docElId(elId).className = cleanClssLstRemove(docElId(elId).className, "btn-primary");
        docElId(elId).className += " btn-warning";
        docElId(elId).textContent = "edit headers";
        window.mscAlert({
            title: '',
            subtitle: 'The csv headers have been updated.'
        });
        return;
    }
    docElId(elId).className = cleanClssLstRemove(docElId(elId).className, "btn-warning");
    docElId(elId).className += " btn-primary";
    docElId(elId).textContent = "update headers";
}

/***********************On INPUT functions**************************/

function chkHrsPerScheduleInput() { /*Settings*/
    var val = Number(docElId('hrsPerSchedule').value);
    var color = "";

    if (config.uiScheduleNumOfHrsPerDay * 5 < val) {
        color = "#d62c1a";
    }
    docElId('hrsPerSchedule').style.color = color;
}

function chkHrsPerDayInput() { /*Settings*/
    var val = Number(docElId('hrsPerDay').value);
    var color = "";

    if (config.uiScheduleNumOfHrsPerDay < val) {
        color = "#d62c1a";
    }
    docElId('hrsPerDay').style.color = color;
}

function inputCourseCode() { /*New Course Modal*/ //input: new course code
    var elId = docElId('newcoursename');
    var regexStr = "^([0-9]{" + config.courseNameNumLength + "})$"

    elId.style.color = regExChkInputReturnColorStr(elId.value, regexStr);;
}

function inputRmNum() { /*New Course Modal*/ //input: new room number
    var elId = docElId('newcourseroom');

    elId.style.color = regExChkInputReturnColorStr(elId.value, "^([a-zA-Z0-9\\-\\u3130-\\u318F\\uAC00-\\uD7AF])");;
}

function searchCourses() {
    var el = docElId("searchcourses");
    var regExr = new RegExp("^([0-9]{" + config.courseNameNumLength + "})$", "g");

    var isValid = regExr.test(el.value);
    var inputValue,
        cParam;

    if (!isValid) {
        removeArrowpointer();
        el.style.color = '#d62c1a';
        return;
    }
    el.style.color = "";
    inputValue = el.value;
    cParam = findcRefByCourseName(inputValue);

    if (cParam == undefined) {
        removeArrowpointer();
        el.style.color = '#d62c1a';
        return;
    }
    showArrowpointer(cParam);
    scrollToCourse(cParam);
}

function showArrowpointer(cParam) {
    removeArrowpointer();
    docElId("contain" + cParam).className += ' arrow-pointer';
    stats.lastSearchItem = cParam;
}

function removeArrowpointer() {
    var stsRef = stats.lastSearchItem;
    var stsStr = "contain" + stsRef;

    if (stsRef !== "" && courseData[stsRef] !== undefined) {
        docElId(stsStr).className = cleanClssLstRemove(docElId(stsStr).className, "arrow-pointer");
        stats.lastSearchItem = "";
    }
}

function updateScheduleDisplayNumbers(bool) { //true: when updating UI (e.g. after destroying a schedule)
    var len = stats.indexData.schedules.length;
    var statsRef,
        i;

    for (i = 0; i < len; i++) {
        statsRef = stats.indexData.schedules[i];
        scheduleData[statsRef].display = "s" + (stats.indexData.schedules.indexOf(statsRef) + 1);
    }
    if (bool === true) {
        for (i = 0; i < len; i++) {
            statsRef = stats.indexData.schedules[i];
            document.getElementById(statsRef).childNodes[0].childNodes[0].textContent = scheduleData[statsRef].display; //textNode Content
        }
    }
}

function togglebypassControlClass(propVal, elId) {
    if (propVal === true) {
        docElId(elId).className += ' bypass';
        return;
    }
    docElId(elId).className = cleanClssLstRemove(docElId(elId).className, "bypass");
}

function setOverrideControls() { //set override UI controls...
    togglebypassControlClass(stats.settings.overrides.deptGrps, "deptgrpsbyps");
    togglebypassControlClass(stats.settings.overrides.maxHours, "schedhrsbyps");
    togglebypassControlClass(stats.settings.overrides.maxHrsPerDay, "dayhrsbyps");
    togglebypassControlClass(stats.settings.overrides.maxSeqHrs, "seqhrsbyps");

    if (stats.settings.deptGrpsSetBy === 'week') {
        docElId('deptGrpsWeekly').checked = true;
    } else {
        docElId('deptGrpsDaily').checked = true;
    }
    if (stats.settings.overrides.multiCats === true) {
        docElId('mlticatsyes').checked = true;
    } else {
        docElId('mlticatsno').checked = true;
    }
}

function updateSettingsInputVals() {
    docElId("hrsPerSchedule").value = stats.settings.maxHours;
    docElId("hrsPerDay").value = stats.settings.maxHrsPerDay;

    if (stats.settings.maxSeqHrs === 2) {
        docElId("seqHrsTwo").checked = true;
    } else {
        docElId("seqHrsThree").checked = true;
    }
}

function showEDITdepts() {
    displayDeptList();
    docElId('setting-section').className += " disabled";
    docElId('newcourseform').className += " disabled";
    hideEl('hiddendeptopenL');
    hideEl('hiddendeptopenR');
    showEl('departments');
}

function exitEDITdepts() { //exit only: no save
    hideEl('departments');
    showEl('hiddendeptopenR');
    showEl('hiddendeptopenL');
    docElId("setting-section").className = cleanClssLstRemove(docElId("setting-section").className, "disabled");
    docElId("newcourseform").className = cleanClssLstRemove(docElId("newcourseform").className, "disabled");
    emptyContent(docElId('deptEDIT'));
}


function changeConfigAtParsingScreen() {
    var slctStart = docElId("configStartHr");
    var container = docElId("configNumOfHrsPerDay");
    var startHr = Number(slctStart.options[slctStart.selectedIndex].value);
    var frag = document.createDocumentFragment();
    var opt,
        len,
        i;

    emptyContent(container);

    for (i = startHr; i < 23; i++) { //physical limit: 24:00 hours
        opt = document.createElement("OPTION");

        opt.value = i + 1;
        opt.textContent = ("0" + opt.value).slice(-2) + ":00";

        frag.appendChild(opt);
    }
    container.appendChild(frag);
    len = container.options.length;

    if (len < config.uiScheduleNumOfHrsPerDay) {
        container.options[len - 1].selected = true;
    } else {
        container.options[config.uiScheduleNumOfHrsPerDay - 1].selected = true;
    }
}

function getConfigFromParsingScreen() { //called BEFORE: csv is parsed or blank session initialised - json uploads contain own config values
    var startVal = Number(docElId("configStartHr").value);
    var endVal = Number(docElId("configNumOfHrsPerDay").value);

    config.uiTimeInputStartHr = startVal * 1;
    config.uiScheduleNumOfHrsPerDay = (endVal - startVal) * 1;

    if (9 !== config.uiTimeInputStartHr) { config.pdfBlankHr = ""; }
    docElId("configStartHr").disabled = true;
    docElId("configNumOfHrsPerDay").disabled = true;
}

//if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/schedules/serviceWorker.js'); } //required for PWA install
if ("onpagehide" in window ) {
    window.addEventListener("pagehide", saveToLocalStorage, false);
} else {
    window.addEventListener("beforeunload", saveToLocalStorage, false);
}

initCoreApp();
// })();
// });
