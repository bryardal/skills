# Fact sheet: How does a bill become a law in the United States? (student level)

Checked 21 Oct 2026. Every line in the lesson maps to a fact below. Research was done in the main thread (no
sub-agent tool), 10 fetch attempts, 6 sources opened. The fetch tool caps quotes at 125 characters, so long
sentences are quoted in parts. Quotes marked (FT) are "as returned by the fetch tool" and were not re-fetched.

## The real process

1. A member introduces the bill. In the House: drops it in the hopper; the Clerk numbers it (H.R. ...). The bill: in the hopper.
2. The Speaker refers it to the committee for that area; the committee studies, debates and changes it. Bill: in committee; most bills stop here.
3. If released, the full House debates, amends and votes; simple majority (218 of 435) passes it. Bill: sent to the Senate.
4. Senate committee, then debate and vote; simple majority (51 of 100). Differences between versions are worked out (often a conference committee) and both chambers pass the same version. Bill: presented to the President.
5. President has 10 days (Sundays excepted): signs (law), vetoes (back to the chamber it started in), or does nothing (law after 10 days unless Congress adjourned: pocket veto).
6. Veto override: two-thirds of each chamber; then it becomes law without the President.

## Facts

| # | Fact | Source | Quote |
|---|---|---|---|
| 1 | Any House member may introduce a bill by placing it in the hopper beside the Clerk's desk | House.gov, Introduction & Referral (https://www.house.gov/the-house-explained/the-legislative-process/introduction-referral) | "Any member in the House of Representatives may introduce a bill at any time while the House is in session" / "by simply placing it in the "hopper" at the side of the Clerk's desk" |
| 2 | The Clerk numbers the bill; the Speaker refers it to the committee with jurisdiction | same | "The bill is assigned its legislative number by the Clerk and referred to the appropriate committee by the Speaker" |
| 3 | Committees cover an area of policy | same | "Each piece of legislation is referred to the committee that has jurisdiction over the area affected by the measure." |
| 4 | Committee members research, discuss and change the bill | USA.gov, How laws are made (https://www.usa.gov/how-laws-are-made) | "assigned to a committee whose members will research, discuss, and make changes to the bill." |
| 5 | Only a bill the committee releases goes on to be debated and voted on | House.gov, The Legislative Process (https://www.house.gov/the-house-explained/the-legislative-process) | "If released by the committee, the bill is put on a calendar to be voted on, debated or amended." |
| 6 | House: simple majority, 218 of 435 | same | "If the bill passes by simple majority (218 of 435), the bill moves to the Senate." |
| 7 | Senate: committee, debate, vote; simple majority 51 of 100 | same | "In the Senate, the bill is assigned to another committee and, if released, debated and voted on." / "a simple majority (51 of 100) passes the bill." |
| 8 | Both chambers must vote on the same version | USA.gov | "they must work out any differences between the two versions." / "Then both chambers vote on the same version of the bill." |
| 9 | A conference committee can work out differences | House.gov, Legislative Process | "a conference committee made of House and Senate members works out any differences" |
| 10 | The President has 10 days to sign or veto | same | "The President has 10 days to sign or veto the enrolled bill." |
| 11 | Every passed bill goes to the President, who signs it or returns it with objections | U.S. Constitution, Art. I, Sec. 7 (https://www.archives.gov/founding-docs/constitution-transcript) | "If he approve he shall sign it, but if not he shall return it, with his Objections" |
| 12 | Override: two-thirds of each House | same | "If after such Reconsideration two thirds of that House shall agree to pass the Bill" / "and if approved by two thirds of that House, it shall become a Law." |
| 13 | Unsigned after 10 days (Sundays excepted) = law, unless adjournment prevents return | same | "If any Bill shall not be returned by the President within ten Days (Sundays excepted)" / "the Same shall be a Law, in like Manner as if he had signed it," / "unless the Congress by their Adjournment prevent its Return, in which Case it shall not be a Law." |
| 14 | Revenue bills must start in the House | same | "All Bills for raising Revenue shall originate in the House of Representatives;" |
| 15 | A filibuster prolongs debate to delay or prevent a vote | Senate.gov, Filibuster and Cloture (https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm) | "action designed to prolong debate and delay or prevent a vote on a bill," |
| 16 | Cloture (ending debate) takes 60 of 100 senators | same | "to three-fifths of all senators duly chosen and sworn, or 60 of the 100-member Senate." |
| 17 | Overrides are rare: 112 of 2,599 vetoes overridden (all presidents) | Senate.gov, Summary of Bills Vetoed (https://www.senate.gov/legislative/vetoes/vetoCounts.htm) | Table totals: "Total vetoes: 2599", "Overridden: 112" (FT) |
| 18 | 118th Congress: 19,315 bills and resolutions; 91% had no further action after introduction or committee report; about 3% enacted (including by incorporation) | GovTrack, Statistics and Historical Comparison (https://www.govtrack.us/congress/bills/statistics) | "introduced or reported by committee but did not have further action" 91%; enacted incl. incorporation 3% (FT) |
| 19 | Congress can vote to override a veto | USA.gov | "in most cases Congress can vote to override that veto and the bill becomes a law." |
| 20 | Pocket vetoes exist and are counted separately | Senate.gov veto counts | "H.R.4042 (98th Congress) is counted as a pocket veto." (FT) |

## What varies or is debated

- A bill can start in either chamber (fact 8 implies both orders); revenue bills must start in the House (14).
- Real thresholds can change with absences; the lesson assumes every member votes (house.gov uses 218 of 435, 51 of 100).
- In the Senate most contested bills need 60 votes to end debate first (15, 16). Ties and the Vice President are left out.

## Common mistakes (used as wrong answers)

- "Most bills become law." Only about 3% did in 2023-24 (18).
- "Once the House passes it, the President can sign it." The Senate must pass the same version (8, 11).
- "A veto is final." Two-thirds of both chambers can override (12, 19).
- "If the President does nothing, the bill dies." It becomes law after 10 days unless Congress adjourned (13).

## What-ifs for Try it yourself

- House yes < 218: the bill fails in the House (6). Senate yes < 51: fails in the Senate (7).
- Both pass, no veto: becomes law (11). Veto: law only with 290 House and 67 Senate yes votes (12, numbers below).

## Numbers and how they were worked out

- Computed in python: majority 435//2+1 = 218, 100//2+1 = 51; two-thirds ceil(435*2/3) = 290, ceil(200/3) = 67.
- Overrides 112/2599 = 4.3%. Meter marks 218/435 = 0.501, 290/435 = 0.667. Example votes 260 of 435 and 60 of 100 are made up.

## Lesson lines mapped to facts

- Steps: 1 Introduce (1, 2); 2 Committee (2, 3, 4, 5; guess 18); 3 House (5, 6); 4 Senate (7, 8; guess 8, 9); 5 President (10, 11, 12).
- Parts: Hopper (1); Committee (3, 4); House (6); Senate (7, 15, 16); President (11, 12).
- Intro and idea: (6, 7, 8, 11, 12, 13).
- Quiz: Q1 (7, 8, 11); Q2 (12, numbers); Q3 (13).
- Sandbox: (6, 7, 11, 12, numbers).
- Simplified: made-up bill (none needed); all members vote (6, 7); starts in either chamber, revenue in House (8, 14); left out Senate committee, conference, filibuster (7, 9, 15, 16); pocket veto (13, 20); ties left out.
- Fact check: self-run, not independent (see bottom).

## Fact check: self-run, not independent (21 Oct 2026)

Cold pass over the lesson text (intro, 5 captions, 5 parts, 2 guesses, 3 quiz questions, sandbox lines, 5 simplified, idea): 31 lines SUPPORTED, 4 WEAK, 0 WRONG before fixes.
- WEAK: guess why said "sent back by a committee"; source says "reported by committee". Now "released by a committee".
- WEAK: "Only about 3% became law" counts bills enacted by incorporation (1% directly). Now says "counting those folded into other bills".
- WEAK: committee part gave unsourced example areas ("farms or schools"). Now "one area of policy".
- WEAK: "Bills that raise taxes" vs source "Bills for raising Revenue". Now "raising revenue (taxes)".
- Removed an unsourced Senate tie / Vice President sandbox message; ties now listed in simplified.
- Facts 17, 18 and 20 rest on quotes as returned by the fetch tool (table values), not re-fetched word for word.
