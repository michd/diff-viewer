var formidable = require("formidable"),
    inspect = require("util").inspect,
    fs = require("fs")


// Public
function handleUpload(request, response, uploadFolder) {
  var form = new formidable.IncomingForm();

  form.parse(request, function (err, fields, files) {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.write("Received upload: \n\n");
      response.end(inspect({ fields: fields, files: files }));
    });

  return;


/*
      if (fileExists(filename)) {
        console.warn("File already exists: " + filename + ", aborting.");
        uploadError(response, "Something went wrong: file exists");
        return;
      }
*/


}

function uploadComplete(response) {
  // TODO redirect to processed diff
  response.sendHeader(200, { "Content-Type": "text/plain" });
  response.end("Upload complete, should be able to access it.");
}

function uploadError(response, message) {
  response.sendHeader(500, { "Content-Type": "text/plain" });
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
