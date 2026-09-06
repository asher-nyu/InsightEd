import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Box, Button, FormControlLabel, Radio, RadioGroup, SvgIcon, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { formControlSx, glassPanelSx } from "../theme";
import { ViewFrame } from "./ViewFrame";
import "./user-reviews.css";

function CheckIcon() {
  return <SvgIcon className="review-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>;
}

const questions = [
  { id: "overall", title: "How was the overall experience?", hint: "Consider the dashboard’s layout and design.", labels: ["Very poor", "Poor", "Okay", "Good", "Excellent"] },
  { id: "navigation", title: "How easy was it to find your way?", hint: "Think about finding charts and moving between views.", labels: ["Very difficult", "Difficult", "Neutral", "Easy", "Very easy"] },
  { id: "clarity", title: "How clear were the key metrics?", hint: "How well did you understand the student performance measures?", labels: ["Not at all", "A little", "Somewhat", "Mostly", "Completely"] },
];

export function UserReviewsView() {
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [suggestion, setSuggestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const completed = Object.keys(ratings).length;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "User Reviews · InsightEd";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (submitted) successHeading.current?.focus();
  }, [submitted]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    // Intentionally frontend-only: responses are neither transmitted nor persisted.
    setRatings({});
    setSuggestion("");
    setSubmitted(true);
  }

  return (
    <ViewFrame title="User Reviews">
      <Box className="reviews-content" sx={{ color: "text.primary", fontFamily: "inherit", width: "100%", containerType: "inline-size", containerName: "reviews", userSelect: "text" }}>
        {submitted ? (
          <Box className="review-success" sx={{ ...glassPanelSx, px: { xs: 3, md: 5 }, py: { xs: 6, md: 8 }, textAlign: "center" }}>
            <span className="review-success-mark"><CheckIcon /></span>
            <Typography ref={successHeading} tabIndex={-1} component="h2" sx={{ fontSize: "clamp(1.3rem, 2.5cqi, 1.75rem)", fontWeight: 800, outline: "none", mb: 1.5 }}>Thanks for sharing your perspective.</Typography>
            <Typography sx={{ color: "text.secondary", mb: 3 }}>Thank you for taking the time to explore InsightEd.</Typography>
            <Button component={Link} to="/performance-dashboard" variant="contained" disableElevation>Back to the dashboard</Button>
          </Box>
        ) : (
          <Box component="form" className="review-form" onSubmit={handleSubmit} sx={{ ...glassPanelSx, overflow: "hidden" }}>
            <Box className="review-intro" sx={{ px: { xs: 2, md: 3 }, py: 2.5, borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <Typography component="h2" sx={{ fontWeight: 800, fontSize: "clamp(1.05rem, 2cqi, 1.3rem)", mb: 0.75 }}>Help shape a better dashboard.</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "1rem" }}>Rate your experience and tell us what could be clearer.</Typography>
              </div>
              <span className="review-time">About 2 minutes</span>
            </Box>

            <div className="review-progress-row">
              <span>Three ratings. Your perspective.</span>
              <div className="review-progress" aria-live="polite"><span>{completed} of 3 answered</span><div className="review-progress-bars" role="progressbar" aria-label="Required ratings completed" aria-valuemin={0} aria-valuemax={3} aria-valuenow={completed}>{questions.map((q) => <i key={q.id} className={ratings[q.id] ? "is-complete" : ""} />)}</div></div>
            </div>

            {questions.map((question, index) => (
              <fieldset className="review-question" key={question.id}>
                <legend className="review-visually-hidden">{question.title} (required)</legend>
                <div className="review-question-copy">
                  <span className="review-number" aria-hidden="true">{index + 1}</span>
                  <div><h3 id={`${question.id}-title`}>{question.title} <span className="review-required" aria-hidden="true">*</span></h3><p id={`${question.id}-hint`}>{question.hint}</p></div>
                </div>
                <RadioGroup className="review-ratings" name={question.id} aria-labelledby={`${question.id}-title`} aria-describedby={`${question.id}-hint`} value={ratings[question.id] || ""} onChange={(_, value) => setRatings((current) => ({ ...current, [question.id]: value }))}>
                  {question.labels.map((label, ratingIndex) => {
                    const value = String(ratingIndex + 1);
                    const selected = ratings[question.id] === value;
                    return <FormControlLabel key={value} className={`review-rating ${selected ? "is-selected" : ""}`} value={value} control={<Radio required slotProps={{ input: { "aria-label": `${value} — ${label}` } }} />} label={<span className="review-rating-label"><span className="review-rating-value">{value}</span><span className="review-rating-caption">{label}</span>{selected && <CheckIcon />}</span>} />;
                  })}
                </RadioGroup>
              </fieldset>
            ))}

            <div className="review-suggestion">
              <label className="review-question-copy" htmlFor="review-suggestion"><span className="review-number" aria-hidden="true">4</span><span className="review-suggestion-title">What would make InsightEd more useful?<span className="review-optional">Optional</span></span></label>
              <p id="review-suggestion-hint">Share a small improvement, a missing feature, or something you found confusing.</p>
              <Box component="textarea" id="review-suggestion" name="suggestion" value={suggestion} onChange={(event) => setSuggestion(event.target.value)} rows={3} aria-describedby="review-suggestion-hint" placeholder="I’d find it helpful if…" sx={{ ...formControlSx, resize: "vertical", minHeight: 100, display: "block", userSelect: "text" }} />
            </div>

            <div className="review-submit-row">
              <span><span className="review-required">*</span> Required ratings · No name or email needed</span>
              <Button className="review-submit" type="submit" variant="contained" disableElevation sx={{ px: 3, py: 1.15 }}>Submit feedback</Button>
            </div>
          </Box>
        )}
      </Box>
    </ViewFrame>
  );
}
