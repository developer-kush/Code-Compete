const GETTEXT_DOMAIN = 'code-compete';

import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { DynamicTimerLabel } from './components.js';
import { openUrl, getPlatformsList, formatDateTimeRange, getTimeLeftLabel, formatDuration, getPlatformNameFromResource } from './utils.js';
import { fetchTesting } from './clist.js';
import { saveAPICredentials, readAPICredentials, saveContests, readContests, getIgnoredPlatforms, updateIgnoredPlatforms } from './fileio.js';

export const getIcon = (name) => {
    return new St.Icon({
        gicon: Gio.icon_new_for_string(global.codeCompetePath + `/assets/${name}`),
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
        this._timerLabel = new DynamicTimerLabel(contestData.start, contestData.end);
        this.add_child(this._timerLabel)
        // this.add_child(getTimeLeftLabel(contestData.start, contestData.end));
        
        this.activationConnection = this.connect('activate', () => {
            openUrl(this._data);

            // if (contestData.platform == codeforces){
            //     let folderPath = `~/Desktop/Programs/Contest_Based/`;
            //     GLib.spawn_command_line_async(`code ${folderPath}`);
            //     GLib.spawn_command_line_async("wmctrl -r 'code' -t $(wmctrl -d | awk '/\\*/{print $1+1}')");
            // }

            this._button.menu.close();
        });
        this.EnterConnection = this.connect('enter-event', ()=>{
            this.set_style('background-color: #333;')
            this._button.updateRightMenuPane(contestData)
        });
        this.LeaveConnection = this.connect('leave-event', ()=>{
            this.set_style('background-color: transparent;')
        });
    }

    destroy() {
        if (this.activationConnection) this.disconnect(this.activationConnection)
        if (this.EnterConnection) this.disconnect(this.EnterConnection)
        if (this.LeaveConnection) this.disconnect(this.LeaveConnection)

        this.activationConnection = null;
        this.EnterConnection = null;
        this.LeaveConnection = null;

        if (this._timerLabel) {
            this._timerLabel.destroy();
            this._timerLabel = null;
        }
        super.destroy();
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
            gicon: Gio.icon_new_for_string(global.codeCompetePath + '/assets/logo.png'),
            icon_size: 14
        }));
        this.name = 'Contests-Menu';

        if (JSON.stringify(readAPICredentials()) == `["none","none"]`) this._createInitialLayout();
        else this._createMenuLayout();

    }

    _reset() {
        if (this.linkLabelConnection) this.linkLabel.disconnect(this.linkLabelConnection)
        if (this.submitButtonConnection) this.submitButton.disconnect(this.submitButtonConnection)
        if (this.settingsButtonConnection) this.settingsButton.disconnect(this.settingsButtonConnection)
        if (this.refreshButtonConnection) this.refreshButton.disconnect(this.refreshButtonConnection)
        if (this.backButtonConnection) this.backButton.disconnect(this.backButtonConnection)
        if (this.toggleButtons){
            this.toggleButtons.forEach(([button, connection]) => {
                if (connection) button.disconnect(connection);
            });
            this.toggleButtons.clear()
            this.toggleButtons = null;
        }

        this.linkLabelConnection = null
        this.submitButtonConnection = null
        this.settingsButtonConnection = null
        this.refreshButtonConnection = null
        this.backButtonConnection = null

        this.menu._getMenuItems().forEach(item => {
            if (item instanceof ContestMenuItem) {
                item.destroy();
            }
        });

        this.menu.removeAll();

        if (this.leftBox) {
            this.leftBox.destroy_all_children();
        }
        if (this.rightBox) {
            this.rightBox.destroy_all_children();
        }

        this.leftBox = null;
        this.rightBox = null;
        this.leftScroll = null;
        this.contestMenu = null;
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
            section.actor.add_child(this.mainBox);
    
            // Create the heading label
            this.headingLabel = new St.Label({
                text: 'Code Compete',
                style_class: 'initial-page-heading',
                style: 'font-weight: 900;'
            });
    
            this.instructionsLabel = new St.Label({
                text: 'Please enter your clist.by credentials:',
                style_class: 'initial-page-instructions-label',
                style: 'font-size: 14px;'
            });
    
            this.linkLabel = new St.Label({
                text: 'Get your credentials here',
                style_class: 'initial-page-link-label',
                style: 'cursor: pointer;',
                reactive: true,
            });
    
            // Connect linkLabel click event
            this.linkLabelConnection = this.linkLabel.connect('button-press-event', () => {
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
            this.submitButtonConnection = this.submitButton.connect('clicked', this._saveAPICredentials.bind(this));
    
            // Add children to the mainBox
            this.mainBox.add_child(this.headingLabel);
            // this.mainBox.add_child(subHeadingLabel);
            this.mainBox.add_child(this.instructionsLabel);
            this.mainBox.add_child(this.linkLabel);
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
            this._createMenuLayout();
        }
    }

    _saveAPICredentials() {
        try {
            let username = this.usernameEntry.get_text();
            let apiKey = this.apiKeyEntry.get_text();
    
            saveAPICredentials(username, apiKey);

            this._createMenuLayout()
        } catch (e) {
            this.errorLabel.set_text(e.message);
        }
    }

    _populateLeftMenuPane() {
        fetchTesting().then(items => {
            saveContests(items);
            const ignoredPlatforms = getIgnoredPlatforms();
            
            items.forEach(item => {
                // this.errorLabel.set_text(item.name)
                if (ignoredPlatforms.includes(item.resource)) return;
                let menuItem = new ContestMenuItem(this, item.name, item.url, item);
                this.leftBox.add_child(menuItem);
            });

            this.updateRightMenuPane(items[0])

        }).catch(e => {
            try {
                let contests = readContests();
    
                contests.forEach(item => {
                    let menuItem = new ContestMenuItem(this, item.name, item.url, item);
                    this.leftBox.add_child(menuItem);
                });
    
                this.updateRightMenuPane(contests[0])

            } catch (e){
                this.rightLabel.set_text("Something went Wrong ...")
            }
        })
    }

    updateRightMenuPane(data) {
        this.rightBox.remove_all_children();
        this.rightBox.add_child(new St.Label({ text: getPlatformNameFromResource(data.resource), style_class: 'contest-info-datetime' }));
        this.rightBox.add_child(new St.Label({ text: data.name, style_class: 'contest-info-name' }));
        this.rightBox.add_child(new St.Label({ text: formatDateTimeRange(data.start, data.end), style_class: 'contest-info-datetime' }));
        this.rightBox.add_child(new St.Label({ text: `Duration: ${formatDuration(data.duration)}`, style_class: 'contest-info-datetime' }));
        // if (data.problems) this.rightBox.add_child(new St.Label({ text: `Problems: ${data.problems}`, style_class: 'contest-info-datetime' }));

        this.rightBox.add_child(new St.DrawingArea({ style_class: "horizontal-separator" }));
        this.queue = new St.BoxLayout({ vertical: true, style_class: 'contest-info-queue' });
        this.queueHeader = new St.BoxLayout({ vertical: false, style_class: 'contest-info-queue-header' });
        this.queueHeader.add_child(new St.Label({ text: '', style_class: 'contest-info-queue-header-label' }));
        this.queue.add_child(this.queueHeader);
        this.rightBox.add_child(this.queue);
    }

    _createMenuLayout(){
        this._reset();

        let section = new PopupMenu.PopupMenuSection({
            style_class: 'contest-menu-layout',
        });
        this.menu.addMenuItem(section);

        this.menu.ActorAlign = Clutter.ActorAlign.END

        this.mainBox = new St.BoxLayout({ vertical: true });
        section.actor.add_child(this.mainBox);

        this.navigation = new St.BoxLayout({ vertical: false, style_class: 'navigation', style: "min-width:600px; max-width: 700px" });
        this.mainBox.add_child(this.navigation);

        this.navigation.add_child(new St.Label({ text: 'Code Compete', style_class: 'nav-header-name' }));

        this.navButtons = new St.BoxLayout({ vertical: false, style_class: 'nav-buttons' });
        this.navigation.add_child(this.navButtons);

        this.settingsButton = new St.Button({
            style_class: 'settings-button',
            x_expand: false,
        });
        this.settingsButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string('preferences-other-symbolic'),
            style_class: 'settings-icon',
            icon_size: 16
        }))
        
        this.settingsButtonConnection = this.settingsButton.connect('clicked', () => {
            this._createSettingsLayout();
        });

        this.refreshButton = new St.Button({
            style_class: 'settings-button',
            style: 'margin-left: 50px',
            x_expand: false,
        });
        this.refreshButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string('view-refresh-symbolic'),
            style_class: 'settings-icon',
            icon_size: 16
        }))
        this.refreshButtonConnection = this.refreshButton.connect('clicked', ()=>{
            this._createMenuLayout();
        });

        // this.navButtons.add_child(this.ranksButton);
        this.navButtons.add_child(this.refreshButton);
        this.navButtons.add_child(this.settingsButton);

        // -----------------
        // this.errorLabel = new St.Label({text:""})
        // this.mainBox.add_child(this.errorLabel)
        // ------------------
        
        this.contestMenu = new St.BoxLayout({ vertical: false, style_class: 'contest-menu-layout' });
        this.leftBox = new St.BoxLayout({ vertical: true, style_class: 'left-contest-menu-box' });
        let separator = new St.DrawingArea({ style_class: 'vertical-separator' });
        this.rightBox = new St.BoxLayout({ vertical: true, style_class: 'right-contest-menu-box' });
        
        this.rightLabel = new St.Label({ text: "Fetching ...." });
        
        this.leftScroll = new St.ScrollView({
            style_class: 'vfade',
            y_expand: true, x_expand: false
        })

        this.leftScroll.add_child(this.leftBox);
        this.leftScroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);

        this.contestMenu.add_child(this.leftScroll);
        this.contestMenu.add_child(separator);
        this.contestMenu.add_child(this.rightBox);
        this.mainBox.add_child(this.contestMenu);
        
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
        this.mainBox.add_child(this.navigation);
    
        this.navigation.add_child(new St.Label({ 
            text: 'Settings', 
            style_class: 'nav-header-name'
        }));
    
        this.navButtons = new St.BoxLayout({ 
            vertical: false, 
            style_class: 'nav-buttons' 
        });
        this.navigation.add_child(this.navButtons);
    
        // ERROR LABEL
        // this.errorLabel = new St.Label({ 
        //     text: "ERROR LABEL", 
        //     style_class: 'initial-page-error-label'
        // });
        // this.mainBox.add(this.errorLabel);
        // ERROR LABEL
    
        this.backButton = new St.Button({
            style: 'margin-left: 150px',
            style_class: 'settings-button',
        });
        this.backButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string('go-previous-symbolic'),
            style_class: 'settings-icon'
        }));

        this.backButtonConnection = this.backButton.connect('clicked', this._createMenuLayout.bind(this));
    
        this.navButtons.add_child(this.backButton);
    
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
        scrollView.add_child(this.settingsContent);
        this.mainBox.add_child(scrollView);
    
        let platformsLabel = new St.Label({ 
            text: 'IGNORE PLATFORMS', 
            style_class: 'settings-label'
        });
        this.settingsContent.add_child(platformsLabel);
    
        const platforms = getPlatformsList();       
    
        this.platformToggles = {};
        
        let rowBox = new St.BoxLayout({
            vertical: false,
            style_class: 'platform-row-box',
        });

        this.toggleButtons = [];
    
        platforms.forEach((platform, index) => {
            let toggleBox = new St.BoxLayout({
                style_class: 'platform-toggle-box'
            });
    
            let label = new St.Label({
                text: getPlatformNameFromResource(platform),
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'platform-label'
            });
    
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
    
            let toggleButtonConnection = toggleButton.connect('clicked', () => {
                let currentState = !toggleButton.state;
                toggleButton.state = currentState;
                if (currentState){
                    toggleButton.style_class = 'platform-toggle-button platform-toggle-active';
                } else {
                    toggleButton.style_class = 'platform-toggle-button platform-toggle inactive';
                }
                // this.errorLabel.set_text(`Toggled ${platform}: ${currentState}`);
                updateIgnoredPlatforms(platform, !currentState);
                toggleButton.updateLabel(currentState);
            });
    
            toggleBox.add_child(label);
            toggleBox.add_child(toggleButton);
    
            this.platformToggles[platform] = toggleButton;
            rowBox.add_child(toggleBox);
    
            // If we've added 3 items, add the rowBox to the settingsContent and create a new rowBox
            if ((index + 1) % 3 === 0 || index === platforms.length - 1) {
                this.settingsContent.add_child(rowBox);
                rowBox = new St.BoxLayout({
                    vertical: false,
                    style_class: 'platform-row-box',
                });
            }

            this.toggleButtons.push([toggleButton, toggleButtonConnection])
            
            // Load saved state
            let ignoredPlatforms = getIgnoredPlatforms();
            toggleButton.state = !ignoredPlatforms.includes(platform);
            toggleButton.updateLabel(toggleButton.state);
        });
    }

    destroy(){
        this._reset();
        this.menu._getMenuItems().forEach(item => {
            if (item instanceof ContestMenuItem) {
                item.destroy();
            }
        });
        super.destroy();
    }
}

// ==========================================================================================

export default class CodeCompeteExtension extends Extension {
    enable() {
        global.codeCompetePath = this.path;
        this.contestMenuButton = new ContestMenuButton();
        Main.panel.addToStatusArea(this.uuid, this.contestMenuButton);
    }

    disable() {
        global.codeCompetePath = null;
        Main.panel.menuManager.removeMenu(this.contestMenuButton.menu);
        this.contestMenuButton.destroy();
        this.contestMenuButton = null;
    }
}