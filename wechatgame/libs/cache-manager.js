/****************************************************************************
 Copyright (c) 2019 Chukong Technologies Inc.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Chukong Aipu reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
const { readJsonSync, makeDirSync, writeFileSync, copyFile, downloadFile, writeFile, readDir, deleteFile } = require('./wx-utils');

var checkNextPeriod = false;
var writeCacheFileList = null;
var startWrite = false;
var nextCallbacks = [];
var callbacks = [];
var cleaning = false;

var cacheManager = {

    cacheDir: wx.env.USER_DATA_PATH + '/gamecaches',

    cachedFileName: 'cacheList.json',

    // whether or not cache asset into user's storage space
    saveFile: true,

    // cache one per cycle
    cachePeriod: 500,

    deletePeriod: 500,

    writeFilePeriod: 2000,

    // whether or not storage space has run out
    outOfStorage: false,

    tempFiles: null,

    cachedFiles: null,

    cacheQueue: {},

    init () {
        var cacheFilePath = this.cacheDir + '/' + this.cachedFileName;
        var result = readJsonSync(cacheFilePath);
        if (result instanceof Error) {
            this.cachedFiles = new cc.AssetManager.Cache();
            makeDirSync(this.cacheDir, true);
            writeFileSync(cacheFilePath, JSON.stringify({ files: this.cachedFiles._map, outOfStorage: this.outOfStorage }), 'utf8');
        }
        else {
            this.cachedFiles = new cc.AssetManager.Cache(result.files);
            this.outOfStorage = result.outOfStorage;
        }
        this.tempFiles = new cc.AssetManager.Cache();
        wx.onHide(function () {
            writeFileSync(cacheFilePath, JSON.stringify({ files: this.cachedFiles._map, outOfStorage: this.outOfStorage }), 'utf8');
        });
    },

    updateLastTime (url) {
        if (this.cachedFiles.has(url)) {
            var cache = this.cachedFiles.get(url);
            cache.lastTime = Date.now();
        }
    },

    _write () {
        writeCacheFileList = null;
        startWrite = true;
        writeFile(cacheManager.cacheDir + '/' + cacheManager.cachedFileName, JSON.stringify({ files: cacheManager.cachedFiles._map, outOfStorage: cacheManager.outOfStorage }), 'utf8', function () {
            startWrite = false;
            for (let i = 0, j = callbacks.length; i < j; i++) {
                callbacks[i]();
            }
            callbacks.length = 0;
            callbacks.push.apply(callbacks, nextCallbacks);
            nextCallbacks.length = 0;
        });
    },

    writeCacheFile (cb) {
        if (!writeCacheFileList) {
            writeCacheFileList = setTimeout(cacheManager._write, cacheManager.writeFilePeriod);
            if (startWrite === true) {
                cb && nextCallbacks.push(cb);
            }
            else {
                cb && callbacks.push(cb);
            }
        } else {
            cb && callbacks.push(cb);
        }
    },

    _cache () {
        var self = cacheManager;
        for (var id in self.cacheQueue) {
            var { srcUrl, isCopy } = self.cacheQueue[id];
            var time = Date.now();
            var localPath = self.cacheDir + '/' + time + cc.path.extname(srcUrl);
             
            function callback (err) {
                checkNextPeriod = false;
                if (err)  {
                    if (errTest.test(err.message)) {
                        self.outOfStorage = true;
                        self.cleanLRU();
                        return;
                    }
                } else {
                    self.cachedFiles.add(id, { url: localPath, lastTime: time });
                    delete self.cacheQueue[id];
                    self.writeCacheFile();
                }
                if (!cc.js.isEmptyObject(self.cacheQueue)) {
                    checkNextPeriod = true;
                    setTimeout(self._cache, self.cachePeriod);
                }
            }
            if (!isCopy) {
                downloadFile(srcUrl, localPath, null, callback);
            }
            else {
                copyFile( srcUrl, localPath, callback );
            }
            return;
        }
        checkNextPeriod = false;
    },

    cacheFile (id, srcUrl, saveFile, isCopy) {
        saveFile = saveFile !== undefined ? saveFile : this.saveFile;
        if (!saveFile) return;

        this.cacheQueue[id] = { srcUrl, isCopy };
        if (!checkNextPeriod) {
            checkNextPeriod = true;
            if (!this.outOfStorage) {
                setTimeout(this._cache, this.cachePeriod);
            }
            else {
                checkNextPeriod = false;
            }
        }
    },

    cleanAllCaches () {
        var self = this;
        readDir(this.cacheDir, function (err, list) {
            if (err) return;
            var toDelete = self.cachedFiles._map;
            self.cachedFiles.clear();
            self.writeCacheFile(function () {
                for (var srcUrl in toDelete) {
                    var url = toDelete[srcUrl].url;
                    if (url.starstWith(self.cacheDir)) continue;
                    deleteFile(url, self._deleteFileCB);
                }
                for (var i = 0, l = list.length; i < l; i ++) {
                    var path = list[i];
                    if (path === self.cachedFileName) continue;
                    deleteFile(self.cacheDir + '/' + list[i], self._deleteFileCB);
                }
            });
        });
    },

    cleanLRU () {
        if (cleaning) return;
        cleaning = true;
        var caches = [];
        cacheManager.cachedFiles.forEach(function (val, key) {
            caches.push({ originUrl: key, url: val.url, lastTime: val.lastTime });
        });
        caches.sort(function (a, b) {
            return a.lastTime - b.lastTime;
        });
        caches.length = Math.floor(cacheManager.cachedFiles.count / 3);
        for (var i = 0, l = caches.length; i < l; i++) {
            cacheManager.cachedFiles.remove(caches[i].originUrl);
        }
        cacheManager.writeCacheFile(function () {
            function deferredDelete () {
                var item = caches.pop();
                deleteFile(item.url, self._deleteFileCB);
                if (caches.length > 0) { 
                    setTimeout(deferredDelete, self.deletePeriod); 
                }
                else {
                    cleaning = false;
                }
            }
            setTimeout(deferredDelete, self.deletePeriod);
        });

    },

    cleanCache (url) {
        if (this.cachedFiles.has(url)) {
            var self = this;
            var path = this.cachedFiles.remove(url).url;
            this.writeCacheFile(function () {
                deleteFile(path, self._deleteFileCB);
            });
        }
    },

    _deleteFileCB (err) {
        if (!err) cacheManager.outOfStorage = false;
    }
    
}

cc.assetManager.cacheManager = module.exports = cacheManager;