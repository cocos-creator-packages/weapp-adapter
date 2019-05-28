let macro = require('./macro');
const isSubContext = !wx.getOpenDataContext;

function BrowserGetter () {
    this.adaptationType = null;
    this.meta = {
        "width": "device-width"
    };
}

Object.assign(BrowserGetter.prototype, {
    init () {
        if (isSubContext) {
            this.adaptationType = macro.BROWSER_TYPE_WECHAT_GAME_SUB;
        }
        else {
            this.adaptationType = macro.BROWSER_TYPE_WECHAT_GAME;
        }
    },
});

if (isSubContext) {
    let sharedCanvas = window.sharedCanvas || wx.getSharedCanvas();
    Object.assign(BrowserGetter.prototype, {
        availWidth () {
            return sharedCanvas.width;
        },

        availHeight () {
            return sharedCanvas.height;
        }
    }); 
}
else {
    Object.assign(BrowserGetter.prototype, {
        availWidth () {
            return window.innerWidth;
        },

        availHeight () {
            return window.innerHeight;
        }
    });    
}

module.exports = new BrowserGetter();