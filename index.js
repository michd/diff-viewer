var ROUTES = [
    {
      "pattern": new RegExp("^/?$"),
      "handler": handleHomeRequest
    },

    {
      "pattern": new RegExp("^/new/?$"),
      "handler": handleUploadRequest
    },

    {
      "pattern": new RegExp("^/diff/([a-zA-Z0-9\-\_\.\/]+\.(diff|html))$"),

      "handler": handleDiffRequest
    },

    {
      "pattern": new RegExp("^/assets/(?:.*)$"),
      "handler": handleAssetRequest
    }
  ],

  PORT = 1338,
  NO_OP = function() {};

var nodeStatic = require("node-static"),
    http = require("http"),
    fs = require("fs"),
    url = require("url"),
    multipart = require("multipart"),
    ingest = require("./ingest");

var staticFileServer,
    httpServer;

staticFileServer = new nodeStatic.Server("./public", { cache: 300 });

httpServer = http.createServer(httpServerOnRequest).listen(PORT);

console.log("Server running at 127.0.0.1:" + PORT);

function httpServerOnRequest(request, response) {
  var path = url.parse(request.url).pathname,
      i = 0,
      patternMatches;

  // Find a pattern in the routes table that matches the path
  for (i = 0; i < ROUTES.length; i++) {
    patternMatches = path.match(ROUTES[i].pattern);

    if (patternMatches != null) {
      ROUTES[i].handler(request, response, patternMatches);
      return;
    }
  }

  handle404(request, response);
}

function handleHomeRequest(request, response) {
  staticFileServer.serveFile("/index.html", 200, {}, request, response);

}

function handleUploadRequest(request, response) {
  ingest.handleUpload(request, response, "./content/diff/");
}

function handleDiffRequest(request, response, matches) {
  var filePath = "content" + url.parse(request.url).pathname,
      type = matches[2] === "diff" ? "text/plain" : "text/html",
      readStream;

  function fileExists(path) {
    try {
      fs.accessSync(path, fs.R_OK);
      return true;
    } catch (ex) {
      return false;
    }
  }

  if (!fileExists(filePath)) return handle404(request, response);

  response.writeHead(200, { "Content-Type": type });

  readStream = fs.createReadStream(filePath);
  readStream.pipe(response);
}

function handleAssetRequest(request, response, matches) {
  request.addListener("end", function () {
      staticFileServer.serve(request, response, function (e, res) {
          if (e && e.status === 404) return handle404(request, response);
        });
    }).resume();
}

function handle404(request, response) {
  response.writeHead(404, { "Content-Type": "text/plain" });
  response.end(
      "404 Not Found\n" + request.url + " was not found on this server.");
}


