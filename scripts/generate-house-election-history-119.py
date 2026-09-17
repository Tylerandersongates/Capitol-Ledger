#!/usr/bin/env python3
"""Build the reviewed 119th Congress House election snapshot from House Clerk files.

Usage: python3 scripts/generate-house-election-history-119.py MemberData.xml Terms_of_Service.pdf
Requires pdfplumber. Download both files from the URLs recorded in the output metadata.
The generated JSON is reviewed and committed; this script never fetches live data.
"""

import calendar
from datetime import date, datetime
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET

import pdfplumber


MEMBER_DATA_URL = "https://clerk.house.gov/xml/lists/MemberData.xml"
TERMS_URL = "https://clerk.house.gov/member_info/Terms_of_Service.pdf"
OUTPUT = Path("data/house-first-elected-119.json")
VOTING_STATES = set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split())

# The PDF uses short names or footnote numbers for these otherwise unique people.
PDF_NAME_OVERRIDES = {
    ("Wasserman", "FL"): "W000797",  # Wasserman Schultz
    ("Foster1", "IL"): "F000454",
    ("Case2", "HI"): "C001055",
    ("Kiley3", "CA"): "K000401",
}

# Verified exceptions to using the federal November general election date.
# F000454/C001055/S001188 first won specials before later returning to the House.
# H001077/J000299 first won Louisiana's December 2016 runoff.
DATE_OVERRIDES = {
    "F000454": ("2008-03-08", "https://history.house.gov/People/Listing/F/FOSTER,-Bill-(F000454)/"),
    "C001055": ("2002-11-30", "https://history.house.gov/People/Detail/11776"),
    "S001188": ("2010-11-02", "https://history.house.gov/People/Detail/22629"),
    "H001077": ("2016-12-10", "https://clerk.house.gov/member_info/electionInfo/2016/statistics2016.pdf"),
    "J000299": ("2016-12-10", "https://clerk.house.gov/member_info/electionInfo/2016/statistics2016.pdf"),
}


def normalize_name(value):
    value = unicodedata.normalize("NFKD", value)
    return re.sub(r"[^a-z]", "", value.encode("ascii", "ignore").decode().lower())


def federal_general_election(year):
    """Tuesday following the first Monday in November (2 U.S.C. § 7)."""
    first_monday = 1 + (calendar.MONDAY - date(year, 11, 1).weekday()) % 7
    return date(year, 11, first_monday + 1).isoformat()


def clerk_members(xml_path):
    root = ET.parse(xml_path).getroot()
    assert root.findtext("./title-info/congress-num") == "119"
    members = []
    for member in root.findall("./members/member"):
        info = member.find("member-info")
        members.append({
            "id": info.findtext("bioguideID"),
            "last": info.findtext("lastname"),
            "state": info.find("state").attrib["postal-code"],
            "prior": info.findtext("prior-congress"),
            "elected": info.find("elected-date").attrib["date"],
        })
    return root.attrib["publish-date"], members


def service_rows(pdf_path):
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for raw in table:
                    cells = [str(cell).strip() for cell in raw if cell is not None and str(cell).strip()]
                    if len(cells) == 7 and cells[2].isdigit() and cells[3] in VOTING_STATES:
                        rows.append(cells)
    return rows


def main(xml_path, pdf_path):
    published, members = clerk_members(xml_path)
    by_name = {}
    for member in members:
        key = (normalize_name(member["last"]), member["state"])
        by_name.setdefault(key, []).append(member)

    result = {}
    for last, first, _terms, state, _party, congresses, service_start in service_rows(pdf_path):
        override_id = PDF_NAME_OVERRIDES.get((last, state))
        candidates = ([member for member in members if member["id"] == override_id]
                      if override_id else by_name.get((normalize_name(last), state), []))
        if len(candidates) != 1:
            raise ValueError(f"Unmatched or ambiguous Clerk row: {last}, {first}, {state}: {candidates}")
        member = candidates[0]
        member_id = member["id"]
        if member_id in result:
            raise ValueError(f"Duplicate Bioguide ID: {member_id}")

        if member["prior"] == "0":
            first_elected = datetime.strptime(member["elected"], "%Y%m%d").date().isoformat()
            basis = "clerk_member_data_first_term"
        elif member_id in DATE_OVERRIDES:
            first_elected, _source = DATE_OVERRIDES[member_id]
            basis = "verified_exception"
        elif ";" not in congresses and not service_start.startswith("January 3,"):
            first_elected = datetime.strptime(service_start, "%B %d, %Y").date().isoformat()
            basis = "clerk_terms_special"
        else:
            first_congress = int(re.search(r"\b(\d+)(?:st|nd|rd|th)\b", congresses).group(1))
            first_service_year = 1789 + 2 * (first_congress - 1)
            first_elected = federal_general_election(first_service_year - 1)
            basis = "clerk_terms_regular_inferred"

        result[member_id] = {"firstElectedDate": first_elected, "basis": basis}

    if len(result) != 433:
        raise ValueError(f"Expected 433 voting Representatives, found {len(result)}")
    if result["B001323"]["firstElectedDate"] != "2024-11-05":
        raise ValueError("Begich cross-check failed")
    output = {
        "congress": 119,
        "memberDataPublished": published,
        "sources": {
            "memberData": MEMBER_DATA_URL,
            "termsOfService": TERMS_URL,
            "federalGeneralElectionRule": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title2-section7&num=0&edition=prelim",
            "exceptions": {member_id: source for member_id, (_date, source) in DATE_OVERRIDES.items()},
        },
        "sourceSha256": {
            "memberData": hashlib.sha256(Path(xml_path).read_bytes()).hexdigest(),
            "termsOfService": hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest(),
        },
        "members": dict(sorted(result.items())),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, indent=2) + "\n")
    print(f"Wrote {len(result)} House members to {OUTPUT}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
