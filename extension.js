const GETTEXT_DOMAIN = 'gnome-clist';

const { St, Clutter, GObject, Gio, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const utils = Self.imports.utils;
const clist = Self.imports.clist;
const fileio = Self.imports.fileio;

const { openUrl } = utils;
const fetchTesting = clist.Clist.fetchTesting;
const timeRange = utils.formatDateTimeRange;
const formatDuration = utils.formatDuration;
const getTimeLeftLabel = utils.getTimeLeftLabel;
const getPlatformNameFromResource = utils.getPlatformNameFromResource;

const { saveAPICredentials, readAPICredentials, saveContests, readContests } = fileio;


const getIcon = (name) => {
    return new St.Icon({
        gicon: Gio.icon_new_for_string(ExtensionUtils.getCurrentExtension().path + `/assets/${name}`),
        icon_size: 16
    })
}

class ContestMenuItem extends PopupMenu.PopupBaseMenuItem {

    static {
        GObject.registerClass(this);
    }

    constructor(button, label, data, contestData) {
        super();
        this.style_class = 'contest-menu-item';
        // this.style_class = "font-weight: 700;"
        this._button = button;
        this._data = data;

        let itemLabel = new St.Label({
            text: label,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'contest-menu-item-label',
        });

        this.add_child(getIcon(contestData.platform));
        this.add_child(itemLabel);
        this.add_child(getTimeLeftLabel(contestData.start, contestData.end));
        
        this.connect('activate', () => {
            global.log(`Opening ${this._data}`);
            openUrl(this._data);

            // if (contestData.platform == codeforces){
            //     let folderPath = `~/Desktop/Programs/Contest_Based/`;
            //     GLib.spawn_command_line_async(`code ${folderPath}`);
            //     GLib.spawn_command_line_async("wmctrl -r 'code' -t $(wmctrl -d | awk '/\\*/{print $1+1}')");
            // }

            this._button.menu.close();
        });
        this.connect('enter-event', ()=>{
            this.set_style('background-color: #333;')
            this._button.updateRightMenuPane(contestData)
        });
        this.connect('leave-event', ()=>{
            this.set_style('background-color: transparent;')
        });
    }
}

class ContestMenuButton extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    constructor() {
        super(1.0, null, false);

        this.setMenu(new PopupMenu.PopupMenu(this, 1.0, St.Side.TOP));
        Main.panel.menuManager.addMenu(this.menu);

        this.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(ExtensionUtils.getCurrentExtension().path + '/assets/logo.png'),
            icon_size: 14
        }));
        this.name = 'Contests-Menu';

        if (JSON.stringify(readAPICredentials()) == `["none","none"]`) this._createInitialLayout();
        else this._createMenuLayoutNew();

    }

    _reset(){
        this.menu.removeAll()
    }

    _createInitialLayout() {
        this._reset();
        try {
            let section = new PopupMenu.PopupMenuSection({
                style_class: 'initial-page-section',
            });
            this.menu.addMenuItem(section);
    
            this.menu.ActorAlign = Clutter.ActorAlign.END;
    
            this.mainBox = new St.BoxLayout({ vertical: true, style_class: 'initial-page-layout' });
            section.actor.add_actor(this.mainBox);
    
            // Create the heading label
            let headingLabel = new St.Label({
                text: 'Gnome-Clist',
                style_class: 'initial-page-heading',
                style: 'font-weight: 900;'
            });
    
            let instructionsLabel = new St.Label({
                text: 'Please enter your clist.by credentials:',
                style_class: 'initial-page-instructions-label',
                style: 'font-size: 14px;'
            });
    
            let linkLabel = new St.Label({
                text: 'Get your credentials here',
                style_class: 'initial-page-link-label',
                style: 'cursor: pointer;',
                reactive: true,
            });
    
            // Connect linkLabel click event
            linkLabel.connect('button-press-event', () => {
                Gio.app_info_launch_default_for_uri('https://clist.by/api/v4/doc', null);
            });
    
            // Create the entries and button
            this.usernameEntry = new St.Entry({ style_class: 'text-entry', hint_text: 'Username' });
            this.apiKeyEntry = new St.Entry({ style_class: 'text-entry', hint_text: 'API Key' });

            this.errorLabel = new St.Label({ style_class: 'initial-page-error-label' });
    
            this.submitButton = new St.Button({
                label: 'Submit',
                style_class: 'credentials-submit-button',
                x_expand: true,
            });
    
            // Connect the button click event
            this.submitButton.connect('clicked', this._saveAPICredentials.bind(this));
    
            // Add children to the mainBox
            this.mainBox.add_child(headingLabel);
            // this.mainBox.add_child(subHeadingLabel);
            this.mainBox.add_child(instructionsLabel);
            this.mainBox.add_child(linkLabel);
            this.mainBox.add_child(this.usernameEntry);
            this.mainBox.add_child(this.apiKeyEntry);
            this.mainBox.add_child(this.errorLabel);
            this.mainBox.add_child(this.submitButton);
    
            // Set styles for spacing and appearance
            this.mainBox.set_style('padding: 20px;');
            this.mainBox.style = 'gap: 20px;';
    
            // Style entries and button for better spacing
            this.usernameEntry.set_style('margin-bottom: 10px;');
            this.apiKeyEntry.set_style('margin-bottom: 20px;');
    
        } catch (e) {
            this._createMenuLayoutNew();
        }
    }

    _saveAPICredentials() {
        try {
            let username = this.usernameEntry.get_text();
            let apiKey = this.apiKeyEntry.get_text();
    
            saveAPICredentials(username, apiKey);

            this._createMenuLayoutNew()
        } catch (e) {
            global.logError('Error saving API credentials:', e.message);
            // Display error message to user
            this.errorLabel.set_text(e.message);
        }
    }

    _populateLeftMenuPane() {
        fetchTesting().then(items => {

            saveContests(items);

            const ignoredPlatforms = fileio.getIgnoredPlatforms();

            items.forEach(item => {
                if (ignoredPlatforms.includes(item.resource)) return;
                let menuItem = new ContestMenuItem(this, item.name, item.url, item);
                this.leftBox.add_child(menuItem);
            });
            this.updateRightMenuPane(items[0])

        }).catch(e => {
            try {
                let contests = readContests();
                // this.rightLabel.set_text(JSON.stringify(contests))
    
                contests.forEach(item => {
                    let menuItem = new ContestMenuItem(this, item.name, item.url, item);
                    this.leftBox.add_child(menuItem);
                });
    
                this.updateRightMenuPane(contests[0])
            } catch (e){
                this.rightLabel.set_text(`Big Error : ${e.message}`)
            }
            
        })
    }

    updateRightMenuPane(data) {
        this.rightBox.remove_all_children();
        this.rightBox.add_child(new St.Label({ text: data.name, style_class: 'contest-info-name' }));
        this.rightBox.add_child(new St.Label({ text: timeRange(data.start, data.end), style_class: 'contest-info-datetime' }));
        this.rightBox.add_child(new St.Label({ text: `Duration: ${formatDuration(data.duration)}`, style_class: 'contest-info-datetime' }));
        // if (data.problems) this.rightBox.add_child(new St.Label({ text: `Problems: ${data.problems}`, style_class: 'contest-info-datetime' }));

        this.rightBox.add_child(new St.DrawingArea({ style_class: "horizontal-separator" }));
        this.queue = new St.BoxLayout({ vertical: true, style_class: 'contest-info-queue' });
        this.queueHeader = new St.BoxLayout({ vertical: false, style_class: 'contest-info-queue-header' });
        this.queueHeader.add_child(new St.Label({ text: 'QUEUE', style_class: 'contest-info-queue-header-label' }));
        this.queue.add(this.queueHeader);
        this.rightBox.add_child(this.queue);
    }

    _createMenuLayoutNew(){
        this._reset();

        let section = new PopupMenu.PopupMenuSection({
            style_class: 'contest-menu-layout',
        });
        this.menu.addMenuItem(section);

        this.menu.ActorAlign = Clutter.ActorAlign.END

        this.mainBox = new St.BoxLayout({ vertical: true });
        section.actor.add_child(this.mainBox);

        this.navigation = new St.BoxLayout({ vertical: false, style_class: 'navigation', style: "min-width:600px; max-width: 700px" });
        this.mainBox.add(this.navigation);

        this.navigation.add_child(new St.Label({ text: 'Gnome-Clist', style_class: 'nav-header-name' }));

        this.navButtons = new St.BoxLayout({ vertical: false, style_class: 'nav-buttons' });
        this.navigation.add(this.navButtons);

        this.ranksButton = new St.Button({
            style_class: 'settings-button',
            x_expand: false,
        });
        this.ranksButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string('system-list-symbolic'),
            style_class: 'settings-icon',
            icon_size: 16
        }))
        this.ranksButton.connect('clicked', this._createSettingsLayout.bind(this));

        this.settingsButton = new St.Button({
            style_class: 'settings-button',
            x_expand: false,
        });
        this.settingsButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string('preferences-other-symbolic'),
            style_class: 'settings-icon',
            icon_size: 16
        }))
        // this.settingsButton.connect('clicked', this._createSettingsLayout.bind(this));
        this.settingsButton.connect('clicked', () => {
            this._createSettingsLayout();
        });

        this.refreshButton = new St.Button({
            style_class: 'settings-button',
            x_expand: false,
        });
        this.refreshButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string('view-refresh-symbolic'),
            style_class: 'settings-icon',
            icon_size: 16
        }))
        this.refreshButton.connect('clicked', ()=>{
            this._createMenuLayoutNew();
        });

        this.navButtons.add_child(this.ranksButton);
        this.navButtons.add_child(this.refreshButton);
        this.navButtons.add_child(this.settingsButton);
        
        this.contestMenu = new St.BoxLayout({ vertical: false, style_class: 'contest-menu-layout' });
        this.leftBox = new St.BoxLayout({ vertical: true, style_class: 'left-contest-menu-box' });
        let separator = new St.DrawingArea({ style_class: 'vertical-separator' });
        this.rightBox = new St.BoxLayout({ vertical: true, style_class: 'right-contest-menu-box' });
        
        this.rightLabel = new St.Label({ text: "Fetching ...." });
        
        this.leftScroll = new St.ScrollView({
            style_class: 'vfade',
            y_expand: true, x_expand: false
        })

        this.leftScroll.add_actor(this.leftBox);
        this.leftScroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);

        this.contestMenu.add_actor(this.leftScroll);
        this.contestMenu.add_child(separator);
        this.contestMenu.add(this.rightBox);
        this.mainBox.add(this.contestMenu);
        
        this.rightBox.add_child(this.rightLabel);

        this._populateLeftMenuPane();
    }

    _createSettingsLayout() {
        this._reset();
    
        let section = new PopupMenu.PopupMenuSection({
            style_class: 'settings-layout',
        });
        this.menu.addMenuItem(section);
    
        // Main layout with consistent width
        this.mainBox = new St.BoxLayout({ 
            vertical: true, 
            style_class: 'settings-main-box',
        });
        section.actor.add_child(this.mainBox);
    
        // Navigation with black background
        this.navigation = new St.BoxLayout({ 
            vertical: false, 
            style_class: 'navigation', 
            style: 'background-color: #000;'
        });
        this.mainBox.add(this.navigation);
    
        this.navigation.add_child(new St.Label({ 
            text: 'Settings', 
            style_class: 'nav-header-name'
        }));
    
        this.navButtons = new St.BoxLayout({ 
            vertical: false, 
            style_class: 'nav-buttons' 
        });
        this.navigation.add(this.navButtons);
    
        // ERROR LABEL
        this.errorLabel = new St.Label({ 
            text: "ERROR LABEL", 
            style_class: 'initial-page-error-label'
        });
        this.mainBox.add(this.errorLabel);
        // ERROR LABEL
    
        this.backButton = new St.Button({
            style_class: 'settings-button',
        });
        this.backButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string('go-previous-symbolic'),
            style_class: 'settings-icon'
        }));
        this.backButton.connect('clicked', this._createMenuLayoutNew.bind(this));
    
        this.navButtons.add_child(this.backButton);
    
        // Settings content with dark background
        let scrollView = new St.ScrollView({
            style_class: 'settings-scrollview vfade',
            x_expand: false,
            y_expand: true,
        });
        scrollView.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);
    
        this.settingsContent = new St.BoxLayout({ 
            vertical: true, 
            style_class: 'settings-content'
        });
        scrollView.add_actor(this.settingsContent);
        this.mainBox.add(scrollView);
    
        let platformsLabel = new St.Label({ 
            text: 'IGNORE PLATFORMS', 
            style_class: 'settings-label'
        });
        this.settingsContent.add(platformsLabel);
    
        const platforms = [
            "codeforces.com", "leetcode.com", "toph.co", "atcoder.jp", "geeksforgeeks.org",
            "topcoder.com", "cups.online", "yukicoder.me", "contest.yandex.ru/CYF",
            "codechef.com", "luogu.com.cn", "hackerrank.com", "my.newtonschool.co",
            "robocontest.uz", "dmoj.ca", "ucup.ac", "bestcoder.hdu.edu.cn", "codingame.com",
            "codingcompetitions.withgoogle.com", "eolymp.com", "kaggle.com", "kep.uz",
            "mycode.prepbytes.com", "open.kattis.com", "solved.ac", "tlx.toki.id",
            "icpc.global", "binarysearch.com", "spoj.com", "usaco.org", "projecteuler.net",
            "hackerearth.com", "techgig.com", "ctftime.org"
        ];       
    
        this.platformToggles = {};
        
        // Container for platform rows
        let rowBox = new St.BoxLayout({
            vertical: false,
            style_class: 'platform-row-box',
        });
    
        platforms.forEach((platform, index) => {
            let toggleBox = new St.BoxLayout({
                style_class: 'platform-toggle-box'
            });
    
            let label = new St.Label({
                text: getPlatformNameFromResource(platform),
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'platform-label'
            });
    
            // Use St.Button to create a toggle-like button
            let toggleButton = new St.Button({
                style_class: 'platform-toggle-inactive',
                reactive: true,
                can_focus: true
            });
    
            // Update button label based on state
            toggleButton.updateLabel = (state) => {
                toggleButton.style_class = state ? 'platform-toggle-button platform-toggle-active' : 'platform-toggle-button platform-toggle-inactive';
                toggleButton.set_child(new St.Label({
                    text: state ? 'ON' : 'OFF',
                    style: 'color: #fff;'
                }));
            };
    
            toggleButton.connect('clicked', () => {
                let currentState = !toggleButton.state;
                toggleButton.state = currentState;
                if (currentState){
                    toggleButton.style_class = 'platform-toggle-button platform-toggle-active';
                } else {
                    toggleButton.style_class = 'platform-toggle-button platform-toggle inactive';
                }
                this.errorLabel.set_text(`Toggled ${platform}: ${currentState}`);
                fileio.updateIgnoredPlatforms(platform, !currentState);
                toggleButton.updateLabel(currentState);
            });
    
            toggleBox.add(label);
            toggleBox.add(toggleButton);
    
            this.platformToggles[platform] = toggleButton;
            
            // Add the toggleBox to the row
            rowBox.add(toggleBox);
    
            // If we've added 3 items, add the rowBox to the settingsContent and create a new rowBox
            if ((index + 1) % 3 === 0 || index === platforms.length - 1) {
                this.settingsContent.add(rowBox);
                rowBox = new St.BoxLayout({
                    vertical: false,
                    style_class: 'platform-row-box',
                });
            }
            
            // Load saved state
            let ignoredPlatforms = fileio.getIgnoredPlatforms();
            toggleButton.state = !ignoredPlatforms.includes(platform);
            toggleButton.updateLabel(toggleButton.state);
        });
    }
    

    // _createSettingsLayout(){

    // }

}

// ==========================================================================================

let contestMenuButton;
let metadata;

function init(meta) {
    metadata = meta;
    // Initialization code here ...
}

function enable() {
    contestMenuButton = new ContestMenuButton();
    Main.panel.addToStatusArea(metadata._uuid, contestMenuButton);
}

function disable() {

    if (contestMenuButton) {
        Main.panel.menuManager.removeMenu(contestMenuButton.menu);
        contestMenuButton.destroy();
        contestMenuButton = null;
    }
}
