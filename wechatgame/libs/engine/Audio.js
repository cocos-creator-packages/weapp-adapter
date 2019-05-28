const Audio = cc.Audio;

if (Audio) {
    Object.assign(Audio.prototype, {
        _onLoaded () {
            let elem = this._src._nativeAsset;
            // Reuse dom audio element
            if (!this._element) {
                this._element = wx.createInnerAudioContext();
            }
            this._element.src = elem.src;
    
            this.setVolume(this._volume);
            this.setLoop(this._loop);
            if (this._nextTime !== 0) {
                this.setCurrentTime(this._nextTime);
            }
            if (this._state === Audio.State.PLAYING) {
                this.play();
            }
            else {
                this._state = Audio.State.INITIALZING;
            }
        },

        play () {
            // marked as playing so it will playOnLoad
            this._state = Audio.State.PLAYING;
    
            if (!this._element) {
                return;
            }
    
            this._bindEnded();
            this._element.play();
        },

        destroy () {
            if (this._element) {
                this._element.destroy();
                this._element = null;
            }
        },

        setCurrentTime (num) {
            // TODO: To ensure innerAudioContext loaded
            if (this._element) {
                this._nextTime = 0;
            }
            else {
                this._nextTime = num;
                return;
            }

            this._element.seek(num);
        },

        getState () {
            return this._state;
        },
    });
}