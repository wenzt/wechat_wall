var http = require('http');
var fs = require('fs');
var server = http.createServer(function(req,res){
    res.writeHead(200, {"Content-Type": "text/html"});
    fs.readFile('index.html',function (err,data){
        console.log(data);
        res.end(data);
    });

});

server.listen(8080);