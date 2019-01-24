/****************************************************************************
 Copyright (c) 2017 Chukong Technologies Inc.

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

var ID = 'WXDownloader';

var non_text_format = [
    'js','png','jpg','bmp','jpeg','gif','ico','tiff','webp','image','mp3','ogg','wav','m4a','font','eot','ttf','woff','svg','ttc'
];

var binary_format = [
    'bin',
    'pvr',
    'etc'
];

const REGEX = /^\w+:\/\/.*/;

var fs = wx.getFileSystemManager ? wx.getFileSystemManager() : null;

var _newAssets = [];
var WXDownloader = window.WXDownloader = function () {
    this.id = ID;
    this.async = true;
    this.pipeline = null;
    this.REMOTE_SERVER_ROOT = '';
    this.SUBCONTEXT_ROOT = '';
    _newAssets = [];
};
WXDownloader.ID = ID;

WXDownloader.prototype.handle = function (item, callback) {

    if (item.type === 'js') {
        return null;
    }
    if (item.type === 'uuid') {
        var result = cc.Pipeline.Downloader.PackDownloader.load(item, callback);
        // handled by PackDownloader
        if (result !== undefined) {
            // null result
            if (!!result) {
                return result;
            }
            else {
                return;
            }
        }
    }

    if (CC_WECHATGAMESUB) {
        if (REGEX.test(item.url)) {
            return null;
        }

        item.url = this.SUBCONTEXT_ROOT + '/' + item.url;

        if (item.type && non_text_format.indexOf(item.type) !== -1) {
            nextPipe(item, callback);
            return;
        }

        // if wx.getFileSystemManager is undefined, need to skip
        if (!fs) {
            return null;
        }
    }

    var filePath = item.url;
    // Read from package
    fs.access({
        path: filePath,
        success: function () {
            if (item.type && non_text_format.indexOf(item.type) !== -1) {
                nextPipe(item, callback);
            }
            else {
                readText(item, callback);
            }
        },
        fail: function (res) {
            readFromLocal(item, callback);
        }
    });
};

WXDownloader.prototype.cleanOldAssets = function () {
    cleanAllFiles(wx.env.USER_DATA_PATH, _newAssets, function (err) {
        if (err) {
            cc.warn(err);
        }
        else {
            for (var i = 0; i < _newAssets.length; ++i) {
                cc.log('reserve local file: ' + _newAssets[i]);
            }
            cc.log('Clean old Assets successfully!');
        }
    });
};

function cleanAllFiles(path, newAssets, finish) {
    if (!fs) {
        finish && finish('wx.getFileSystemManager is undefined');
        return;
    }

    fs.readdir({
        dirPath: path,
        success: function (res) {
            var files = res.files;
            (function next(idx) {
                if (idx < files.length) {
                    var dirPath = path + '/' + files[idx];
                    var stat = fs.statSync(dirPath);
                    if (stat.isDirectory()) {
                        cleanAllFiles(dirPath, newAssets, function () {
                            next(idx + 1);
                        });
                    }
                    else {
                        // remove old assets
                        if (newAssets && newAssets.indexOf(dirPath) !== -1) {
                            next(idx + 1);
                            return;
                        }
                        fs.unlink({
                            filePath: dirPath,
                            success: function () {
                                cc.log('unlink local file ' + dirPath + ' successfully!');
                            },
                            fail: function (res) {
                                cc.warn('failed to unlink file(' + dirPath + '): ' + res ? res.errMsg : 'unknown error');
                            },
                            complete: function () {
                                next(idx + 1);
                            }
                        });
                    }
                }
                else {
                    finish && finish();
                }

            })(0);
        },
        fail: function (res) {
            finish && finish();
        },
    });
}

WXDownloader.prototype.cleanAllAssets = function () {
    _newAssets = [];
    cleanAllFiles(wx.env.USER_DATA_PATH, null, function (err) {
        if (err) {
            cc.warn(err);
        }
        else {
            cc.log('Clean all Assets successfully!');
        }
    });
};

var wxDownloader = window.wxDownloader = new WXDownloader();

function nextPipe(item, callback) {
    var queue = cc.LoadingItems.getQueue(item);
    queue.addListener(item.id, function (item) {
        if (item.error) {
            fs && fs.unlink({
                filePath: item.url,
                success: function () {
                    cc.log('Load failed, removed local file ' + item.url + ' successfully!');
                }
            });
        }
    });
    callback(null, null);
}

function readText (item, callback) {
    if (!fs) {
        callback && callback({
            status: 0,
            errorMessage: 'wx.getFileSystemManager is undefined'
        });
        return;
    }

    var url = item.url;
    var encodingFormat = 'utf8';
    for (var i = 0; i < binary_format.length; i++) {
        if (url.endsWith(binary_format[i])) {
            // read as ArrayBuffer
            encodingFormat = '';
            break;
        }
    }

    fs.readFile({
        filePath: url,
        encoding: encodingFormat,
        success: function (res) {
            var queue = cc.LoadingItems.getQueue(item);
            queue.addListener(item.id, function (item) {
                if (item.error) {
                    fs.unlink({
                        filePath: url,
                        success: function () {
                            cc.log('Load failed, removed local file ' + url + ' successfully!');
                        }
                    });
                }
            });
            
            if (res.data) {
                item.states[cc.loader.downloader.id] = cc.Pipeline.ItemState.COMPLETE;
                callback && callback(null, res.data);
            }
            else {
                callback && callback({
                    status: 0,
                    errorMessage: "Empty file: " + url
                });
            }
        },
        fail: function (res) {
            cc.warn('Read file failed: ' + url);
            fs.unlink({
                filePath: url,
                success: function () {
                    cc.log('Read file failed, removed local file ' + url + ' successfully!');
                }
            });
            callback && callback({
                status: 0,
                errorMessage: res && res.errMsg ? res.errMsg : "Read text file failed: " + url
            });
        }
    });
}

function readFromLocal (item, callback) {
    if (!fs) {
        callback && callback({
            status: 0,
            errorMessage: 'wx.getFileSystemManager is undefined'
        });
        return;
    }

    var localPath = wx.env.USER_DATA_PATH + '/' + item.url;

    // Read from local file cache
    fs.access({
        path: localPath,
        success: function () {

            // cache new asset
            _newAssets.push(localPath);

            item.url = localPath;
            if (item.type && non_text_format.indexOf(item.type) !== -1) {
                nextPipe(item, callback);
            }
            else {
                readText(item, callback);
            }
        },
        fail: function (res) {
            // No remote server indicated, then continue to downloader
            if (!wxDownloader.REMOTE_SERVER_ROOT) {
                callback && callback(null, null);
                return;
            }

            downloadRemoteFile(item, callback);
        }
    });
}

function ensureDirFor (path, callback) {
    if (!fs) {
        callback && callback('wx.getFileSystemManager is undefined');
        return;
    }

    // cc.log('mkdir:' + path);
    var ensureDir = cc.path.dirname(path);
    if (ensureDir === "wxfile://usr" || ensureDir === "http://usr") {
        callback && callback();
        return;
    }
    fs.access({
        path: ensureDir,
        success: callback,
        fail: function (res) {
            ensureDirFor(ensureDir, function () {
                fs.mkdir({
                    dirPath: ensureDir,
                    complete: callback,
                });
            });
        },
    });
}

function downloadRemoteFile (item, callback) {
    // Download from remote server
    var relatUrl = item.url;

    // filter protocol url (E.g: https:// or http:// or ftp://)
    if (REGEX.test(relatUrl)) {
        callback && callback(null, null);
        return;
    }

    var remoteUrl = wxDownloader.REMOTE_SERVER_ROOT + '/' + relatUrl;
    item.url = remoteUrl;
    wx.downloadFile({
        url: remoteUrl,
        success: function (res) {
            if (res.statusCode === 200 && res.tempFilePath) {
                // http reading is not cached
                var temp = res.tempFilePath;
                var localPath = wx.env.USER_DATA_PATH + '/' + relatUrl;
                // check and mkdir remote folder has exists
                ensureDirFor(localPath, function () {
                    // Save to local path
                    wx.saveFile({
                        tempFilePath: res.tempFilePath,
                        filePath: localPath,
                        success: function (res) {
                            // cc.log('save:' + localPath);
                            item.url = res.savedFilePath;
                            if (item.type && non_text_format.indexOf(item.type) !== -1) {
                                nextPipe(item, callback);
                            }
                            else {
                                readText(item, callback);
                            }
                        },
                        fail: function (res) {
                            // Failed to save file, then just use temp
                            console.log(res && res.errMsg ? res.errMsg : 'save file failed: ' + remoteUrl);
                            console.log('It might be due to out of storage spaces, you can clean your storage spaces manually.');
                            item.url = temp;
                            if (item.type && non_text_format.indexOf(item.type) !== -1) {
                                nextPipe(item, callback);
                            }
                            else {
                                readText(item, callback);
                            }
                        }
                    });
                });
            }
            else {
                cc.warn("Download file failed: " + remoteUrl);
                callback && callback({
                    status: 0,
                    errorMessage: res && res.errMsg ? res.errMsg : "Download file failed: " + remoteUrl
                });
            }
        },
        fail: function (res) {
            // Continue to try download with downloader, most probably will also fail
            callback && callback({
                status: 0,
                errorMessage: res && res.errMsg ? res.errMsg : "Download file failed: " + remoteUrl
            }, null);
        }
    })
}

// function downloadRemoteTextFile (item, callback) {
//     // Download from remote server
//     var relatUrl = item.url;
//     var remoteUrl = wxDownloader.REMOTE_SERVER_ROOT + '/' + relatUrl;
//     item.url = remoteUrl;
//     wx.request({
//         url: remoteUrl,
//         success: function(res) {
//             if (res.data) {
//                 if (res.statusCode === 200 || res.statusCode === 0) {
//                     var data = res.data;
//                     item.states[cc.loader.downloader.ID] = cc.Pipeline.ItemState.COMPLETE;
//                     if (data) {
//                         if (typeof data !== 'string' && !(data instanceof ArrayBuffer)) {
//                             // Should we check if item.type is json ? If not, loader behavior could be different
//                             item.states[cc.loader.loader.ID] = cc.Pipeline.ItemState.COMPLETE;
//                             callback(null, data);
//                             data = JSON.stringify(data);
//                         }
//                         else {
//                             callback(null, data);
//                         }
//                     }

//                     // Save to local path
//                     var localPath = wx.env.USER_DATA_PATH + '/' + relatUrl;
//                     // Should recursively mkdir first
//                     fs.writeFile({
//                         filePath: localPath,
//                         data: data,
//                         encoding: 'utf8',
//                         success: function (res) {
//                             cc.log('Write file to ' + res.savedFilePath + ' successfully!');
//                         },
//                         fail: function (res) {
//                             // undone implementation
//                         }
//                     });
//                 } else {
//                     cc.warn("Download text file failed: " + remoteUrl);
//                     callback({
//                         status:0, 
//                         errorMessage: res && res.errMsg ? res.errMsg : "Download text file failed: " + remoteUrl
//                     });
//                 }
//             }
//         },
//         fail: function (res) {
//             // Continue to try download with downloader, most probably will also fail
//             callback(null, null);
//         }
//     });
// }
