
const inputManager = _cc.inputManager;
let isInit = false;

Object.assign(inputManager, {
    setAccelerometerEnabled (isEnable) {
        let scheduler = cc.director.getScheduler();
        scheduler.enableForTarget(this);
        if (isEnable) {
            this._registerAccelerometerEvent();
            scheduler.scheduleUpdate(this);
        }
        else {
            this._unregisterAccelerometerEvent();
            scheduler.unscheduleUpdate(this);
        }
    },

    // No need to adapt
    // setAccelerometerInterval (interval) {  },

    _registerAccelerometerEvent () {
        this._accelCurTime = 0;   
        if (!isInit) {
            isInit = true;
            let self = this;
            this._acceleration = new cc.Acceleration();

            wx.onAccelerometerChange && wx.onAccelerometerChange(function (res) {
                let resCpy = {};
                resCpy.x = res.x;
                resCpy.y = res.y;
                resCpy.z = res.z;
            
                let systemInfo = wx.getSystemInfoSync();
                let windowWidth = systemInfo.windowWidth;
                let windowHeight = systemInfo.windowHeight;
                if (windowHeight < windowWidth) {
                    // Landscape orientation

                    // For left landscape
                    // resCpy.x = resCpy.y;
                    // resCpy.y = -resCpy.x;

                    // For right landscape
                    // resCpy.x = -resCpy.y;
                    // resCpy.y = resCpy.x;

                    // We suggest to use right landscape by default
                    let tmp = resCpy.x;
                    resCpy.x = -resCpy.y;
                    resCpy.y = tmp;
                }
                
                self._acceleration.x = resCpy.x;
                self._acceleration.y = resCpy.y;
                self._acceleration.z = resCpy.z;
            });
        }
        else {
            wx.startAccelerometer && wx.startAccelerometer({
                fail: function (err) {
                    cc.error('register Accelerometer failed ! err: ' + err);
                },
                success: function () {},
                complete: function () {},
            });
        }
    },

    _unregisterAccelerometerEvent () {
        this._accelCurTime = 0;  
        wx.stopAccelerometer && wx.stopAccelerometer({
            fail: function (err) {
                cc.error('unregister Accelerometer failed ! err: ' + err);
            },
            success: function () {},
            complete: function () {},
        });
    },
});
