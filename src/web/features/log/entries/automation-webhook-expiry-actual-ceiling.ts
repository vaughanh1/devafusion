import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "automation-webhook-expiry-actual-ceiling",
  date: "2026-09-14",
  title: "The 10-year webhook expiry fix was still over the real ceiling",
  summary:
    "The previous fix's 10-years-out default (2036) hit the exact same 'Invalid expiry time' 400 it was meant to solve - the assumption that 10 years was safely inside Azure's undocumented ceiling was wrong. Rather than guess a third time, tested the real boundary directly against the Automation webhook REST API: 2027, 2028, 2031, 2033, and 2035 (up to roughly 9 years out) all succeeded; 2036 (about 10 years and 3 months out) and 2099 both failed identically. The real ceiling sits somewhere in that narrow window, so the module now defaults to 9 years out - comfortably inside it, not balanced on the edge.",
  tags: ["incident", "azure", "terraform"],
  decisions: [
    "Stopped trusting an assumption about Azure's undocumented expiry ceiling and instead created and deleted a series of throwaway test webhooks directly against the same REST endpoint Terraform uses, at increasing expiry distances, to find the real boundary empirically rather than guessing a third literal value and hoping.",
    "Chose 9 years out as the new default specifically because it is comfortably inside every value confirmed to succeed, not because it is the exact known limit - the real ceiling was narrowed to somewhere between 9 and roughly 10.25 years, and picking a value right at the edge of an undocumented, unstated limit would only reproduce this same incident again the next time Azure's exact behaviour shifted by even a few weeks.",
    "Documented the specific empirical test results (which dates succeeded, which failed) directly in the variable's description, so the next person who considers pushing this value further out has the actual evidence in front of them instead of re-discovering the ceiling by trial and error.",
  ],
  milestones: [
    "Confirmed via direct az rest PUT/DELETE calls against the Automation webhook API that 2027, 2028, 2031, 2033, and 2035 expiry dates all succeed, while 2036 and 2099 both fail with the same 'Invalid expiry time' 400.",
    "Changed webhook_expiry_time's default from 2036-12-31 (10 years, failed) to 2035-09-14 (9 years, confirmed working).",
    "Updated both the variable description and the resource's inline comment to state the empirically-verified ceiling instead of an assumed one.",
  ],
  validation: [
    "terraform fmt -check -recursive (infrastructure/app/environments/dev) passed clean",
    "terraform validate passed clean",
    "Directly verified the new default expiry date against the live Automation webhook REST API (created and deleted a throwaway test webhook) before committing, rather than trusting terraform validate alone - validate cannot catch an API-side business-rule rejection like this.",
  ],
  visibility: "public",
};
