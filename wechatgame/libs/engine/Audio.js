const Audio = cc.Audio;

if (Audio) {
    Object.assign(Audio.prototype, {
        _createElement () {
            let elem = this._src._nativeAsset;
            // Reuse dom audio element
            if (!this._element) {
                this._element = wx.createInnerAudioContext();
            }
            this._element.src = elem.src;
        },

        destroy () {
            if (this._element) {
                this._element.destroy();
                this._element = null;
            }
        },

        setCurrentTime (num) {
            if (!this._element) {
                this._nextTime = num;
                return;
            }
            this._nextTime = 0;
            this._element.seek(num);
        },

        stop () {
            if (!this._element) return;
            this._element.stop();
            this._element.currentTime = 0;
            this._unbindEnded();
            this.emit('stop');
            this._state = cc.Audio.State.STOPPED;
        },
        
        // adapt some special operations on web platform
        _touchToPlay () { },
        _forceUpdatingState () { },
    });
}