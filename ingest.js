var formidable = require("formidable"),
    util = require("util"),
    inspect = util.inspect,
    fs = require("fs"),
    crypto = require("crypto"),
    htmlDiff = require("./htmldiff");


// Public
function handleUpload(request, response) {
  var form = new formidable.IncomingForm(),
      title,
      metadata;

  form.encoding = "utf-8";
  form.keepExtensions = true;
  form.type = "multipart";
  form.hash = "sha1";
  form.multiples = false;

  form.parse(request, function (err, fields, files) {
      file = files["diff_file"];
      metadata = {
          title: fields["title"],
          description: fields["description"],
          repoUrl: fields["repoUrl"],
          headName: fields["headName"]
        };
    });

  form.on("end", function () {
      processUploadedFile(
          file,
          metadata,

          function success(redirectPath) {
            console.log("success, sending redirect");
            response.writeHead(302, { "Location": redirectPath });
            response.end();
          },

          function error(message) {
            uploadError(response, message);
          }
        );
    });

  return;
}

function processUploadedFile(file, metadata, successCb, errorCb) {
  var ext = getExtension(file.name),
      containerDir = uniqueShorthash(file),
      redirPath = "diff/" + containerDir + "/" + file.name.toLowerCase() + ".html",
      movePath = "content/" + "diff/" + containerDir + "/" + file.name.toLowerCase();

  function onError(message) {
    console.error("processUploadedFile Error: " + message);

    if (typeof errorCb === "function") errorCb(message);
  }

  // Escape the nested callback hell
  function onComplete() {
    if (typeof successCb === "function") successCb(redirPath);
  }

  if (ext !== "diff") {
    // Clean up
    fs.unlink(file.path, function () {});
    return onError("File should be a .diff, got ." + ext);
  }

  fs.mkdir("content/diff/" + containerDir, function(ex) {
      if (ex) {
        return onError("Failed to create containing directory for file.");
      }

      moveFile(file.path, movePath, function () {
          generateHtmlDiff(movePath, metadata, onComplete);

        });
    });
}

function moveFile(source, destination, cb) {
  var readStream = fs.createReadStream(source),
      writeStream = fs.createWriteStream(destination);

  readStream.pipe(writeStream);

  readStream.on("end", function () {
      fs.unlink(source, function () {
          if (typeof cb === "function") cb();
        });
    });
}

function generateHtmlDiff(diffFile, metadata, completeCb) {
  htmlDiff.generate(diffFile, diffFile + ".html", metadata,  completeCb);
}

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function uniqueShorthash(file) {
  var shasum = crypto.createHash("sha1"),
      hash = shasum.update(file.hash + Date.now().toString());

  return hash.digest("hex").substr(0, 8);
}

function uploadError(response, message) {
  response.writeHead(500, { "Content-Type": "text/plain" });
  response.end(message);
}

function fileExists(file) {
  try {
    fs.accessSync(file, fs.F_OK);
    return true;
  } catch (ex) {
    return false;
  }
}

module.exports = { handleUpload: handleUpload };
