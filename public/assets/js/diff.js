(function ($) {
  // Builds a URL pointing at the line back on the github or where-ever
  // the repository is hosted. Based on file path and line number found
  // in the tr id attribute
  function buildContextUrl($tr) {
    var $fileLink = $tr.closest(".file-wrapper").find("header a"),
        baseHref = $fileLink.attr("href"),
        lineNo;

    if (!baseHref) return;

    if (!$tr.hasClass("removal")) {
      lineNo = $tr.find(".lineno").last().text();
      return baseHref + "#L" + lineNo;
    }

    return baseHref;
  }

  // Builds a markdown syntax link to the id of a given line
  function buildMarkdownLink($tr) {
    var id = $tr.attr("id"),
        filename = $tr.closest(".file-wrapper").find("header .filename").text();

    return "[" + filename + "](" +
      window.location.toString().split("#")[0] + "#" + id +
      ")";
  }

  // Builds the action panel and inserts it under the relevant line.
  // This action panel includes a context link to github or where-ever the repo
  // is hosted, and provides a textarea with a pre-selected markdown syntax link
  // to the relevant line.
  //
  // TODO: generate the inserted HTML with templates instead of jQuery
  function buildActionPanel($tr) {
    if ($tr.next().is(".action-panel")) return;

    // I dunno because who needs html templates when you can cobble together
    // horrible contraptions with jquery instead?
    var $actionTr = $("<tr>", { "class": "action-panel"}),
        mainWidth = $("main").width() - 2,
        $actionTd = $("<td>", { "colspan": "3" }),
        $wrapDiv = $("<div>").width(mainWidth),
        $textArea,
        $closeButton = $("<button>").html("close"),
        contextUrl = buildContextUrl($tr),
        markdownLink = buildMarkdownLink($tr);

    $actionTr.append($actionTd);
    $actionTd.append($wrapDiv);

    if (contextUrl) {
      $wrapDiv.append($("<a>", { "href": contextUrl }).text("View context"));
    }

    $textArea = $("<textarea>").html(markdownLink);
    $wrapDiv.append($textArea);

    $wrapDiv.append($closeButton);

    $closeButton.on("click", function () {
        $actionTr.remove();
      });

    $actionTr.insertAfter($tr);

    $textArea[0].focus();
    $textArea[0].select();

  }

  // Smoothly scroll to an element on the page
  function scrollTo($el) {
    $("html,body").animate({ "scrollTop": $el.offset().top }, 500);
  }

  // Highlight a line given my an id, changing its background color and
  // scrolling to it. De-highlights any previously highlighted lines
  function highlightLine(id) {
    $("tr.highlighted").removeClass("highlighted");

    var $tr = $(document.getElementById(id));

    if (!$tr.is("tr")) {
      $tr = [];
    }

    if ($tr.length === 0) {
      return;
    }

    $tr.addClass("highlighted");
    scrollTo($tr);
  }

  // Turns the dark style on or off
  // If no parameter is specified, it will change from the current state.
  function toggleDarkMode(on) {
    var DARK_CSS_LINK_ID = "dark-mode-css",
        DARK_CSS_URL = "/assets/css/diff-dark.css";

    var wasOn = retrieveMode();

    if (typeof on === "undefined") on = !wasOn;

    if (wasOn === on) return;

    if (!on) {
      $("#" + DARK_CSS_LINK_ID).remove();
    } else {
      $("<link>", {
        "id": DARK_CSS_LINK_ID,
        "rel": "stylesheet",
        "type": "text/css",
        "href": DARK_CSS_URL }).appendTo($("head"));
    }

    save();

    function retrieveMode() {
      if (typeof $.cookie === "undefined") {
        return $("#" + DARK_CSS_LINK_ID).length > 0;
      }

      return $.cookie("darkMode") === "on";
    }

    function save() {
      if (typeof $.cookie === "undefined") return;

      if (on) {
        $.cookie("darkMode", "on", { "path": "/" });
      } else {
        $.removeCookie("darkMode", { "path": "/" });
      }
    }
  }

  window.toggleDarkMode = toggleDarkMode;

  // Stuff to do when the DOM is ready
  $(document).ready(function () {
    // When the line-action is clikced, build the action panel
    $(document).on("click", ".line-action", function () {
        buildActionPanel($(this).closest("tr"));
      });

    // Add links to line numbers when hovering a line
    // This is done here rather than just included in static HTML because it
    // potentially reduces the size of the .html file massively (12MB -> 8MB in one example).
    // At first I was populating all of them on dom ready, which froze the browser.
    // Credit where it's due: Richard Graham came up with the on-demand idea
    // to only add in the links when they're required (that is, when your mouse
    // is over the relevant line.). I `git reset --hard` an hour's worth of work because
    // of that guy and his unsolicited good ideas.
    $(document).on("mouseover", "tr", function () {
        var $tr = $(this),
            id = $tr[0].id;

        if (id === "") return;
        if ($tr.find(".lineno a").length > 0) return;

        $tr.find("td.lineno").each(function () {
            $(this).html($("<a>", { href: "#" + id }).text($(this).text()));
          });

      });

      if (window.location.hash.length > 1) {
        highlightLine(window.location.hash.substr(1));
      }
    });

  // If the hash part of the url changes, (like when clicking a link that only
  // contains a hash), highlight the relevant line
  window.onhashchange = function () {
      if (window.location.hash.length > 1) {
        highlightLine(window.location.hash.substr(1));
      }
    };

  // Add a dark mode toggle button in the top right of the page
  (function () {
    if (typeof $.cookie !== "undefined") {
      toggleDarkMode($.cookie("darkMode") === "on");
    }

    // TODO: add the toggle button
  }());

}(window.jQuery));
