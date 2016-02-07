var fs = require("fs"),
    readline = require("readline"),
    striptags = require("striptags"),
    marked = require("marked");

// State machine wrapper for reading a diff
function DiffProcessor() {
  var outputLineSubs = [];

  function onOutputLine(line) {
    for (var i = 0; i < outputLineSubs.length; i++) {
      outputLineSubs[i](line);
    }
  }

  this.on = function (eventName, cb) {
      if (typeof cb !== "function") {
        throw new Error("cb should be function, is " + typeof cb);
      }

      switch(eventName) {
        case "outputLine":
          if (outputLineSubs.indexOf(cb) > -1) return;
          outputLineSubs.push(cb);
          break;
      }
    };

  this.processLine = function (line) {
      // TODO actual processing
      onOutputLine(line + "\n");
    };
}

function generate(inputFile, outputFile, metadata, completeCb) {
  var diffProcessor = new DiffProcessor(),
      cleanMetadata = processMetadata(metadata),
      fileReader,
      fileWriter,
      lineReader;


  fileWriter = fs.createWriteStream(outputFile);
  fileWriter.write(generateTopBit(cleanMetadata));
  diffProcessor.on("outputLine", function (line) { fileWriter.write(line); });


  fileReader = fs.createReadStream(inputFile);
  lineReader = readline.createInterface({ input: fileReader });
  lineReader.on("line", diffProcessor.processLine);

  fileReader.on("end", function () {
    fileWriter.write(generateBottomBit());
    fileWriter.end();
    if (typeof completeCb === "function") completeCb();
  });

}

function generateTopBit(metadata) {
  return "" +
    "<!doctype html>\n" +
    "<html lang=\"en\">\n" +
    "<head>\n" +
    "  <meta charset=\"utf-8\">\n" +
    "  <title>" + metadata.title + " | Diff Viewer</title>\n" +
    "  <link rel=\"stylesheet\" type=\"text/css\" href=\"/assets/css/common.css\">\n" +
    "  <link rel=\"stylesheet\" type\"text/css\" href=\"/assets/css/diff.css\">\n" +
    "</head>\n" +
    "<body>\n" +
    "  <header>\n" +
    "    <h1>Handy Dandy Diff Viewer</h1>\n" +
    "    <h2>" + metadata.title + "</h2>\n" +
    "  </header>\n\n" +
    "  <main>\n" +
    "    <section id=\"description\">\n" +
    metadata.description + "\n" +
    "    </section>\n" +
    "    <section id=\"diff\">\n" +
    "      <pre>";
}

function generateBottomBit() {
  return "</pre>\n" +
    "    </section>\n" +
    "  </main>\n\n" +
    "  <footer>\n" +
    "    Written by\n" +
    "    <a href=\"http://michd.me\" target=\"_blank\">Micha&euml;l \"Mich\" Duerinckx</a>,\n" +
    "    because GitHub's diff view didn't cut it for some of our occasional\n" +
    "    monstrous diffs.\n" +
    "  </footer>\n" +
    "</body>\n" +
    "</html>";
}

function processMetadata(input) {
  return {
      title: striptags(input.title),
      description: markdown(input.description)
    };
}

function markdown(str) {
  marked.setOptions({ sanitize: true });
  return marked(str);
}

module.exports = { generate: generate }; 
