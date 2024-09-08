import Soup from 'gi://Soup?version=3.0';
import GLib from 'gi://GLib';

import { readAPICredentials } from './fileio.js';
import { getPlatformFromResource, convertToLocalTime } from './utils.js';

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

export async function fetchTesting() {
    
    try {
        const currdate = getCurrentDateFormatted();
        const tendays = getDateAfterDays(10);

        const [username, api_key] = readAPICredentials();

        const API_URL = `https://clist.by/api/v4/contest/?end__gt=${currdate}&&end__lt=${tendays}&order_by=start&username=${username}&api_key=${api_key}`;

        const session = new Soup.Session();
        const message = Soup.Message.new('GET', API_URL);

        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        
        const status = message.get_status();

        if (status === Soup.Status.OK) {
            const decoder = new TextDecoder('utf-8');
            const responseBody = decoder.decode(bytes.get_data());

            let data;
            try {
                data = JSON.parse(responseBody);
            } catch (parseError) {
                const errorMessage = 'Failed to parse response as JSON';
                throw new Error(errorMessage);
            }

            const upcomingContests = data.objects.map(contest => {
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
                };
            });
            
            return upcomingContests;
        }
    } catch (e) {
        console.log('Error Occured during fetching contests :' + e)
    }
}

export const Clist = {
    fetchTesting
};