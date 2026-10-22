# Fact sheet: How do supply and demand set a price? (adult level)

Checked 2026-10-21. Every line in the lesson maps to a fact below. Research self-run (no sub-agent tool), 7 page
fetches, 4 sources. Quotes are as returned by the fetch tool (asked for word-for-word sentences; not re-confirmed
character by character).

## The real process

1. Buyers: the lower the price, the larger the quantity they want (law of demand). Demand curve slopes down.
2. Sellers: the higher the price, the larger the quantity they offer (law of supply). Supply curve slopes up.
3. Price above equilibrium: quantity supplied > quantity demanded (surplus). Sellers cut prices; others follow.
4. Price below equilibrium: quantity demanded > quantity supplied (shortage). Sellers see they can charge more; price rises.
5. Equilibrium: the price where quantity demanded equals quantity supplied, where the curves cross. No reason to move.
6. Shifts: more demand at every price -> shortage at the old price -> price and quantity rise. Less supply at every
   price -> higher price, lower quantity.

## Facts

| # | Fact | Source | Quote |
|---|---|---|---|
| 1 | Supply and demand is a model of how price is set in a market | Wikipedia, Supply and demand (https://en.wikipedia.org/wiki/Supply_and_demand) | "In microeconomics, supply and demand is an economic model of price determination in a market." |
| 2 | Price is set by supply and demand interacting | Britannica, Supply and demand (https://www.britannica.com/topic/supply-and-demand) | "The price of a commodity is determined by the interaction of supply and demand in a market." |
| 3 | Law of demand: price and quantity demanded move in opposite directions | OpenStax Principles of Economics 3e, 3.1 (https://openstax.org/books/principles-economics-3e/pages/3-1-demand-supply-and-equilibrium-in-markets-for-goods-and-services) | "Economists call this inverse relationship between price and quantity demanded the law of demand." |
| 4 | Demand curves slope down | OpenStax 3.1 | "Nearly all demand curves share the fundamental similarity that they slope down from left to right." |
| 5 | Law of supply: price and quantity supplied move together | OpenStax 3.1 | "Economists call this positive relationship between price and quantity supplied..." (the law of supply) |
| 6 | A higher price leads to more supplied, because it is more profitable | OpenStax 3.1 | "A rise in price almost always leads to an increase in the quantity supplied" / "the higher price makes it more profitable ... to expand their output." |
| 7 | Supply curves slope up | OpenStax 3.1 | "Nearly all supply curves, however, share a basic similarity: they slope up from left to right" |
| 8 | Above equilibrium, quantity supplied exceeds quantity demanded: a surplus | OpenStax 3.1 | "at any above-equilibrium price, the quantity supplied exceeds the quantity demanded." / "We call this an excess supply or a surplus." |
| 9 | With a surplus, sellers cut prices and others follow | OpenStax 3.1 | "some producers and sellers will want to cut prices" / "Once some sellers start cutting prices, others will follow to avoid losing sales." |
| 10 | Below equilibrium, quantity demanded exceeds quantity supplied: a shortage | OpenStax 3.1 | "When the price is below equilibrium, there is excess demand, or a shortage" |
| 11 | With a shortage, sellers see they can charge more, and price rises | OpenStax 3.1 | "recognize that they have an opportunity to make higher profits by selling what gasoline they have at a higher price." / "As a result, the price rises toward the equilibrium level." |
| 12 | Equilibrium is where the curves cross | OpenStax 3.1 | "The point where the supply curve (S) and the demand curve (D) cross ... is called the equilibrium." |
| 13 | Equilibrium price: quantity demanded equals quantity supplied | UBC Econ 101, Market equilibrium (https://econ101.sites.olt.ubc.ca/files/2014/08/MarketEqb-short.pdf) | "The equilibrium price is the price at which the quantity demanded equals the quantity supplied." |
| 14 | At equilibrium there is no reason to move | OpenStax 3.1 | "If a market is at its equilibrium price and quantity, then it has no reason to move away from that point." |
| 15 | Prices adjust until supply equals demand | Wikipedia, Supply and demand | "Here the dynamic process is that prices adjust until supply equals demand." |
| 16 | More demand: shortage at the old price, price rises, quantity supplied rises | UBC Econ 101 | "At the original price, there is now a shortage." / "The price rises, and the quantity supplied increases along the supply curve." |
| 17 | A demand shift right raises equilibrium price and quantity | Britannica | "Illustration of an increase in equilibrium price (p) and equilibrium quantity (q) due to a shift in demand (D)." |
| 18 | Less supply at every price: lower quantity, higher price | OpenStax 3e, 3.3 (https://openstax.org/books/principles-economics-3e/pages/3-3-changes-in-equilibrium-price-and-quantity-the-four-step-process) | "The new equilibrium (E1) occurs at a lower quantity and a higher price than the original equilibrium (E0)." |
| 19 | Weather affects supply; a drought shifts wheat supply back | OpenStax 3.3 | "Good weather is an example of a natural condition that affects supply." / "a drought shifts back the supply curve of wheat" |
| 20 | The supply curve assumes no single firm can set the price | Wikipedia | "The concept of a supply curve assumes that firms are perfect competitors, having no influence over the market price." |
| 21 | Curves need not be straight; linear is one common form | Wikipedia | "The two most common specifications are linear demand, e.g., the slanted line" (the other is "the smooth curve") |
| 22 | Long run differs from short run: firms enter and exit | Wikipedia | "Long run refers to a time period during which new firms enter or existing firms exit and all inputs can be adjusted fully" |

## What varies or is debated

- Real curves are estimated from data and need not be straight (21). The lesson's straight lines and numbers are made up.
- How fast prices adjust differs by market; the model describes the direction (15), not the speed.

## Common mistakes (used as wrong answers)

- "A surplus makes sellers raise prices to cover costs." Contradicted by 9.
- "The price ends at the most buyers will pay, or the least sellers will take." Contradicted by 13, 14.
- "If supply has not changed, more demand changes nothing." Contradicted by 16, 17.
- "A poor harvest means more apples sold." Contradicted by 18.

## What-ifs for Try it yourself

- Price set above equilibrium: surplus, price falls (8, 9). Below: shortage, price rises (10, 11). Tick moves price toward equilibrium (15).
- "More buyers want apples": demand shifts right, price and quantity rise (16, 17).
- "Poor harvest": supply shifts left, price rises, quantity falls (18, 19).

## Numbers and how they were worked out

- Illustrative model (made up, stated in simplified): Qd = 11 + d - P, Qs = P - 1 - s, boxes a day, $ a box.
- Computed in python: P=10: Qd 1, Qs 9. P=9: Qd 2, Qs 8 (surplus 6). P=6: 5 and 5 (equilibrium). P=3: Qd 8, Qs 2 (shortage 6). P=2: Qd 9, Qs 1.
- Shifts of 2 boxes: d=2: P 7, Q 6. s=2: P 7, Q 4. Both: P 8, Q 5.

## Lesson lines mapped to facts

- Intro: 1, 2 (stall and figures are illustrative; simplified line 1-2).
- Steps: 1 Cheaper, more buyers: 3, 4. 2 Dearer, more boxes: 5, 6, 7. 3 Price too high: 8, 9 + numbers. 4 Price too low: 10, 11 + numbers. 5 The price settles: 12, 13, 14 + numbers.
- Guesses: step 3: 8 (numbers); step 5: 13, 14.
- Parts: Price tag: 2. Buyers: 3. Seller's boxes: 5, 6. Demand curve: 4. Supply curve: 7. Surplus: 8. Shortage: 10.
- Quiz: Q1: 9. Q2: 16, 17. Q3: 18, 19.
- Sandbox: observe lines 8-11, 13-15; toggles 16-19.
- Simplified: 20, 21, 15, 22.
- Fact check: self-run, not independent (no sub-agent tool). Cold pass from grep output, 2026-10-21.
  31 lines checked: 27 SUPPORTED, 4 WEAK, 0 WRONG. Changed: step 5 "nothing pushes the price" -> "no reason to move" (14);
  simplified 1 narrowed to the seller-side assumption (20); simplified 2 "rarely straight" -> "need not be straight" (21);
  simplified 3 dropped unsourced "real markets can take much longer". Quiz 3 (frost) is an application of 18 + 19 (drought), noted as inference.
