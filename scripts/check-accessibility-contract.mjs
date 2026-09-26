import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(pathname) {
  return readFile(new URL(`../${pathname}`, import.meta.url), "utf8");
}

const [searchForm, searchPage, feedbackForm, accountProfile, authFlow, officialContact] = await Promise.all([
  readSource("components/discovery-search-form.tsx"),
  readSource("app/search/page.tsx"),
  readSource("components/feedback-form.tsx"),
  readSource("components/account-profile-controls.tsx"),
  readSource("components/auth-flow-client.tsx"),
  readSource("components/member-email-action.tsx")
]);

assert.match(searchForm, /<label htmlFor=\{searchInputId\}[^>]*>Search bills, officials, and votes<\/label>/, "Search must retain a real programmatic label.");
assert.match(searchForm, /type="search"/, "The discovery query must remain a search input.");
assert.match(searchForm, /<div id=\{searchSuggestionsId\}/, "The search input must retain a valid suggestion-region relationship.");
assert.match(searchForm, /<nav aria-label="Search suggestions">/, "Suggestion links must remain keyboard-navigable navigation.");
assert.doesNotMatch(searchForm, /role="listbox"/, "Suggestion links must not claim unsupported listbox keyboard behavior.");
assert.match(searchForm, /Type at least two characters for suggestion links, then use Tab/, "Search must explain its keyboard interaction.");
assert.match(searchForm, /focus-visible:outline/, "Search controls must retain visible keyboard focus.");
assert.match(searchForm, /onBlurCapture=\{\(event\) => \{/, "Search must manage focus across the complete suggestion region.");
assert.match(searchForm, /event\.currentTarget\.contains\(event\.relatedTarget\)/, "Search must keep suggestions open while keyboard focus stays inside the search region.");
assert.doesNotMatch(searchForm, /<input[\s\S]*?onBlur=/, "The query input must not close suggestions before keyboard users can reach them.");
assert.match(searchPage, /className=\{`h-11 rounded-xl/, "Primary search tabs must retain a 44px target.");

for (const [id, label] of [
  ["feedback-title", "Short title"],
  ["feedback-message", "What happened?"],
  ["feedback-contact-email", "Contact email"]
]) {
  assert.match(feedbackForm, new RegExp(`FieldLabel htmlFor="${id}" label="${label.replace("?", "\\?")}"`), `${label} must retain an associated label.`);
  assert.match(feedbackForm, new RegExp(`id="${id}"`), `${label} must retain its labeled control id.`);
}
assert.match(feedbackForm, /role=\{state === "error" \? "alert" : "status"\}/, "Feedback results must be announced.");

assert.match(accountProfile, /<label htmlFor="district-lookup"[^>]*>City, ZIP, or district code<\/label>/, "District lookup must retain a real label.");
assert.match(accountProfile, /id="district-lookup"/, "District lookup must retain its labeled control id.");
assert.match(authFlow, /className="grid h-11 w-11/, "Password visibility controls must retain a 44px target.");

assert.match(officialContact, /<label htmlFor="official-contact-email"/, "Official contact email must retain a real label.");
assert.match(officialContact, /<label htmlFor="official-contact-message"/, "Official contact message must retain a real label.");
assert.match(officialContact, /aria-live=\{status === "error"/, "Official contact results must be announced.");
assert.doesNotMatch(officialContact, /className="inline-flex h-10/, "Official contact action controls must not regress below a 44px target.");

console.log("Accessibility contract checks passed.");
