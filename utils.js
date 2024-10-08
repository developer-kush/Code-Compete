const GETTEXT_DOMAIN = 'code-compete';

import St from 'gi://St';
import Gio from 'gi://Gio';

export function openUrl(url) {
    try {
        let browser = Gio.AppInfo.get_default_for_uri_scheme("http");
        if (browser) {
            browser.launch_uris([url], null);
        }
    } catch (e){
        console.log('Browser could not be opened')
    }
}

export function formatDateTimeRange(startDateTimeString, endDateTimeString) {
    const startDate = new Date(startDateTimeString);
    const endDate = new Date(endDateTimeString);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffStartDays = Math.floor((startDate - now) / (1000 * 60 * 60 * 24));
    const diffEndDays = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));

    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
    };

    const dateTimeOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };

    let startDateString;
    if (diffStartDays === 0) startDateString = 'Today';
    else if (diffStartDays === 1) startDateString = 'Tomorrow';
    else if (diffStartDays === 2) startDateString = 'Overmorrow';
    else startDateString = startDate.toLocaleDateString(undefined, dateTimeOptions);

    let endDateString;
    if (diffEndDays === 0) endDateString = 'Today ';
    else if (diffEndDays === 1) endDateString = 'Tomorrow ';
    else if (diffEndDays === 2) endDateString = 'Overmorrow ';
    else endDateString = endDate.toLocaleDateString(undefined, dateTimeOptions)+" ";

    if (endDateString == startDateString+" ") endDateString = "";

    // Format start and end times
    const startTime = startDate.toLocaleTimeString(undefined, timeOptions);
    const endTime = endDate.toLocaleTimeString(undefined, timeOptions);

    // Combine date, start time, and end time into a readable string
    let formattedString;
    if (startDateString === endDateString) {
        formattedString = `${startDateString}, ${startTime} - ${endTime}`;
    } else {
        formattedString = `${startDateString} ${startTime} - ${endDateString}${endTime}`;
    }

    return formattedString;
}

export function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        throw new Error("Invalid input. Duration must be a non-negative number.");
    }

    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let remainingSeconds = seconds % 60;

    let parts = [];

    if (hours > 0) {
        parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }
    if (remainingSeconds > 0) {
        parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
    }

    return parts.join(' ');
}


export function getTimeLeftLabel(startTimeISO, endTimeISO) {
    function getTimeDifference(start, end) {
        const diffInSeconds = Math.floor((end - start) / 1000);
        const units = [
            { label: 'd', value: 86400 }, 
            { label: 'h', value: 3600 }, 
            { label: 'm', value: 60 },
            { label: 's', value: 1 }
        ];

        for (let unit of units) {
            const magnitude = Math.floor(diffInSeconds / unit.value);
            if (magnitude > 0) {
                return { magnitude, unit: unit.label };
            }
        }
        return null;
    }

    const now = new Date();
    const start = new Date(startTimeISO);
    const end = new Date(endTimeISO);
    let labelText = '-';
    let style = 'background-color: grey; opacity: 0.6; padding: 2px; border-radius: 3px; font-size: 8px;';

    if (now < start) {
        // Contest hasn't started
        const timeDiff = getTimeDifference(now, start);
        if (timeDiff) {
            labelText = `${timeDiff.magnitude} ${timeDiff.unit}`;
            style = 'background-color: #007768; color: white; padding: 2px; border-radius: 3px; font-size: 12px;'; // Vibrant green
        }
    } else if (now >= start && now <= end) {
        // Contest is ongoing
        const timeDiff = getTimeDifference(now, end);
        if (timeDiff) {
            labelText = `${timeDiff.magnitude} ${timeDiff.unit}`;
            style = 'background-color: #993333; color: white; padding: 2px; border-radius: 3px; font-size: 12px;';
        }
    }

    const label = new St.Label({
        text: labelText,
        style_class: 'contest-time-left',
        style: style,
    });

    return label;
}

export function convertToLocalTime(utcTimeISO) {
    const utcDate = new Date(utcTimeISO);
    const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
    
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function getPlatformFromResource(host) {
    return {
        "codeforces.com" : "cf.png",
        "codeforces.com/gyms": "cf.png",
        "leetcode.com": "lc.png",
        "ctftime.org": "ctftime.png",
        "toph.co": "toph.png",
        "atcoder.jp": "atcoder.png",
        "atcoder.jp?lang=ja": "atcoder.png",
        "codingninjas.com/codestudio": "cninjas.png",
        "geeksforgeeks.org": "gfg.png",
        "topcoder.com": "topcoder.png",
        "cups.online": "cups.png",
        "yukicoder.me": "yukicoder.png",
        "contest.yandex.ru/CYF": "yandex.png",
        "codechef.com": "cc.png",
        "luogu.com.cn": "luogu.png",
        "hackerrank.com":"hr.png",
        "my.newtonschool.co": "newton.png",
        "robocontest.uz": "robo.png",
        "dmoj.ca": "dmoj.png",
        "ucup.ac": "unicup.png",
        "bestcoder.hdu.edu.cn": "bestcoder.png",
        "codingame.com": "codingame.png",
        "codingcompetitions.withgoogle.com": "google.png",
        "eolymp.com": "eolymp.png",
        "kaggle.com": "kaggle.png",
        "kep.uz": "kep.png",
        "mycode.prepbytes.com": "prepbytes.png",
        "open.kattis.com": "kattis.png",
        "solved.ac": "solved.png",
        "tlx.toki.id": "toki.png",
        "icpc.global": "icpc.png",
        "icpc.global/regionals": "icpc.png",
        "binarysearch.com": "bs.png",
        "spoj.com": "spoj.png",
        "usaco.org": "usaco.png",
        "projecteuler.net": "euler.png",
        "hackerearth.com": "hackerearth.png",
        "techgig.com": "techgig.png",
        "lightoj.com": "lightoj.png",
        "ac.nowcoder.com": "nowcoder.jpeg",
        "supecoder.dev": "supecoder.png"
    }[host] || "default.png";
}

export function getPlatformNameFromResource(resourceId) {
    const resourceToPlatform = {
        "codeforces.com": "Codeforces",
        "codeforces.com/gyms": "Codeforces GYMS",
        "leetcode.com": "Leetcode",
        "ctftime.org": "CTFtime",
        "toph.co": "Toph",
        "atcoder.jp": "AtCoder",
        "atcoder.jp?lang=ja": "AtCoder",
        "codingninjas.com/codestudio": "Coding Ninjas",
        "geeksforgeeks.org": "GeeksforGeeks",
        "topcoder.com": "TopCoder",
        "cups.online": "Cups",
        "yukicoder.me": "Yukicoder",
        "contest.yandex.ru/CYF": "Yandex",
        "codechef.com": "CodeChef",
        "luogu.com.cn": "Luogu",
        "hackerrank.com": "HackerRank",
        "my.newtonschool.co": "Newton School",
        "robocontest.uz": "Robocontest",
        "dmoj.ca": "DMOJ",
        "ucup.ac": "UniCup",
        "bestcoder.hdu.edu.cn": "BestCoder",
        "codingame.com": "Codingame",
        "codingcompetitions.withgoogle.com": "Google",
        "eolymp.com": "Eolymp",
        "kaggle.com": "Kaggle",
        "kep.uz": "KEP",
        "mycode.prepbytes.com": "PrepBytes",
        "open.kattis.com": "Kattis",
        "solved.ac": "Solved",
        "tlx.toki.id": "Toki",
        "icpc.global": "ICPC",
        "icpc.global/regionals": "ICPC Regionals",
        "binarysearch.com": "Binarysearch",
        "spoj.com": "SPOJ",
        "usaco.org": "USACO",
        "projecteuler.net": "Project Euler",
        "hackerearth.com": "HackerEarth",
        "techgig.com": "Techgig",
        "lightoj.com": "LightOJ",
        "ac.nowcoder.com": "NowCoder",
        "supecoder.dev": "Supecoder"
    };

    return resourceToPlatform[resourceId] || "Others";
}

export function getPlatformsList(){
    const platforms = [
        "codeforces.com", "codeforces.com/gyms", "leetcode.com", "toph.co", "atcoder.jp", "geeksforgeeks.org",
        "topcoder.com", "cups.online", "yukicoder.me", "contest.yandex.ru/CYF",
        "codechef.com", "luogu.com.cn", "hackerrank.com", "my.newtonschool.co",
        "robocontest.uz", "dmoj.ca", "ucup.ac", "bestcoder.hdu.edu.cn", "codingame.com",
        "codingcompetitions.withgoogle.com", "eolymp.com", "kaggle.com", "kep.uz",
        "mycode.prepbytes.com", "open.kattis.com", "solved.ac", "tlx.toki.id",
        "icpc.global", "binarysearch.com", "spoj.com", "usaco.org", "projecteuler.net",
        "hackerearth.com", "techgig.com", "ctftime.org", "supecoder.dev"
    ]
    platforms.sort((a, b)=>getPlatformFromResource(a).localeCompare(getPlatformFromResource(b)))
    return platforms
}