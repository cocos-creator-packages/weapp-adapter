require('libs/weapp-adapter/index');
require('./libs/engine/globalAdapter/index');
var Parser = require('libs/xmldom/dom-parser');
window.DOMParser = Parser.DOMParser;
require('src/settings');
require('main');

// Will be replaced with cocos2d-js path in editor
require('cocos2d-js-path');

require('./libs/engine/index.js');

// Adjust devicePixelRatio
cc.view._maxPixelRatio = 3;

window.REMOTE_SERVER_ROOT = "";
window.SUBCONTEXT_ROOT = "";

if (cc.sys.browserType === cc.sys.BROWSER_TYPE_WECHAT_GAME_SUB) {
    var _WECHAT_SUBDOMAIN_DATA = require('src/subdomain.json.js');
    cc.game.once(cc.game.EVENT_ENGINE_INITED, function () {
        cc.Pipeline.Downloader.PackDownloader._doPreload("WECHAT_SUBDOMAIN", _WECHAT_SUBDOMAIN_DATA);
    });

    require('./libs/sub-context-adapter');
}
else {
    // Release Image objects after uploaded gl texture
    cc.macro.CLEANUP_IMAGE_CACHE = true;
}
window.boot();