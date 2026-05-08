/**
 * Quiz scoring: Beginner / Intermediate / Experienced points per answer.
 * Segment rules match product spec (hard beginner triggers, experienced gate).
 */
(function (global) {
  function addPoints(agg, d) {
    agg.beginner += d.beginner || 0;
    agg.intermediate += d.intermediate || 0;
    agg.experienced += d.experienced || 0;
    return agg;
  }

  var SCORE_Q1 = {
    never: { beginner: 3 },
    lt6: { beginner: 2, intermediate: 1 },
    "6-12": { intermediate: 2 },
    "1y": { experienced: 3 },
  };

  var SCORE_Q2 = {
    "0": { beginner: 3 },
    "1-1000": { beginner: 2, intermediate: 1 },
    "1k-10k": { intermediate: 2 },
    "10k-plus": { experienced: 3 },
  };

  var SCORE_Q3 = {
    capital: { beginner: 2, intermediate: 1 },
    consistent: { intermediate: 3 },
    start: { beginner: 3 },
    "funded-fail": { experienced: 3 },
  };

  var SCORE_Q4 = {
    none: { beginner: 3 },
    "1-2": { intermediate: 2 },
    "3-7": { intermediate: 2, experienced: 1 },
    exp: { experienced: 3 },
  };

  var SCORE_Q5 = {
    learn: { beginner: 3 },
    challenge: { intermediate: 2 },
    funded: { intermediate: 2, experienced: 1 },
    scale: { experienced: 3 },
  };

  function computeScores(answers) {
    var agg = { beginner: 0, intermediate: 0, experienced: 0 };
    if (!answers) return agg;
    [
      SCORE_Q1[answers.q1],
      SCORE_Q2[answers.q2],
      SCORE_Q3[answers.q3],
      SCORE_Q4[answers.q4],
      SCORE_Q5[answers.q5],
    ].forEach(function (row) {
      if (row) addPoints(agg, row);
    });
    return agg;
  }

  /** Strong “experienced” signals for Segment 3 gate (need ≥2). */
  function countStrongExperiencedIndicators(answers) {
    if (!answers) return 0;
    var n = 0;
    if (answers.q1 === "1y") n++;
    if (answers.q5 === "scale") n++;
    if (answers.q4 === "exp") n++;
    if (answers.q3 === "funded-fail") n++;
    return n;
  }

  function hasHardBeginnerTrigger(answers) {
    if (!answers) return false;
    return (
      answers.q1 === "never" ||
      answers.q2 === "0" ||
      answers.q3 === "start" ||
      answers.q4 === "none"
    );
  }

  /**
   * @returns {"beginner"|"intermediate"|"experienced"}
   */
  function computeSegment(answers) {
    var scores = computeScores(answers);
    var b = scores.beginner;
    var i = scores.intermediate;
    var e = scores.experienced;

    if (hasHardBeginnerTrigger(answers)) {
      return "beginner";
    }

    var strong = countStrongExperiencedIndicators(answers);
    var experiencedEligible =
      strong >= 2 && e > i && e > b;

    if (experiencedEligible) {
      return "experienced";
    }

    if (e > i && e > b && strong < 2) {
      return "intermediate";
    }

    var max = Math.max(b, i, e);
    if (i === max && i >= b) {
      return "intermediate";
    }
    if (b === max) {
      return "beginner";
    }

    return "intermediate";
  }

  global.AquaQuizScoring = {
    computeScores: computeScores,
    computeSegment: computeSegment,
    countStrongExperiencedIndicators: countStrongExperiencedIndicators,
    hasHardBeginnerTrigger: hasHardBeginnerTrigger,
  };
})(typeof window !== "undefined" ? window : this);
