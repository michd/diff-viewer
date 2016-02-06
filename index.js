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
      "pattern": new RegExp("^/diff/([a-zA-Z0-9\-\_\.]+\.(diff|html))$"),
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
    url = require("url"),
    multipart = require("multipart"),
    ingest = require("./ingest");

var staticFileServer,
    diffStaticFileServer,
    httpServer;

staticFileServer = new nodeStatic.Server("./public", { cache: 300 });
diffStaticFileServer = new nodeStatic.Server("./content", { cache: 3600 * 24 });

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
  ingest.handleUpload(request, response, "./content/");
}

function handleDiffRequest(request, response, matches) {
  // TODO see if I need to add a content-type, and how

  request.addListener("end", function () {
      diffStaticFileServer.serve(request, response, function (e, res) {
          if (e && e.status === 404)  return handle404(request, response);
        });
    }).resume();
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


