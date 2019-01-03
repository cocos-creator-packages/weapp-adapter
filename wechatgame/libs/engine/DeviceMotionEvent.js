
function DeviceMotionEvent() {
    this.type = 'devicemotion';
    this.accelerationIncludingGravity = null;
}


var registerFunc = _cc.inputManager._registerAccelerometerEvent.bind(_cc.inputManager);

_cc.inputManager._registerAccelerometerEvent = function () {
    // register engine AccelerationEventListener to get acceleration data from wx
    registerFunc();
    wx.startAccelerometer && wx.startAccelerometer({
        fail: function (err) {
            cc.error('register Accelerometer failed ! err: ' + err);
        },
        success: function () {},
        complete: function () {},
    });
};

wx.onAccelerometerChange && wx.onAccelerometerChange(function (res) {
    var deviceMotionEvent = new DeviceMotionEvent();
    var resCpy = {};
    resCpy.x = res.x;
    resCpy.y = res.y;
    resCpy.z = res.z;

    var gravityFactor = 10;
    var systemInfo = wx.getSystemInfoSync();
    var windowWidth = systemInfo.windowWidth;
    var windowHeight = systemInfo.windowHeight;
    if (windowHeight < windowWidth) {
        // landscape view
        var tmp = resCpy.x;
        resCpy.x = resCpy.y;
        resCpy.y = tmp;

        resCpy.x *= gravityFactor;
        resCpy.y *= -gravityFactor;

        // TODO adjust x y axis when the view flips upside down
    }
    else {
        // portrait view
        resCpy.x *= -gravityFactor;
        resCpy.y *= -gravityFactor;
    }
    deviceMotionEvent.accelerationIncludingGravity = resCpy;

    document.dispatchEvent(deviceMotionEvent);
});

var unregisterFunc = _cc.inputManager._unregisterAccelerometerEvent.bind(_cc.inputManager);
_cc.inputManager._unregisterAccelerometerEvent = function () {
    // unregister engine AccelerationEventListener
    unregisterFunc();

    wx.stopAccelerometer && wx.stopAccelerometer({
        fail: function (err) {
            cc.error('unregister Accelerometer failed ! err: ' + err);
        },
        success: function () {},
        complete: function () {},
    });
};
