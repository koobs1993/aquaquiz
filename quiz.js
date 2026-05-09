(function () {
  var root = document.getElementById("quiz");
  if (!root) return;

  var steps = Array.prototype.slice.call(root.querySelectorAll(".quiz-step"));
  var progressSegs = Array.prototype.slice.call(
    root.querySelectorAll(".progress__seg")
  );
  var quizMain = document.getElementById("quiz-main");
  var flowAfter = document.getElementById("quiz-flow-after");
  var flowAnalyze1 = document.getElementById("flow-analyze-1");
  var flowAnalyze2 = document.getElementById("flow-analyze-2");
  var flowResult = document.getElementById("flow-result");

  var offerLayer = document.getElementById("offer-layer");
  var offerBeginner = document.getElementById("offer-beginner");
  var offerIntermediate = document.getElementById("offer-intermediate");
  var offerExperienced = document.getElementById("offer-experienced");
  var offerUpsell = document.getElementById("offer-upsell");
  var upsellTimerEl = document.getElementById("offer-upsell-timer");

  var step = 0;
  var flowTimers = [];
  var upsellTimerId = null;
  var upsellEndTs = 0;

  var CHECKOUT_TRY_AQUA =
    "https://tryaqua.aquafunded.com/?add-to-cart=66";
  var CHECKOUT_PAY_LATER =
    "https://www.aquafunded.com/pay-later#get-funded";

  function checkoutUrlForCta(action) {
    switch (action) {
      case "cta-unlock-dollar":
      case "cta-try-dollar":
        return CHECKOUT_TRY_AQUA;
      case "cta-pay-later":
      case "cta-pay-later-exp":
      case "cta-upsell-accounts":
        return CHECKOUT_PAY_LATER;
      default:
        return "";
    }
  }

  /** Opens checkout in a new tab (works when quiz is embedded in an iframe). */
  function openCheckoutUrl(url) {
    var w = window.open(url, "_blank");
    if (w) {
      w.opener = null;
      return;
    }
    window.location.assign(url);
  }

  function clearFlowTimers() {
    flowTimers.forEach(function (id) {
      clearTimeout(id);
    });
    flowTimers = [];
  }

  function stopUpsellTimer() {
    if (upsellTimerId != null) {
      clearInterval(upsellTimerId);
      upsellTimerId = null;
    }
  }

  function formatClock(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function startUpsellTimer() {
    stopUpsellTimer();
    upsellEndTs = Date.now() + 15 * 60 * 1000 - 1000;
    function tick() {
      var left = Math.max(0, Math.round((upsellEndTs - Date.now()) / 1000));
      if (upsellTimerEl) upsellTimerEl.textContent = formatClock(left);
      if (left <= 0) stopUpsellTimer();
    }
    tick();
    upsellTimerId = setInterval(tick, 1000);
  }

  function setProgress() {
    progressSegs.forEach(function (seg, i) {
      seg.classList.toggle("progress__seg--active", i === step);
      seg.classList.toggle("progress__seg--inactive", i !== step);
    });
  }

  function setSteps() {
    steps.forEach(function (el, i) {
      var active = i === step;
      el.classList.toggle("is-active", active);
      el.setAttribute("aria-hidden", active ? "false" : "true");
      el.hidden = !active;
    });
    setProgress();
  }

  function triggerFillAnimation(sectionEl) {
    if (!sectionEl) return;
    sectionEl.classList.remove("flow-analyze--animate");
    void sectionEl.offsetWidth;
    requestAnimationFrame(function () {
      sectionEl.classList.add("flow-analyze--animate");
    });
  }

  function showAnalyzingStep1() {
    if (flowAnalyze2) {
      flowAnalyze2.hidden = true;
      flowAnalyze2.classList.remove("flow-analyze--animate");
    }
    if (flowResult) flowResult.hidden = true;
    if (flowAnalyze1) {
      flowAnalyze1.hidden = false;
      triggerFillAnimation(flowAnalyze1);
    }
  }

  function showAnalyzingStep2() {
    if (flowAnalyze1) {
      flowAnalyze1.hidden = true;
      flowAnalyze1.classList.remove("flow-analyze--animate");
    }
    if (flowResult) flowResult.hidden = true;
    if (flowAnalyze2) {
      flowAnalyze2.hidden = false;
      triggerFillAnimation(flowAnalyze2);
    }
  }

  function showFlowResult() {
    if (flowAnalyze1) {
      flowAnalyze1.hidden = true;
      flowAnalyze1.classList.remove("flow-analyze--animate");
    }
    if (flowAnalyze2) {
      flowAnalyze2.hidden = true;
      flowAnalyze2.classList.remove("flow-analyze--animate");
    }
    if (flowResult) flowResult.hidden = false;
  }

  function hideAllOfferPanels() {
    if (offerBeginner) offerBeginner.hidden = true;
    if (offerIntermediate) offerIntermediate.hidden = true;
    if (offerExperienced) offerExperienced.hidden = true;
    if (offerUpsell) offerUpsell.hidden = true;
  }

  function closeUpsellOnly() {
    stopUpsellTimer();
    if (offerUpsell) offerUpsell.hidden = true;
    if (offerExperienced) offerExperienced.hidden = false;
  }

  function collectAnswers() {
    function val(name) {
      var el = root.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : "";
    }
    return {
      q1: val("q1"),
      q2: val("q2"),
      q3: val("q3"),
      q4: val("q4"),
      q5: val("q5"),
    };
  }

  function revealSegmentOffers() {
    var scoring = window.AquaQuizScoring;
    if (!scoring) return;

    var answers = collectAnswers();
    var scores = scoring.computeScores(answers);
    var segment = scoring.computeSegment(answers);

    root.dataset.segment = segment;
    root.dataset.scoreBeginner = String(scores.beginner);
    root.dataset.scoreIntermediate = String(scores.intermediate);
    root.dataset.scoreExperienced = String(scores.experienced);
    root.dataset.scoreStrongIndicators = String(
      scoring.countStrongExperiencedIndicators(answers)
    );

    if (flowAfter) flowAfter.hidden = true;
    hideAllOfferPanels();
    if (offerLayer) offerLayer.hidden = false;

    if (segment === "beginner" && offerBeginner) offerBeginner.hidden = false;
    else if (segment === "intermediate" && offerIntermediate)
      offerIntermediate.hidden = false;
    else if (segment === "experienced" && offerExperienced)
      offerExperienced.hidden = false;
    else if (offerIntermediate) offerIntermediate.hidden = false;

    root.dispatchEvent(
      new CustomEvent("quiz-segment", {
        bubbles: true,
        detail: { segment: segment, scores: scores, answers: answers },
      })
    );
  }

  function exitQuiz() {
    clearFlowTimers();
    stopUpsellTimer();
    root.dataset.phase = "quiz";

    if (quizMain) quizMain.hidden = false;
    if (flowAfter) flowAfter.hidden = true;

    if (flowAnalyze1) {
      flowAnalyze1.hidden = true;
      flowAnalyze1.classList.remove("flow-analyze--animate");
    }
    if (flowAnalyze2) {
      flowAnalyze2.hidden = true;
      flowAnalyze2.classList.remove("flow-analyze--animate");
    }
    if (flowResult) flowResult.hidden = true;

    hideAllOfferPanels();
    if (offerLayer) offerLayer.hidden = true;

    step = 0;
    setSteps();

    root.dispatchEvent(new CustomEvent("quiz-exit", { bubbles: true }));
  }

  function finishQuiz() {
    clearFlowTimers();
    root.dataset.phase = "after";

    if (quizMain) quizMain.hidden = true;
    if (flowAfter) flowAfter.hidden = false;

    showAnalyzingStep1();

    flowTimers.push(
      setTimeout(function () {
        showAnalyzingStep2();
      }, 2800)
    );
    flowTimers.push(
      setTimeout(function () {
        showFlowResult();
      }, 5600)
    );

    root.dispatchEvent(new CustomEvent("quiz-complete", { bubbles: true }));
  }

  root.addEventListener("click", function (e) {
    var t = e.target;

    if (t.closest('[data-action="view-result"]')) {
      revealSegmentOffers();
      return;
    }

    if (t.closest('[data-action="offer-close-upsell"]')) {
      closeUpsellOnly();
      return;
    }

    if (t.closest('[data-action="show-upsell"]')) {
      if (offerExperienced) offerExperienced.hidden = true;
      if (offerUpsell) offerUpsell.hidden = false;
      startUpsellTimer();
      root.dispatchEvent(
        new CustomEvent("quiz-upsell-open", { bubbles: true })
      );
      return;
    }

    var elWithAction = t.closest("[data-action]");
    if (elWithAction) {
      var ctaAction = elWithAction.getAttribute("data-action");
      var commerceActions = [
        "cta-pay-later",
        "cta-pay-later-exp",
        "cta-try-dollar",
        "cta-unlock-dollar",
        "cta-upsell-accounts",
      ];
      if (commerceActions.indexOf(ctaAction) >= 0) {
        root.dispatchEvent(
          new CustomEvent("quiz-cta", {
            bubbles: true,
            detail: {
              action: ctaAction,
              segment: root.dataset.segment || "",
            },
          })
        );
        var checkoutUrl = checkoutUrlForCta(ctaAction);
        if (checkoutUrl) openCheckoutUrl(checkoutUrl);
        return;
      }
    }

    if (t.closest('[data-action="offer-close"]')) {
      exitQuiz();
      return;
    }

    if (t.closest(".btn-close") || t.closest('[data-action="cancel"]')) {
      exitQuiz();
      return;
    }

    if (t.closest('[data-action="finish"]')) {
      finishQuiz();
      return;
    }

    if (t.closest('[data-action="next"]')) {
      if (step < steps.length - 1) {
        step++;
        setSteps();
      }
      return;
    }

    if (t.closest('[data-action="back"]')) {
      if (step > 0) {
        step--;
        setSteps();
      }
      return;
    }
  });

  setSteps();
})();
