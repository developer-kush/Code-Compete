import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

export var DynamicTimerLabel = GObject.registerClass(
class DynamicTimerLabel extends St.Bin {
    
    _init(startTime, endTime) {
        super._init();
        this._label = new St.Label({ text: '...' , style_class: 'contest-time-left'});
        this.set_child(this._label);
        this._startTime = new Date(startTime);
        this._endTime = new Date(endTime);
        this._timeoutId = null;
        this._update();
    }

    _update() {
        const now = new Date();
        let dueStartStyle = 'background-color: #007768; color: white; padding: 2px; border-radius: 3px; font-size: 12px;';
        let dueEndStyle = 'background-color: #993333; color: white; padding: 2px; border-radius: 3px; font-size: 12px;';
        let endedStyle = 'background-color: grey; opacity: 0.6; padding: 2px; border-radius: 3px; font-size: 8px;';

        let targetTime, prefix;
        if (now < this._startTime) {
            targetTime = this._startTime;
            prefix = '';
        } else if (now < this._endTime) {
            targetTime = this._endTime;
            prefix = '';
        } else {
            this._label.text = 'Over';
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
            }
            return;
        }

        if (now < this._startTime){
            this._label.style = dueStartStyle;
        } else if (now < this._endTime){
            this._label.style = dueEndStyle;
        } else {
            this._label.style = endedStyle;
        }

        const diff = targetTime - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timeString;
        let nextUpdateInterval;

        if (days > 0) {
            timeString = `${days}d`;
            nextUpdateInterval = this._getMillisecondsUntilNextDay(now);
        } else if (hours > 0) {
            timeString = `${hours}h`;
            nextUpdateInterval = this._getMillisecondsUntilNextHour(now);
        } else if (minutes > 0){
            timeString = `${minutes}m`;
            nextUpdateInterval = this._getMillisecondsUntilNextMinute(now);
        } else {
            timeString = `${seconds}s`;
            nextUpdateInterval = 1000;
        }

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
        }

        if (seconds > 0){
            this._label.text = prefix + timeString;
            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_LOW, nextUpdateInterval, () => {
                this._update();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _getMillisecondsUntilNextDay(now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow - now;
    }

    _getMillisecondsUntilNextHour(now) {
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour - now;
    }

    _getMillisecondsUntilNextMinute(now) {
        const nextMinute = new Date(now);
        nextMinute.setSeconds(0, 0);
        nextMinute.setMinutes(nextMinute.getMinutes() + 1);
        return nextMinute - now;
    }
    

    destroy() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        super.destroy();
    }
});