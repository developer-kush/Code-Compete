const { Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const DATA_FILENAME = '/data.json';

const DEFAULT_SCHEMA = {
    credentials: {},
    contests: [],
    ignoredPlatforms: []
};

function saveToFile(filename, data) {
    let file = Gio.File.new_for_path(Self.path + filename);
    let [, etag] = file.replace_contents(
        JSON.stringify(data),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
    );
}

function readFromFile(filename) {
    let file = Gio.File.new_for_path(Self.path + filename);
    if (!file.query_exists(null)) return null;

    let [success, contents] = file.load_contents(null);
    if (!success) return null;

    try {
        return JSON.parse(contents);
    } catch (e) {
        return null;
    }
}

function saveData(data) {
    saveToFile(DATA_FILENAME, data);
}

function readData() {
    let data = readFromFile(DATA_FILENAME);
    return data ? Object.assign({}, DEFAULT_SCHEMA, data) : DEFAULT_SCHEMA;
}

function saveAPICredentials(username, apiKey) {
    if (username && apiKey) {
        let data = readData();
        data.credentials = { username, apiKey };
        saveData(data);
    }
}

function readAPICredentials() {
    let data = readData();
    let creds = data.credentials;
    return [creds.username || 'none', creds.apiKey || 'none'];
}

function saveContests(contests) {
    let data = readData();
    data.contests = contests;
    saveData(data);
}

function readContests() {
    let data = readData();
    return data.contests;
}

function getIgnoredPlatforms() {
    let data = readData();
    return data.ignoredPlatforms || [];
}

function updateIgnoredPlatforms(platform, isIgnored) {
    let data = readData();
    let ignoredPlatforms = data.ignoredPlatforms || [];

    if (isIgnored && !ignoredPlatforms.includes(platform)) {
        ignoredPlatforms.push(platform);
    } else if (!isIgnored) {
        ignoredPlatforms = ignoredPlatforms.filter(p => p !== platform);
    }

    data.ignoredPlatforms = ignoredPlatforms;
    saveData(data);
}

function clearAllData() {
    saveData(DEFAULT_SCHEMA);
}

var fileio = {
    saveAPICredentials,
    readAPICredentials,
    saveContests,
    readContests,
    clearAllData,
    getIgnoredPlatforms,
    updateIgnoredPlatforms
};