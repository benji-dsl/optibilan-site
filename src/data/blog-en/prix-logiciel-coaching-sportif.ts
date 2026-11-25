/**
 * English article: prix-logiciel-coaching-sportif
 *
 * French source: src/data/blog-fr/prix-logiciel-coaching-sportif.ts.
 * The HTML must stay structurally identical to the French version
 * (same tags, same images, same table, same FAQ with 6 questions).
 */
import type { OptibilanArticle } from '@/utils/wordpress';

export const article: OptibilanArticle = {
  slug: `prix-logiciel-coaching-sportif`,
  title: `What sports coaching software really costs in 2026`,
  excerpt: `The listed price of sports coaching software is never the real cost. Billing models, hidden options, cost per person you follow and the break-even point.`,
  content: `<p>The price of sports coaching software on a pricing page almost never matches what a year actually costs. Between the base subscription, the add-ons unlocked along the way, the cap on active records and the time spent working around the gaps, the difference often reaches twice the listed rate. That observation points at no vendor in particular: it describes a billing mechanism. A tool is compared on its total cost per person you follow, never on its entry price. The sections below set out the three market models, what sits behind a low rate, the calculation to apply and the volume at which a subscription becomes profitable.</p>
<h2>Sports coaching software: the listed price is never the real cost</h2>
<p>A subscription at 29 euros a month looks modest next to a studio's activity. It changes nature when it only covers ten active records while you follow thirty. The listed price describes a way in, not an expense. The useful comparison relies on three ratios: cost per person followed, cost per report produced and cost per hour saved. Those three figures take ten minutes to work out and say more than a whole page of pricing. A tool whose rate rises stays acceptable if it saves time, and a cheap tool can cost a lot in manual work.</p>
<figure>
<img src="/images/product/dashboard-coach.webp" alt="Practitioner dashboard showing active follow-up records and the month's deadlines" loading="lazy" decoding="async" width="1000" height="750" />
<figcaption>A practitioner's dashboard brings together active records and the month's deadlines.</figcaption>
</figure>
<p>The first cost layer is the subscription, the one everybody looks at. The second gathers the options: data export, document branding, automations, extra accounts and priority support. The third layer appears on no invoice, and it covers the time spent copying information from one tool to another. That invisible layer often weighs more than the other two, because it repeats every week. Software that forces you to retype the same data into a spreadsheet does not save time, it moves the effort. Any honest calculation therefore has to include an hourly value, even an approximate one.</p>
<p>Published rates remain orders of magnitude: a few dozen euros a month for individual use, several hundred for a structure with several practitioners. Those ranges mean nothing until they are divided by a volume of people followed. Two practitioners can pay the same price and end up with a unit cost three times apart. The decisive variable is not the subscription, it is the number of records genuinely active. An offer at 49 euros covering fifteen people followed comes down to 3.27 euros per person per month. That is the scale at which the decision becomes readable.</p>
<h2>Three billing models: per person followed, by tier and per seat</h2>
<p>The per-person model bills each active record, usually monthly. It offers immediate clarity: the invoice follows real activity, with no sudden jump. It also has a classic flaw, the dormant records that stay active and keep being counted. A follow-up that ended but was never archived weighs on the total without producing anything. The question to ask before signing is therefore about the exact definition of an active record. A serious vendor answers with a written rule, not with a sales promise.</p>
<p>The tier model bills a volume band rather than an exact count. It stays comfortable as long as you sit below the threshold, then it produces an invoice jump when you cross it. Moving from twenty to twenty-one people followed can double the monthly amount in some grids. That mechanism is defensible, since a platform has a real cost, but it forces you to watch your volume. The right habit is to know the next threshold and decide in advance what you will do when you reach it. A threshold crossed by accident always costs more than a threshold anticipated.</p>
<p>The per-seat model bills practitioner accounts, regardless of how many people are followed. It suits structures that hire, because the cost becomes predictable as the team grows. It penalises small structures that need a few occasional accesses, a partner, a trainee, a locum. Many vendors mix the three logics inside a single grid, with a seat base and a cap on records. That combination makes two offers hard to compare, and it is often the intended effect. Rewriting every grid in a table, line by line, remains the only honest way to compare.</p>
<h2>What a low monthly subscription leaves out of the picture</h2>
<p>A low monthly subscription almost always hides a limit on volume, storage or history. The most frequent constraint is the number of simultaneously active records. Next comes the depth of history, with data kept for twelve months and then truncated. Those limits do not bother a practitioner who is starting, they become blocking in the second year. A long follow-up is told through curves, and a curve without history proves nothing. The point to check fits in one sentence: how long do your data stay readable and exportable.</p>
<figure>
<img src="/images/product/04-mobile-progression.webp" alt="Progress curves shown on a phone with the history of the last few months of follow-up" loading="lazy" decoding="async" width="1000" height="712" />
<figcaption>A curve without history proves nothing: data depth is part of what you pay for.</figcaption>
</figure>
<p>The second blind spot is the options billed separately. Report export, branding, automatic reminders, full mobile access and phone support often sit outside the entry rate. The list varies from one vendor to the next, which makes it hard to anticipate. Ask for the full grid, options included, before starting a trial. A written quote is worth more than a marketing page, even when you have to insist to get it. The <a href="https://www.economie.gouv.fr/dgccrf">DGCCRF</a>, the French consumer and competition authority, states that a price must be announced clearly, compulsory add-ons included.</p>
<p>The third point is the price revision during the contract. A low rate announced in January can be revised in June if the terms and conditions allow it. Read the revision clause before signing, not after the first increase. Notice matters as much as the amount: thirty days leave room to compare, no notice leaves room to pay. Finally, an annual commitment is only interesting when it is genuinely discounted. Two months offered out of twelve amount to a discount of about 17 percent, which stays modest but real.</p>
<h2>Calculating your total cost per person followed</h2>
<p>The calculation is a single division, provided the right terms go into it. Add the monthly subscription, the average of the options you use and the value of the time spent on unproductive handling. Divide the total by the number of people genuinely followed during the month. The result gives a unit cost you can compare across tools. That figure is not there to pick the cheapest one, it tells you what you pay for each person you support. A gap of two euros per person becomes significant at fifty records.</p>
<table>
<thead>
<tr><th>Model</th><th>Unit billed</th><th>Example formula</th><th>Main risk</th></tr>
</thead>
<tbody>
<tr><td>Per person followed</td><td>Active record</td><td>Price divided by people followed</td><td>Dormant records still billed</td></tr>
<tr><td>By tier</td><td>Volume band</td><td>Tier price divided by real volume</td><td>Invoice jump at the threshold</td></tr>
<tr><td>Per seat</td><td>Practitioner account</td><td>Seat price multiplied by practitioners</td><td>Read-only accounts billed</td></tr>
<tr><td>Usage based</td><td>Reports or messages consumed</td><td>Real consumption for the month</td><td>A busy month that is hard to predict</td></tr>
</tbody>
</table>
<p>Take the rates published by Optibilan to make the calculation concrete: 49 euros a month for Solo, 99 euros for Studio and 199 euros for Cabinet, covering up to 30, 150 and unlimited people followed respectively. With fifteen people followed on the 49 euro offer, the unit cost reaches 3.27 euros a month. With forty-five people on the 99 euro offer, it stays at 2.20 euros. With a hundred and twenty people on the 199 euro offer, it drops to 1.66 euros. Those amounts remain in the same zone, which signals a coherent grid rather than a trap threshold. Annual payment adds two months free, so a lower smoothed monthly cost for the same service.</p>
<p>The total cost is then read in two steps. Compare the unit cost of each option at constant volume, then project it onto next year's volume. A grid that stays flat from fifteen to fifty people protects your margin while you grow. A grid that doubles at the twenty mark forces you to raise your prices at the worst moment. The <a href="https://www.insee.fr/">INSEE</a>, the French statistics institute, publishes the consumer price index every month, useful to place an increase in context. A vendor raising prices by 3 percent a year follows inflation, a vendor raising them by 30 percent changes model.</p>
<h2>A free trial says almost nothing about the yearly cost</h2>
<p>A free trial tests ergonomics, adoption and support quality over a few weeks. It tests neither the cost at next year's volume, nor the way out of the tool. Thirty days are enough to check whether you open the app without effort on Monday morning. They are not enough to measure the effect on the loyalty of the people you follow. The trial period should therefore measure three precise things, not wander through the interface at random. A trial without a protocol ends in a decision made on impression, which amounts to drawing lots.</p>
<figure>
<img src="/images/product/07-utilisatrice-50ans-lifestyle.webp" alt="Person followed reviewing her personal space and history from home" loading="lazy" decoding="async" width="1000" height="713" />
<figcaption>The personal space read from home: that continuity is what a trial must assess, not only the interface.</figcaption>
</figure>
<p>The Optibilan free trial lasts thirty days, with no card. The absence of a card changes the nature of the trial, because the decision to pay becomes an explicit choice again. Over those thirty days, three measurements are enough: the time needed to create a full report, the number of manual reminders avoided and the quality of the document sent. Write those three values down in the first week, then in the fourth. The gap between the two measurements says more than any sales demonstration. That gap is what justifies moving to a paid plan, or not.</p>
<p>Before the trial ends, ask the vendor three questions. Can the price change during the year, and with what notice. What happens if you go over the planned volume. How do you get your data back if you leave, and in what format. A complete export in open files is the only serious guarantee, because it makes leaving possible. The <a href="https://www.cnil.fr/">CNIL</a>, the French data protection authority, reminds us that data portability is one of the rights of the person concerned. A tool you cannot leave is not chosen, it is endured.</p>
<h2>The point at which a paid tool becomes profitable</h2>
<p>A subscription becomes profitable when the time saved exceeds its cost, valued at your hourly rate. Count the hours spent each month producing reports, chasing reminders and hunting for scattered information. Multiply by the value of your working hour. Compare the result with the price of the subscription, then run the calculation again with the time left once the tool is in use. If the gap is smaller than the price, the tool costs you money. That reasoning avoids two symmetrical mistakes: paying for an unused tool, and working for free to save fifteen euros.</p>
<p>The threshold depends mostly on your organisation, not on how many people you follow. A practitioner producing reports by hand often spends an hour to an hour and a half per record. At forty euros an hour, ten records already represent 400 to 600 euros of unbilled time. A subscription at 99 euros a month then becomes an economic obviousness, even without growth. The hourly rate you use must be net of social contributions, and <a href="https://www.urssaf.fr/">URSSAF</a> publishes the rates that apply to self-employed workers. Conversely, three people followed and one report per quarter do not justify the largest offer.</p>
<p>Three signals show that the threshold has been crossed. You copy the same information into two places at least once a week. You postpone producing a report because formatting takes too long. You cannot answer in ten seconds when asked about the progress of a person you follow. When those three signals appear together, the cost of the status quo already exceeds the subscription. The right question is therefore not the price of the tool, but the price of the current organisation. A well-chosen paid tool does not only reduce time, it makes the follow-up transferable to a partner or a locum.</p>`,
  category: `business`,
  categoryLabel: `Business`,
  author: `Benjamin Sant`,
  authorRole: `Founder of Optibilan`,
  date: `2026-11-16`,
  readTime: `9 min`,
  featured: false,
  featuredImage: `/images/product/dashboard-coach.webp`,
  featuredImageAlt: `Dashboard of the Optibilan sports coaching software`,
  seoTitle: `What sports coaching software really costs in 2026`,
  seoDescription: `Listed price, add-ons, tiers and hidden time: how to work out the real cost of sports coaching software, per person you follow.`,
  seoKeywords: [`sports coaching software`, `monthly subscription`, `free trial`, `total cost`],
  tags: [`software`, `pricing`, `subscription`, `business`],
  sources: [
    { label: `URSSAF: social contributions for self-employed workers`, url: `https://www.urssaf.fr/` },
    { label: `DGCCRF: consumer information on prices`, url: `https://www.economie.gouv.fr/dgccrf` },
    { label: `INSEE: consumer price index`, url: `https://www.insee.fr/` },
    { label: `CNIL: right of access and data portability`, url: `https://www.cnil.fr/` },
  ],
  faq: [
    { q: `How much does sports coaching software cost each month?`, a: `Market offers range from a few dozen to several hundred euros a month, depending on volume and on the number of practitioners. At Optibilan, Solo is 49 euros, Studio 99 euros and Cabinet 199 euros a month. Annual payment adds two months free. The only figure that matters remains the cost per person followed.` },
    { q: `Is a monthly subscription more expensive than annual payment?`, a: `Yes, most grids discount the annual commitment. Two months offered out of twelve amount to a discount of about 17 percent. The saving only makes sense if the tool is genuinely adopted within the first three months. An annual commitment signed during a trial turns a hesitation into a constraint.` },
    { q: `What should you measure during a free trial?`, a: `Three things: the time needed to create a full report, the number of manual reminders avoided and the quality of the document sent to the person you follow. Measure those values in the first week, then in the last. The gap between the two tells you whether the tool settles into your routine. A trial without measurement ends on an impression.` },
    { q: `How do you calculate the total cost of a tool over twelve months?`, a: `Add the subscription, the options you genuinely use and the value of the handling time. Multiply by twelve, then deduct any annual discount. Finally divide by the number of people followed during the year to obtain a comparable unit cost. That figure, not the monthly price, is what lets you compare two offers.` },
    { q: `From how many people followed does a subscription become profitable?`, a: `There is no single threshold, because profitability depends on the time saved per record. A practitioner spending an hour per report and following ten people a month crosses the threshold within the first weeks. A practitioner following three people with one report per quarter can wait. The calculation is made per record, then multiplied by your volume.` },
    { q: `Can you change tools without losing the follow-up history?`, a: `It depends only on the quality of the export. A complete export in open files lets you rebuild the curves and keep the reports. A partial export, limited to a table of measurements, loses the context of the interviews. The export question has to be asked before subscribing, never after.` },
  ],
};
