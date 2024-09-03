const Soup = imports.gi.Soup;

const extensionUtils = imports.misc.extensionUtils;
const Self = extensionUtils.getCurrentExtension();

const readAPICredentials = Self.imports.fileio.readAPICredentials;
const convertToLocalTime = Self.imports.utils.convertToLocalTime;
const getPlatformFromResource = Self.imports.utils.getPlatformFromResource;

async function fetchTesting() {

    function getCurrentDateFormatted() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getDateAfterDays(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const currdate = getCurrentDateFormatted()
    const tendays = getDateAfterDays(10);

    const [username, api_key] = readAPICredentials();

    const API_URL = `https://clist.by/api/v4/contest/?end__gt=${currdate}&&end__lt=${tendays}&order_by=start&username=${username}&api_key=${api_key}`;

    let session = new Soup.SessionAsync();
    let message = Soup.Message.new("GET", API_URL);

    return new Promise((resolve, reject) => {
        session.queue_message(message, (session, message) => {
            if (message.status_code === 200) {
                try {
                    let responseBody = message.response_body.data;
                    let data = JSON.parse(responseBody);
                    let upcomingContests = data.objects.map(contest => {
                        return {
                            name: contest.event,
                            url: contest.href,
                            resource: contest.resource,
                            platform: getPlatformFromResource(contest.resource),
                            icon_name: "settings-icon",
                            start: convertToLocalTime(contest.start),
                            end: convertToLocalTime(contest.end),
                            duration: contest.duration, 
                            problems: contest.n_problems
                        }
                    });
                    resolve(upcomingContests);
                } catch (e) {
                    reject("Failed to parse response: " + e.message);
                }
            } else {
                reject("Failed to fetch upcoming contests: " + message.status_code);
            }
        });
    });
}

var Clist = {
    fetchTesting: fetchTesting
}