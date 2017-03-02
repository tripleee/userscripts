// ==UserScript==
// @name        Flag Instantly, Rapidly, Effortlessly
// @namespace   https://github.com/Charcoal-SE/
// @description FIRE adds a button to SmokeDetector reports that allows you to provide feedback & flag, all from chat.
// @author      Cerbrus
// @attribution Michiel Dommerholt (https://github.com/Cerbrus)
// @version     0.0.1
// @updateURL   https://raw.githubusercontent.com/Charcoal-SE/Userscripts/master/fire/fire.user.js
// @downloadURL https://raw.githubusercontent.com/Charcoal-SE/Userscripts/master/fire/fire.user.js
// @supportURL  https://github.com/Charcoal-SE/Userscripts/issues
// @match       *://chat.stackexchange.com/rooms/11540/charcoal-hq
// @match       *://chat.stackoverflow.com/rooms/41570/so-close-vote-reviewers
// @match       *://chat.meta.stackexchange.com/rooms/89/tavern-on-the-meta
// @grant       none
// ==/UserScript==
/* global autoflagging */

/*
  TODO:
  * Show the site's header image above the post title/text.
*/

(function () {
  "use strict";

  if (autoflagging) {
    // Plugin registration
    autoflagging.decorate.fire = onSmokeDetectorReport;
    autoflagging.decorate.fire.location = "after";
  } else {
    console.error("FIRE dependency missing: The AIM userscript isn't loaded.");
    console.warn("AIM GitHub url: https://github.com/Charcoal-SE/userscripts/blob/master/autoflagging.user.js");
    console.warn("AIM Download url: https://raw.githubusercontent.com/Charcoal-SE/Userscripts/master/autoflagging.user.js");
    return;
  }

  var buttonKeyCodes = [];
  var isOpen = false;

  var wip = true;
  injectCSS(wip);
  registerAnchorHover();

  // Smoke Detector Report handler
  function onSmokeDetectorReport($fire, data) {
    if ($fire.find(".ai-fire-button").length === 0) {
      var fireButton = element("span", "ai-fire-button", {
        text: "🛠️", // http://graphemica.com/%F0%9F%9B%A0
        click: function () {
          data.is_answer = data.link.indexOf("/a/") >= 0; // eslint-disable-line camelcase
          openPopup(data);
        }
      });

      $fire.prepend(fireButton);
    }
  }

  // Popup methods
  function closePopup() {
    $(".ai-fire-popup, .ai-fire-popup-modal")
      .fadeOut("fast", function () {
        $(this).remove();
      });

    $(document).off("keydown", keyboardShortcuts);
    isOpen = false;
  }

  function keyboardShortcuts(e) {
    if (e.keyCode === 13 || e.keyCode === 32) { // Enter key or spacebar
      e.preventDefault();
      $(".ai-fire-popup-header a.button.focus")
        .fadeOut(100) // Flash to indicate which button was selected.
        .fadeIn(100, function () {
          $(this).click();
        });
    } else if (buttonKeyCodes.indexOf(e.keyCode) >= 0) {
      e.preventDefault();

      $(".ai-fire-popup-header a.button")
        .removeClass("focus")
        .trigger("mouseleave");

      var $button = $(".ai-fire-popup-header a.button[fire-key=" + e.keyCode + "]");
      var button = $button[0];

      if (button) {
        if (e.keyCode === 27) { // Esc key
          $button.click();
        } else {
          var pos = button.getBoundingClientRect();
          $button
            .addClass("focus")
            .trigger("mouseenter")
            .trigger($.Event("mousemove", { // eslint-disable-line new-cap
              clientX: pos.right - (button.offsetWidth + 20),
              clientY: pos.top + 20
            }));
        }
      }
    }
  }

  function openPopup(data) {
    if (isOpen) {
      return; // Don't open the popup twice.
    }

    isOpen = true;

    var w = (window.innerWidth - $("#sidebar").width()) / 2;
    var d = data;

    var popup = element("div", "ai-fire-popup")
      .css({top: 100, left: w - 300});

    var closeButton = element("a", "button ai-fire-close-button", {
      text: "Close",
      click: closePopup,
      "fire-key": 27 // escape key code
    });
    buttonKeyCodes.push(27);

    var top = element("p", "ai-fire-popup-header")
      .append(createFeedbackButton(d, 49, "tpu-", "tpu-", "True positive"))
      .append(createFeedbackButton(d, 50, "tp-", "tp-", "Vandalism"))
      .append(createFeedbackButton(d, 51, "fp-", "fp-", "False Positive"))
      .append(createFeedbackButton(d, 52, "naa-", "naa-", "Not an Answer / VLQ"))
      .append(closeButton);

    var modal = element("div", "ai-fire-popup-modal");

    var body = element("div", "ai-fire-popup-body")
      .append($("<h2 />", {text: "Question Title: "})
        .append($("<em />", {text: d.title}))
      )
      .append($("<hr />"))
      .append($("<h3 />", {text: (d.is_answer ? "Answer" : "Question") + ":"}))
      .append($("<br />"))
      .append(d.body);

    modal.appendTo("body")
      .click(closePopup);

    popup
      .append(top)
      .append(body)
      .hide()
      .appendTo("body")
      .fadeIn("fast");

    expandLinksOnHover();

    $(document).keydown(keyboardShortcuts);
  }

  // Provide feedback / flag
  function feedback(data, verdict) {
    // if (data.autoflagged && data.autoflagged.flagged) {
    //   // Only allow actual flagging if this has been flagged already.
    // }
    console.log(data, verdict);
    closePopup();
  }

  // DOM helpers
  function createFeedbackButton(data, keyCode, text, verdict, tooltip) { // eslint-disable-line max-params
    buttonKeyCodes.push(keyCode);
    return element("a", "button ai-fire-feedback-button", {
      text: text,
      click: function () {
        feedback(data, verdict);
      },
      "fire-key": keyCode,
      "fire-tooltip": tooltip
    });
  }

  // Wrapper to create a new element with a specified class.
  function element(tagName, cssClass, options) {
    options = options || {};
    options.class = cssClass;
    return $("<" + tagName + "/>", options);
  }

  // Expands anchor elements in the report's body on hover, to show the href.
  function expandLinksOnHover() {
    $(".ai-fire-popup-body a")
      .each(function () {
        $(this).attr("fire-tooltip", this.href);
      });
  }

  function registerAnchorHover() {
    var anchorSelector = "a[fire-tooltip]";
    $("body")
      .on("mouseenter", anchorSelector, function () {
        var that = $(this);
        that.after(element("span", "ai-fire-tooltip", {
          text: that.attr("fire-tooltip")
        }));
      }).on("mousemove", anchorSelector, function (e) {
        $(".ai-fire-tooltip").css({
          left: e.clientX + 20,
          top: e.clientY + 5
        });
      })
      .on("mouseleave", anchorSelector, function () {
        $(".ai-fire-tooltip").remove();
      });
  }

  // Handle CSS injection
  function injectCSS(wip) {
    if (wip) {
      // This userscript is still work in progress. It's probably broken, useless or otherwise dangerous.
      $.get(
        "https://api.github.com/repos/Charcoal-SE/Userscripts/commits/FIRE",
        function (commitData) {
          var css = window.document.createElement("link");
          css.rel = "stylesheet";
          css.href = "https://cdn.rawgit.com/Charcoal-SE/Userscripts/" + commitData.sha + "/fire/fire.css";
          document.head.appendChild(css);
        }
      );
    } else {
      // Release
      // Inject CSS
      var css = window.document.createElement("link");
      css.rel = "stylesheet";
      css.href = "//charcoal-se.org/userscripts/fire.css"; // "cdn.rawgit.com/Charcoal-SE/userscripts/master/fire/fire.css"
      document.head.appendChild(css);
    }
  }
})();
