import assert from "node:assert/strict";
import type { CongressHouseVoteItem } from "@/lib/congress/client";
import { normalizeCongressHouseVote } from "@/lib/congress/normalizers";
import {
  fetchPaginatedHouseVoteCatalog,
  parseHouseClerkVoteXml,
  parseSenateVoteMenu,
  parseSenateVoteXml,
  validateVoteCatalog
} from "@/lib/congress/vote-catalog";

function rawHouseVote(session: number, rollCallNumber: number): CongressHouseVoteItem {
  return {
    congress: 119,
    result: "Passed",
    rollCallNumber,
    sessionNumber: session,
    sourceDataURL: `https://clerk.house.gov/evs/202${session + 4}/roll${String(rollCallNumber).padStart(3, "0")}.xml`,
    startDate: `202${session + 4}-01-15`,
    voteQuestion: "On Passage"
  };
}

const houseXml = `<?xml version="1.0"?>
<rollcall-vote>
  <vote-metadata>
    <congress>119</congress>
    <session>1st</session>
    <rollcall-num>2</rollcall-num>
    <vote-question>On Passage</vote-question>
    <vote-result>Passed</vote-result>
    <vote-desc>Fixture Act</vote-desc>
    <totals-by-vote>
      <yea-total>1</yea-total>
      <nay-total>1</nay-total>
      <present-total>0</present-total>
      <not-voting-total>0</not-voting-total>
    </totals-by-vote>
  </vote-metadata>
  <vote-data>
    <recorded-vote><legislator name-id="A000001">Example One</legislator><vote>Yea</vote></recorded-vote>
    <recorded-vote><legislator name-id="B000002">Example Two</legislator><vote>Nay</vote></recorded-vote>
  </vote-data>
</rollcall-vote>`;

const senateMenuXml = `<?xml version="1.0"?>
<vote_summary>
  <congress>119</congress>
  <session>2</session>
  <votes>
    <vote><vote_number>2</vote_number></vote>
    <vote><vote_number>1</vote_number></vote>
  </votes>
</vote_summary>`;

const senateVoteXml = `<?xml version="1.0"?>
<roll_call_vote>
  <congress>119</congress>
  <session>2</session>
  <vote_number>2</vote_number>
  <vote_date>July 28, 2026, 10:00 AM</vote_date>
  <vote_title>On Passage</vote_title>
  <vote_result>Passed</vote_result>
  <document><document_type>S.</document_type><document_number>42</document_number></document>
  <count><yeas>1</yeas><nays>1</nays><present>0</present><absent>0</absent></count>
  <members>
    <member><first_name>Alex</first_name><last_name>Example</last_name><state>CA</state><vote_cast>Yea</vote_cast></member>
    <member><first_name>Blair</first_name><last_name>Sample</last_name><state>MS</state><vote_cast>Nay</vote_cast></member>
  </members>
</roll_call_vote>`;

async function main() {
  const requested: Array<{ limit: number; offset: number; session: number }> = [];
  const catalog = await fetchPaginatedHouseVoteCatalog({
    congress: 119,
    fetchPage: async (session, offset, limit) => {
      requested.push({ limit, offset, session });
      if (session === 1 && offset === 0) {
        return {
          houseRollCallVotes: [rawHouseVote(1, 2)],
          pagination: {
            count: 2,
            next: "https://api.congress.gov/v3/house-vote/119/1?limit=1&offset=1"
          }
        };
      }
      if (session === 1) {
        return {
          houseRollCallVotes: [rawHouseVote(1, 1)],
          pagination: { count: 2 }
        };
      }
      return {
        houseRollCallVotes: [rawHouseVote(2, 1)],
        pagination: { count: 1 }
      };
    },
    pageSize: 1,
    sessions: [1, 2]
  });

  assert.deepEqual(
    requested,
    [
      { limit: 1, offset: 0, session: 1 },
      { limit: 1, offset: 1, session: 1 },
      { limit: 1, offset: 0, session: 2 }
    ],
    "House vote pagination should follow every advertised session offset."
  );
  assert.equal(catalog.rawVotes.length, 3, "House vote pagination should preserve the same roll call across different sessions.");
  assert.deepEqual(catalog.expectedCounts, { "1": 2, "2": 1 });

  const houseVotes = catalog.rawVotes
    .map((vote) => normalizeCongressHouseVote(vote, 119, Number(vote.sessionNumber)))
    .filter((vote) => vote !== null);
  const validation = validateVoteCatalog(houseVotes, {
    congress: 119,
    expectedCounts: {
      "House:1": 2,
      "House:2": 1
    },
    minimumVoteCount: 3
  });
  assert.equal(validation.voteCount, 3);

  const parsedHouse = parseHouseClerkVoteXml(houseXml, houseVotes[0]);
  assert.equal(parsedHouse.expectedPositionCount, 2);
  assert.equal(parsedHouse.otherCount, 0);
  assert.equal(parsedHouse.vote.question, "On Passage: Fixture Act");
  assert.deepEqual(
    parsedHouse.positions.map((position) => position.position),
    ["Yes", "No"]
  );

  const senateMenu = parseSenateVoteMenu(senateMenuXml);
  assert.equal(senateMenu.length, 2);
  const parsedSenate = parseSenateVoteXml(senateVoteXml, senateMenu[0]);
  assert.equal(parsedSenate.expectedPositionCount, 2);
  assert.equal(parsedSenate.otherCount, 0);
  assert.deepEqual(parsedSenate.vote.bill, { billNumber: "42", billType: "S", congress: 119 });

  assert.throws(
    () => parseHouseClerkVoteXml(houseXml.replace("<nay-total>1</nay-total>", "<nay-total>2</nay-total>"), houseVotes[0]),
    /official totals sum to 3/,
    "Position parsing should fail closed when official totals do not reconcile."
  );

  const candidateHouse = parseHouseClerkVoteXml(
    houseXml
      .replace(
        /<totals-by-vote>[\s\S]*?<\/totals-by-vote>/,
        "<totals-by-candidate><candidate>Example</candidate><candidate-total>2</candidate-total></totals-by-candidate>"
      )
      .replaceAll("<vote>Yea</vote>", "<vote>Example</vote>")
      .replaceAll("<vote>Nay</vote>", "<vote>Example</vote>"),
    houseVotes[0]
  );
  assert.equal(candidateHouse.otherCount, 2);
  assert.deepEqual(
    candidateHouse.positions.map((position) => [position.position, position.positionLabel]),
    [
      ["Other", "Example"],
      ["Other", "Example"]
    ]
  );

  console.log("Congress vote catalog guard passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
