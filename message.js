var PORT = 9529;
var http = require('http');
var qs = require('qs');
var request = require('request');
var fs = require('fs');

var TOKEN = 'wenzt';

var getUserInfo = require('./lib/user').getUserInfo;
var replyText = require('./lib/reply').replyText;
var appID = require('./lib/config').appID;
var appSecret = require('./lib/config').appSecret;
var wss = require('./lib/ws.js').wss;
//var promise =require('promise');
function checkSignature(params, token) {
    //1. 将token、timestamp、nonce三个参数进行字典序排序
    //2. 将三个参数字符串拼接成一个字符串进行sha1加密
    //3. 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信

    var key = [token, params.timestamp, params.nonce].sort().join('');
    var sha1 = require('crypto').createHash('sha1');
    sha1.update(key);

    return sha1.digest('hex') == params.signature;
}

var server = http.createServer(function (request, response) {

    //解析URL中的query部分，用qs模块(npm install qs)将query解析成json
    var query = require('url').parse(request.url).query;
    var params = qs.parse(query);

    console.log(params);
    console.log("token-->", TOKEN);

    if (!checkSignature(params, TOKEN)) {
        response.end('signature fail');
    }

    if (request.method == 'GET') {
        response.end(params.echostr);
    } else {
        //否则是微信给开发者服务器的POST请求
        var postdata = "";

        request.addListener("data", function (postchunk) {
            postdata += postchunk;
        });

        //获取到了POST数据
        request.addListener("end", function () {
            console.log(postdata);
            var parseString = require('xml2js').parseString;
            parseString(postdata, function (err, result) {
                if (err) console.log('parse err');
                else {
                    getUserInfo(result.xml.FromUserName[0])
                        .then(function (userInfo) {
                            //获得用户信息，合并到消息中
                            result.user = userInfo;
                            //将消息通过websocket广播
                            wss.broadcast(result);
                            if (result.xml.MsgType[0] == 'text') {
                                var res = replyText(result, '消息推送成功！');
                                console.log(res);
                            }
                            else if (result.xml.MsgType[0] == 'image')
                                var res = replyText(result, '图片推送成功！');
                            response.end(res);
                        });
                }
            });

        });
    }
});

server.listen(PORT);

console.log("Server runing at port: " + PORT + ".");

