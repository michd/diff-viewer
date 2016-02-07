(function ($) {
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

  function buildMarkdownLink($tr) {
    var id = $tr.attr("id"),
        filename = $tr.closest(".file-wrapper").find("header .filename").text();

    return "[" + filename + "](" +
      window.location.toString().split("#")[0] + "#" + id +
      ")";
  }

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

  function scrollTo($el) {
    $("html,body").animate({ "scrollTop": $el.offset().top }, 500);
  }

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

  $(function () {
    $(document).on("click", ".line-action", function () {
        buildActionPanel($(this).closest("tr"));
      });

      if (window.location.hash.length > 1) {
        highlightLine(window.location.hash.substr(1));
      }
    });

  window.onhashchange = function () {
      if (window.location.hash.length > 1) {
        highlightLine(window.location.hash.substr(1));
      }
    };

}(window.jQuery));
