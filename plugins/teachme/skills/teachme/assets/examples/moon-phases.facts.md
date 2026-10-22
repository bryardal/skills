# Fact sheet: Why does the Moon have phases? (kid level)

Checked 21 Oct 2026. Every line in the lesson maps to a fact below. Research was done in the main thread (no sub-agent
tool): 7 fetches (1 failed) and 3 searches, 6 sources. All quotes are as returned by the fetch tool (asked for exact sentences; not re-confirmed
word for word).

## The real process

1. The Sun lights the half of the Moon that faces it; the other half is dark (1, 6).
2. New moon: the Moon is roughly between Earth and the Sun; its dark side faces Earth (11, 8).
3. Waxing crescent, then first quarter: the Moon is at a right angle to the Sun and we see half its face lit (13, 4).
4. Waxing gibbous, then full moon: the Moon is opposite the Sun and its whole lit half faces us (12, 9).
5. Waning gibbous, last (third) quarter, waning crescent, then new moon again, about 29.5 days after the last (3, 4, 10).

## Facts

| # | Fact | Source | Quote |
|---|---|---|---|
| 1 | Half the Moon is always lit | NASA Science, Moon Phases (https://science.nasa.gov/moon/moon-phases/) | "The Moon is always half-lit by the Sun." |
| 2 | Phases = how much of the lit half we see | NASA Science | "how much we are able to see of that illuminated half changes as the Moon travels through its orbit." |
| 3 | Cycle about 29.5 days | NASA Science | "The cycle repeats about once a month (every 29.5 days)." |
| 4 | The eight phases in order | NASA Science | "new Moon, waxing crescent, first quarter, waxing gibbous," ... "full Moon, waning gibbous, third quarter, and waning crescent." |
| 5 | Moon makes no light; moonlight is reflected sunlight | NASA Science | "The Moon does not make its own light." / "'Moonlight' is actually reflected sunlight." |
| 6 | Sunlight from one direction lights one half | NASA Space Place (https://spaceplace.nasa.gov/moon-phases/en/) | "The Sun's light comes from one direction, and it always illuminates, or lights up, one half of the Moon" |
| 7 | The Moon's shape doesn't change, our view does | NASA Space Place | "The shape of the Moon isn't changing throughout the month." / "However, our view of the Moon does change." |
| 8 | New moon: side facing Earth is dark | NASA Space Place | "During the new moon, the side facing Earth is dark." |
| 9 | Full moon fully lit | NASA Space Place | "We can see the Moon completely illuminated during full moons." |
| 10 | 27.3-day orbit, 29.5 days new to new | NASA Space Place | "It takes about 27.3 days for the Moon to orbit Earth." / "it takes about 29.5 days to go from one new moon to the next new moon." |
| 11 | New moon position | Britannica, Phase (https://www.britannica.com/science/phase-astronomy) | "New moon occurs when the Moon is between Earth and the Sun, and thus the side of the Moon that is in shadow faces Earth." |
| 12 | Full moon position | Britannica | "Full moon occurs when the Moon is on the opposite side of Earth from the Sun" |
| 13 | Quarters: half lit, right angle | Britannica | "First and last quarter, in which half the Moon appears illuminated, occur when the Moon is at a right angle with respect to the Sun" |
| 14 | Crescent about 1/4, gibbous about 3/4 lit | Britannica | "crescent phases occur when about one-fourth of the Moon is illuminated" / "gibbous phases occur when about three-fourths" |
| 15 | Waxes from the right | Lunar and Planetary Institute (https://www.lpi.usra.edu/education/skytellers/moon-phases/) | "Between the new and full Moon, the amount of Moon we see grows — or waxes from its right side toward its left side." |
| 16 | Wanes right to left | LPI | "the amount of illumination decreases — or wanes — from right to left." |
| 17 | Southern Hemisphere is the other way | LPI | "In the southern hemisphere, illumination of the Moon increases from the left to the right side in the waxing phase" |
| 18 | Same phase everywhere at once | LPI | "No matter where on Earth an observer is, however, the phases of the Moon occur at the same time." |
| 19 | Misconception: Earth's shadow causes phases | Queen Victoria Museum planetarium (https://www.qvmag.tas.gov.au/files/assets/qvmag/planetarium/the-phases-of-the-moon-2.pdf) | "There is a misconception that the phases of the Moon are caused by the shadow of Earth falling onto it." |
| 20 | Lunar eclipse = Earth blocks sunlight | NASA Space Place, Eclipses (https://spaceplace.nasa.gov/eclipses/en/) | "During a lunar eclipse, Earth gets in the way of the Sun's light hitting the Moon." |
| 21 | Tilted path, no eclipse every month | NASA Space Place, Eclipses | "The Moon's path around Earth is tilted compared to Earth's orbit around the Sun." / "The Moon can be behind Earth but still get hit by light from the Sun." |
| 22 | Moon rarely exactly between at new moon | NASA Science | "the Moon doesn't usually pass directly between Earth and the Sun" |

## What varies or is debated

- Northern vs Southern Hemisphere: the lit side is flipped (17); the phase is the same (18).
- 27.3-day orbit vs 29.5-day phase cycle (10). NASA calls it "third quarter", Britannica "last quarter"; the lesson uses "last quarter".
- "Between Earth and the Sun" at new moon is approximate (22); the lesson keeps Britannica's wording (11).

## Common mistakes (used as wrong answers)

- Earth's shadow causes the phases (19; contradicted by 1, 2, 20, 21).
- The Moon really changes shape (7).
- At full moon the Moon is in Earth's shadow (21).

## What-ifs for Try it yourself

- Moving the Moon a quarter of the way round turns a new moon into a half Moon, half of the way gives a full moon (11-13).

## Numbers and how they were worked out

- Lit share of the face we see = (1 - cos p) / 2 for phase angle p (geometric model, computed in the page): 0% at
  0 deg, 25% at 60 deg, 50% at 90 deg, 75% at 120 deg, 100% at 180 deg. Matches facts 13 and 14.
- Day = p / 360 x 29.5 (steady-speed model, fact 3); first quarter at day 7.4, full at 14.75.

## Lesson lines mapped to facts

- Steps: 1 Sun lights the Moon (5, 6, 1); 2 New moon (11, 8; guess 8, 11); 3 Growing to half (2, 4, 13, 15);
  4 Full moon (12, 9; guess 9, 21, 20, 19); 5 Back to new (16, 4, 13, 3, 10).
- Parts: Sun 6; Earth 18; Moon 5, 1; Sunlight 6; Moon's path 10; Seen from Earth 15, 17.
- Quiz: Q1 1, 2, 7, 19; Q2 13, 15, 4; Q3 18, 17.
- Sandbox: phase names 4; percent and days from the model above (simplified lines 5-6); 29.5 days 3.
- Simplified: 21; 17; 10; model note.
- Fact check: self-run, not independent (cold pass over the printed lesson text, 21 Oct 2026). 31 lines checked:
  29 SUPPORTED, 2 WEAK fixed. Full-moon guess now asks what we "usually" see (the shadow choice was partly true
  during an eclipse); "Our star" cut from the Sun part (not in the fact sheet).
