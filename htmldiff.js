var fs = require("fs"),
    readline = require("readline"),
    Entities = require("html-entities").AllHtmlEntities,
    entities = new Entities(),
    marked = require("marked")

// Helper for rendering lines
function Line(
    rawLine,
    filename,
    oldLineNumber,
    newLineNumber) {
  this.rawLine = rawLine;
  this.filename = filename;
  this.oldLineNumber = oldLineNumber;
  this.newLineNumber = newLineNumber;
}

Line.prototype.isAddition = function () {
    return this.rawLine.substr(0, 1) === '+';
  };

Line.prototype.isRemoval = function () {
    return this.rawLine.substr(0, 1) === '-';
  };

Line.prototype.isContext = function () {
    return !this.isAddition() && !this.isRemoval();
  };

Line.prototype.isPositionLine = function () {
    return (typeof this.oldLineNumber === "undefined") &&
      (typeof this.newLineNumber === "undefined");
  };

Line.prototype.getClasses = function () {
    var classes = [];

    if (this.isAddition()) classes.push("addition");
    if (this.isRemoval()) classes.push("removal");
    if (this.isPositionLine()) classes.push("position");

    return classes.join(' ');
  };

Line.prototype.getId = function () {
    var lineNo = (this.oldLineNumber || this.newLineNumber),
        lineStr = this.oldLineNumber || "0";

    lineStr = lineStr + "";

    lineStr += "," + (this.newLineNumber || "0");

    if (lineStr === "0,0") return "";

    return this.filename + ":L" + lineStr;
  };

Line.prototype.toString = function () {
    var posLine = this.isPositionLine();

    return "<tr id=\"" + this.getId() + "\" " +
              "class=\"" + this.getClasses() + "\">" +
           "<td class=\"lineno\">" +
             (posLine ? "..." : (this.oldLineNumber || " ")) +
           "</td><td class=\"lineno\">" +
             (posLine ? "... " : (this.newLineNumber || " ")) +
           "</td><td class=\"code\">" +
             (!posLine ? "<button class=\"line-action\">+</button>" : "") +
           "<pre>" +
             entities.encode(this.rawLine) +
           "</pre></td></tr>\n";
  };

// State machine wrapper for reading a diff
function DiffProcessor(metadata) {
  var STATE_INIT = "State:Init",
      STATE_FILE_HEADER = "State:FileHeader",
      STATE_FILE_INDEX = "State:FileIndex",
      STATE_BINARY_CHANGE = "State:BinaryChange",
      STATE_FILE_OLD_FILE = "State:FileOldFile",
      STATE_FILE_NEW_FILE = "State:FileNewFile",
      STATE_POSITION = "State:Position",
      STATE_CONTENT = "State:Content",


      // "diff --git a/some/file/path.ext b/some/other/file.path"
      // 1: "some/file/path.ext"
      // 2: "some/other/file.path"
      PATTERN_FILE_HEADER =
        new RegExp('^diff\\s+--git\\s+a\\/([\\w\\-\\.\\/]+)\\s+b\\/([\\w\\-\\.\\/]+)$'),

      // "new file mode 614654"
      // "deleted file mode 456648"
      // 1: "new" / "deleted"
      PATTERN_FILE_OPERATION =
        new RegExp('^(new|deleted)\\s+file\\s+mode\\s+(?:\\d+)$'),

      // "index 05645abcdef..54654abcdef"
      PATTERN_INDEX =
        new RegExp('^index\\s+[0-9a-f]+\\.\\.[0-9a-f]+(?:\\s+\\d+)?$'),

      // "Binary files a/some/path.png and b/some/other/path.png differ"
      // 1: "some/path.png"
      // 2: "some/other/path.png"
      PATTERN_BINARY_FILE_CHANGE =
        new RegExp('^Binary\\s+files\\s+(?:a\\/)?([\\w\\-\\.\\/]+)\\s+and\\s+(?:b\\/)?([\\w\\-\\.\\/]+)\\s+differ$'),

      // "--- a/some/file/path.txt"
      // 1: "some/file/path.txt"
      PATTERN_OLD_FILE =
        new RegExp('^---\\s+(?:a\\/)?([\\w\\-\\.\\/]+)$'),

      // "+++ b/some/other/file.path"
      // 1: "some/other/file.path"
      PATTERN_NEW_FILE =
        new RegExp('^\\+\\+\\+\\s+(?:b\\/)?([\\w\\-\\.\\/]+)$'),

      // "@@ -12,86 +15,84 @@"
      // "@@ -12,86 +15,84 @@ line content here"
      // 1: "12"
      // 2: "86"
      // 3: "15"
      // 4: "84"
      // 5: "" / "line content here"
      PATTERN_POSITION =
        new RegExp('^@@\\s+-(\\d+),(\\d+)\\s+\\+(\\d+),(\\d+)\\s+@@(?:\\s(.*))?$');


  var outputSubs = [],
      state = STATE_INIT,
      currentOldFile = "",
      currentNewFile = "",
      isNewFile = false,
      isDeleted = false,
      isBinaryChange = false,
      isInFile = false,
      oldLineRange = [0, 0],
      newLineRange = [0, 0],
      currentOldLine = 0,
      currentNewLine = 0,
      fileCount = 0;

  function onOutput(data) {
    for (var i = 0; i < outputSubs.length; i++) {
      outputSubs[i](data);
    }
  }

  function generateLinkToFile(path) {
    return "" +
      "<a href=\"" + metadata.repoUrl + "/blob/" + metadata.headName + "/" +
      path + "\"><span class=\"filename\">" + path + "</span></a>";
  }

  function emitFileHeader() {
    var specialLabel = "",
        filename = isDeleted ? currentOldFile : currentNewFile,
        output;

    function makeLabel(value) {
      return "<span class=\"file-label file-label-" + value + "\">" +
        value + "</span>";
    }

    if (isNewFile) specialLabel += makeLabel("new");
    if (isDeleted) specialLabel += makeLabel("del");
    if (isBinaryChange) specialLabel += makeLabel("bin");

    var output = "" +
      "<div class=\"file-wrapper\">\n" +
      "  <header>\n" +
      "    " + specialLabel + "\n" +
      "    " + (isDeleted ?
              ("<span class=\"filename\">" + filename + "</span>") :
              generateLinkToFile(filename)) + "\n" +
      "  </header>\n" +
      "  <table>\n" +
      "    <tbody>\n";

    isInFile = true;
    onOutput(output);
  }

  function emitFileClose() {
    var output = "" +
      "    </tbody>\n" +
      "  </table>\n" +
      "</div>";

    isInFile = false;
    onOutput(output);
  }

  function emitPositionLine(rawLine) {
    var filename = isDeleted ? currentOldFile : currentNewFile,
        pLine = new Line(rawLine, filename);
    onOutput(pLine.toString());
  }

  function emitContentLine(rawLine) {
    var filename = isDeleted ? currentOldFile : currentNewFile,
        cLine = new Line(rawLine, filename);

    if (cLine.isContext()) {
      cLine.oldLineNumber = ++currentOldLine;
      cLine.newLineNumber = ++currentNewLine;
    } else if (cLine.isAddition()) {
      cLine.newLineNumber = ++currentNewLine;
    } else {
      cLine.oldLineNumber = ++ currentOldLine;
    }

    onOutput(cLine.toString());

  }

  function setPosition(coords) {
    oldLineRange = [parseInt(coords[1], 10), parseInt(coords[2], 10)];
    newLineRange = [parseInt(coords[3], 10), parseInt(coords[4], 10)];
    currentOldLine = oldLineRange[0] - 1;
    currentNewLine = newLineRange[0] - 1;
  }

  function processFileHeader(matches) {
    isNewFile = false;
    isDeleted = false;
    isBinaryChange = false;

    currentOldFile = matches[1];
    currentNewFile = matches[2];

    if (isInFile) emitFileClose();
  }

  this.on = function (eventName, cb) {
      if (typeof cb !== "function") {
        throw new Error("cb should be function, is " + typeof cb);
      }

      switch(eventName) {
        case "output":
          if (outputSubs.indexOf(cb) > -1) return;
          outputSubs.push(cb);
          break;
      }
    };

  this.processLine = function (line) {
      var matches;

      switch (state) {
        case STATE_INIT:
        case STATE_BINARY_CHANGE:
          // Expecting file header.
          matches = line.match(PATTERN_FILE_HEADER);

          if (matches === null) {
            throw new Error("Expecting file header as initial line\n" + line);
          }

          processFileHeader(matches);
          state = STATE_FILE_HEADER;
          break;

        case STATE_FILE_HEADER:
          // Expecting eiter a file operation line or an index line
          matches = line.match(PATTERN_FILE_OPERATION);

          if (matches) {
            isNewFile = matches[1] === "new";
            isDeleted = matches[1] === "deleted";
            // state remains for this, as the line we read was optional
            break;
          }

          matches = line.match(PATTERN_INDEX);

          if (matches === null) {
            throw new Error(
                "Expecting either file operation (new/deleted) or index after" +
                " file header, but got neither.");
          }

          // We're ignoring the index line, just expect it to be there.
          state = STATE_FILE_INDEX;
          break;

        case STATE_FILE_INDEX:
          matches = line.match(PATTERN_BINARY_FILE_CHANGE);

          if (matches) {
            isBinaryChange = true;
            emitFileHeader();
            emitFileClose();
            state = STATE_BINARY_CHANGE;
            break;
          }

          matches = line.match(PATTERN_OLD_FILE);

          if (matches) {
            currentOldFile = matches[1];
            state = STATE_FILE_OLD_FILE;
            break;
          }

          matches = line.match(PATTERN_FILE_HEADER);

          if (matches === null) {
            throw new Error(
                "Expecting old file line, binary change, or file header after file index, " + 
                "got neither\n" + line);
          }

          processFileHeader(matches);
          state = STATE_FILE_HEADER;
          break;

        case STATE_FILE_OLD_FILE:
          matches = line.match(PATTERN_NEW_FILE);

          if (matches === null) {
            throw new Error("Expecting new file line after old file line");
          }

          currentNewFile = matches[1];

          if (isInFile) {
            emitFileClose();
          }

          emitFileHeader();
          state = STATE_FILE_NEW_FILE;
          break;

        case STATE_FILE_NEW_FILE:
          matches = line.match(PATTERN_POSITION);

          if (matches === null) {
            throw new Error("Expecting position line after new file line");
          }

          state = STATE_POSITION;
          setPosition(matches);
          emitPositionLine(line);
          break;

        case STATE_POSITION:
        case STATE_CONTENT:
          matches = line.match(PATTERN_POSITION);

          if (matches) {
            setPosition(matches);
            emitPositionLine(line);
            state = STATE_POSITION;
            break;
          }

          matches = line.match(PATTERN_FILE_HEADER);

          if (matches) {
            processFileHeader(matches);
            state = STATE_FILE_HEADER;
            break;
          }

          emitContentLine(line);
          state = STATE_CONTENT;
          break;
      }
    };

  this.end = function () {
      if (isInFile) emitFileClose();
    };
}

function generate(inputFile, outputFile, metadata, completeCb) {
  var cleanMetadata = processMetadata(metadata),
      diffProcessor = new DiffProcessor(cleanMetadata),
      fileReader,
      fileWriter,
      lineReader;


  fileWriter = fs.createWriteStream(outputFile);
  fileWriter.write(generateTopBit(cleanMetadata));
  diffProcessor.on("output", function (line) { fileWriter.write(line); });


  fileReader = fs.createReadStream(inputFile);
  lineReader = readline.createInterface({ input: fileReader });
  lineReader.on("line", diffProcessor.processLine);

  fileReader.on("end", function () {
    diffProcessor.end();
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
    "  <link rel=\"stylesheet\" type=\"text/css\" href=\"/assets/css/diff.css\">\n" +
    "</head>\n" +
    "<body>\n" +
    "  <header>\n" +
    "    <h1><a href=\"/\">Handy Dandy Diff Viewer</a></h1>\n" +
    "    <h2>" + metadata.title + "</h2>\n" +
    "  </header>\n\n" +
    "  <main>\n" +
    "    <article id=\"description\">\n" +
    metadata.description + "\n" +
    "    </article>\n" +
    "    <section id=\"diff\">\n";
}

function generateBottomBit() {
  return "\n" +
    "    </section>\n" +
    "  </main>\n\n" +
    "  <footer>\n" +
    "    Written by\n" +
    "    <a href=\"http://michd.me\" target=\"_blank\">Micha&euml;l \"Mich\" Duerinckx</a>,\n" +
    "    because GitHub's diff view didn't cut it for some of our occasional\n" +
    "    monstrous diffs.\n" +
    "  </footer>\n" +
    "  <script src=\"//code.jquery.com/jquery-1.12.0.min.js\"></script>\n" +
    "  <script src=\"/assets/js/diff.js\"></script>\n" +
    "</body>\n" +
    "</html>";
}

function processMetadata(input) {
  return {
      title: entities.encode(input.title),
      description: markdown(input.description),
      repoUrl: entities.encode(input.repoUrl),
      headName: entities.encode(input.headName)
    };
}

function markdown(str) {
  marked.setOptions({ sanitize: true });
  return marked(str);
}

module.exports = { generate: generate }; 
