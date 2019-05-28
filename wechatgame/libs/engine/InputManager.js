const inputManager = _cc.inputManager;

Object.assign(inputManager, {
    getHTMLElementPosition () {
        return {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight
        };
    },

    getPointByEvent (event, pos) {
        if (event.pageX != null)  //not avalable in <= IE8
            return {x: event.pageX, y: event.pageY};

        pos.left = 0;
        pos.top = 0;

        return {x: event.clientX, y: event.clientY};
    },

    registerSystemEvent (element) {
        if(this._isRegisterEvent) return;

        this._glView = cc.view;
        let self = this;

        //register touch event
        let _touchEventsMap;
        let registerTouchEvent;
        if (cc.sys.browserType === cc.sys.BROWSER_TYPE_WECHAT_GAME_SUB) {
            _touchEventsMap = {
                onTouchStart: function (touchesToHandle) {
                    self.handleTouchesBegin(touchesToHandle);
                },
                onTouchMove: function (touchesToHandle) {
                    self.handleTouchesMove(touchesToHandle);
                },
                onTouchEnd: function (touchesToHandle) {
                    self.handleTouchesEnd(touchesToHandle);
                },
                onTouchCancel: function (touchesToHandle) {
                    self.handleTouchesCancel(touchesToHandle);
                }
            };
            registerTouchEvent = function(eventName) {
                let handler = _touchEventsMap[eventName];
                wx[eventName](function(event) {
                    if (!event.changedTouches) return;
                    let pos = self.getHTMLElementPosition(element);
                    let body = document.body;
                    pos.left -= body.scrollLeft || 0;
                    pos.top -= body.scrollTop || 0;
                    handler(self.getTouchesByEvent(event, pos));
                });
            };
        }
        else {
            _touchEventsMap = {
                "touchstart": function (touchesToHandle) {
                    self.handleTouchesBegin(touchesToHandle);
                },
                "touchmove": function (touchesToHandle) {
                    self.handleTouchesMove(touchesToHandle);
                },
                "touchend": function (touchesToHandle) {
                    self.handleTouchesEnd(touchesToHandle);
                },
                "touchcancel": function (touchesToHandle) {
                    self.handleTouchesCancel(touchesToHandle);
                }
            };
            registerTouchEvent = function(eventName) {
                let handler = _touchEventsMap[eventName];
                element.addEventListener(eventName, (function(event) {
                    if (!event.changedTouches) return;
                    let pos = self.getHTMLElementPosition(element);
                    let body = document.body;
                    pos.left -= body.scrollLeft || 0;
                    pos.top -= body.scrollTop || 0;
                    handler(self.getTouchesByEvent(event, pos));
                    event.stopPropagation();
                    event.preventDefault();
                }), false);
            };
        }
        for (let eventName in _touchEventsMap) {
            registerTouchEvent(eventName);
        }

        if (cc.sys.browserType !== cc.sys.BROWSER_TYPE_WECHAT_GAME_SUB) {
            //register keyboard event
            this._registerKeyboardEvent();
        }

        this._isRegisterEvent = true;
    },
});