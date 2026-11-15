/**
 * Article anglais : sync-sante-biomarqueurs
 *
 * Source francaise : STATIC_FALLBACK_ARTICLES dans src/utils/wordpress.ts.
 * Le HTML doit rester structurellement identique a la version francaise
 * (memes balises, memes images, meme tableau, meme FAQ de 6 questions).
 */
import type { OptibilanArticle } from '@/utils/wordpress';

export const article: OptibilanArticle = {
  slug: `sync-sante-biomarqueurs`,
  title: `Syncing Apple Health, Oura and Garmin`,
  excerpt: `Syncing Apple Health, Oura and Garmin into a single client record: what each source really contributes, how to centralize it, and the mistakes that create duplicates.`,
  content: `<p>Syncing Apple Health, Oura and Garmin into a single record is not about stacking three apps, it is about getting one reliable reading of a patient's tracking. In practice, each source contributes a different type of data, and duplicates quickly blur the picture. A record where sleep appears three times with three different values serves neither the professional nor the patient. Useful syncing therefore rests on clear rules: one source per measured metric, the same reading frequency, and a single document that stays readable during the session. Here is the method, applied step by step to the three most widely used platforms.</p>
<figure>
<img src="/images/product/02-mobile-nutrition.webp" alt="Health data syncing from several mobile devices" loading="lazy" decoding="async" width="1000" height="632" />
<figcaption>Each source contributes its own metric: the job of the record is to make them complementary.</figcaption>
</figure>
<h2>Syncing Apple Health, Oura and Garmin: one source per metric</h2>
<p>Apple Health works as an aggregation layer rather than as a measurement source. It gathers steps, heart rate, sleep and activity from the apps installed on the phone, which makes it an excellent point of convergence. The <a href="https://developer.apple.com/health-fitness/">Apple developer documentation</a> states that each data type carries a distinct identifier, which tells you precisely where each value comes from and which app recorded it. Oura, for its part, is the richest source for sleep and recovery, with proprietary sleep and recovery scores. Garmin remains the reference for training load and heart rate variability, measured by its chest strap. None of these devices fully replaces another.</p>
<p>The simplest rule is to assign one source to each measured metric and never let two apps write the same data. Sleep comes from a single device, training load from another, and context data from a third. That split immediately removes most of the inconsistencies you see in unsynced records, because a duplicate is never compared with itself. The <a href="https://www.cnil.fr/fr/la-protection-des-donnees-personnelles">CNIL recommendations</a> on data minimization argue the same way: collect only what actually serves the coaching. A duplicated data point adds nothing and yet increases the risk of disagreement between the values displayed.</p>
<p>The second rule concerns the frequency at which the data is read. Data read at three-hour intervals loses its clinical value, whereas data read every week is more than enough to follow a trend. These indicators are designed to be read over long periods: heart rate variability, training load, weight curve. A professional who looks every day at values designed for monthly review ends up interpreting statistical noise. A weekly reading aligned with the check-in structures the coaching and prevents over-interpretation from creeping in.</p>
<h2>What each platform really contributes</h2>
<p>Each platform excels in a distinct area, and that complementarity is the heart of syncing. Oura provides the best reading of recovery and sleep, with proprietary scores that stay consistent over time. Garmin brings the most reliable measurement of training load and heart rate variability, because its chest strap is the most accurate on the consumer market. Apple Health compiles everything, which is useful for simple indicators: steps, calories, screen time, weight. None of these three contributions should be ignored in favor of another, because each one covers a part of the picture the others miss.</p>
<p>The practical consequence is that a synced record saves you from copying figures by hand from one app to another. Sleep indicators come from Oura, load from Garmin, and overall activity from Apple Health, which leaves the professional time to analyze instead of time to type. <a href="https://www.garmin.com/fr-FR/software/health/">Garmin health software</a> exports data in usable formats, which avoids unreadable screenshots. This mechanization frees up session time, which is the scarcest resource in professional coaching. The patient no longer has to open three different apps and read out three dashboards during the check-in either.</p>
<p>One point of caution concerns units and conventions. Each platform uses different thresholds to call sleep good or bad, and each sensor applies its own smoothing method. A direct comparison between a recovery score and a sleep score is meaningless, and presenting it to the patient creates confusion rather than clarity. The rule is simple: compare values from the same platform over time, and never compare two different platforms with each other. That discipline prevents most of the false conclusions that these dashboards produce on their own.</p>
<table>
<thead>
<tr><th>Metric</th><th>Reference source</th><th>Reading frequency</th></tr>
</thead>
<tbody>
<tr><td>Sleep and recovery</td><td>Oura</td><td>Weekly</td></tr>
<tr><td>Training load</td><td>Garmin</td><td>Weekly</td></tr>
<tr><td>Heart rate variability</td><td>Garmin</td><td>Weekly</td></tr>
<tr><td>Steps, activity, weight</td><td>Apple Health</td><td>Weekly</td></tr>
<tr><td>Resting heart rate</td><td>A single source</td><td>Monthly</td></tr>
<tr><td>Nutrition and self-reported sleep</td><td>Direct input</td><td>At every check-in</td></tr>
</tbody>
</table>
<h2>Health data syncing without creating duplicates</h2>
<figure>
<img src="/images/product/04-mobile-progression.webp" alt="Tracking record bringing together sleep, training load and activity" loading="lazy" decoding="async" width="1000" height="712" />
<figcaption>A single record lets you compare trends without fighting duplicates.</figcaption>
</figure>
<p>Centralization means importing every source into a single document, keeping the date, the unit and the original source for every line. That provenance column is what prevents later misunderstandings: everyone knows where a value comes from and in what context it was measured. Manual import remains possible, but it should be reserved for self-reported data, the data the patient sends that no device can measure. <a href="https://www.legifrance.gouv.fr/">Official recommendations</a> state that health data must be kept for a limited and documented period, which means knowing exactly what you keep, for how long, and why.</p>
<p>Import frequency follows the tracking cycle. A weekly import is enough to follow a training block, and a monthly import suits long-term maintenance. Beyond that, granularity adds nothing and needlessly weighs down the record. A professional who imports every day ends up no longer reading their own data, which cancels the whole point of automating the record in the first place. A fixed rule, announced to the patient, prevents that drift and ensures the record stays readable six months later.</p>
<p>Handling discrepancies deserves an explicit procedure. When two sources diverge, neither is automatically wrong: they measure slightly different things with different methods. The right course is to keep the reference source you chose, note the gap in the record, and only comment on it once it becomes a trend. That discipline protects the record from a flood of contradictory interpretations and keeps the clinical message consistent. Above all, it prevents you from correcting the patient on a measurement that was never about them.</p>
<figure>
<img src="/images/product/04-mobile-progression.webp" alt="Trend curves for sleep, training load and recovery" loading="lazy" decoding="async" width="1000" height="712" />
<figcaption>Each source feeds a different curve: the record only has value if the curves are comparable over time.</figcaption>
</figure>
<h2>Structuring the record around the three sources</h2>
<p>A synced record is built as a set of three distinct entries rather than as one long list of numbers. The first entry describes the source: device, app and start date of use. That provenance line accompanies every data series and prevents a device change from being read as a change in health status. The second entry describes the measured metric, with its unit and acquisition frequency. The third entry describes the period covered, which makes an average calculation possible without mixing weeks when the athlete was not wearing the device.</p>
<p>This three-entry structure is what lets you slice the record later. You can compare an indicator over six months, exclude injury weeks, or check the quality of a series whose value looks aberrant. Without that structure, these operations require tedious manual work and calculation errors multiply quickly. Separating the entries turns the record into a usable base rather than an archive of screenshots. That difference comes entirely from how the data is recorded at the start.</p>
<p>A final point concerns device changes, which happen more often than you would think. A patient who replaces their Garmin watch with another sensor abruptly changes heart rate variability values, even though their physiological state has not changed. The record must therefore contain a dedicated line for that change, with the date of the switch and the new source. That line prevents the error of reading a technical break as a clinical change. It also reminds you that the reference you chose is a decision, not a given, and that it can be revised.</p>
<h2>Reading the data in session without drowning the patient</h2>
<p>A data record only has value if it is readable during the session, and not in a spreadsheet opened between two appointments. Presenting the record to the patient always follows the same order: the reported context, then the objective data, then the interpretation and the decisions. That order prevents burying the person under figures before they have said their own words. The indicators you keep are limited to three or four per milestone, chosen for the goal of the coaching rather than for what the record contains. The rest stays available in the record, but is not presented during the session.</p>
<p>Resting heart rate illustrates the value of that selection. It changes slowly, reads over several weeks, and moves little from one session to the next. Presenting it at every appointment creates an anxious reading for a two-beat variation. The same data, read over a quarter and paired with training load, becomes an interpretable indicator. The professional's role is to choose the right time step for each metric, and not to show everything at once. <a href="https://www.inserm.fr/">Inserm research</a> on heart rate variability also reminds us that data only means something alongside its effort and recovery context.</p>
<p>Finally, presenting a shared record strengthens the patient's ownership of decisions. Seeing your own data, then understanding the decision that follows, turns an instruction into a participatory choice. That transparency is the best way to obtain lasting adherence, far more effective than a reminder repeated in session. It only requires explanations to stay accessible, without technical jargon or undefined acronyms, so the patient can follow the reasoning. The record documents, the session explains, and the patient decides with the professional. That combination is what gives an instrumented follow-up its value.</p>`,
  category: `sante`,
  categoryLabel: `Health`,
  author: `Dr. Pierre Lambert`,
  authorRole: `Sports physician`,
  date: `2024-01-02`,
  readTime: `9 min`,
  featured: false,
  featuredImage: `/images/product/02-mobile-nutrition.webp`,
  featuredImageAlt: `Health data syncing on mobile`,
  seoTitle: `Syncing Apple Health, Oura and Garmin in one record`,
  seoDescription: `How to sync Apple Health, Oura and Garmin: complementary sources, reading frequency and duplicate management.`,
  seoKeywords: [`syncing Apple Health, Oura and Garmin`, `health data syncing`, `biomarker record`],
  tags: [`health`, `biomarkers`, `data`, `client-record`],
  sources: [
    { label: `Apple, HealthKit documentation`, url: `https://developer.apple.com/health-fitness/` },
    { label: `Garmin, health software`, url: `https://www.garmin.com/fr-FR/software/health/` },
    { label: `CNIL, health data protection`, url: `https://www.cnil.fr/fr/la-protection-des-donnees-personnelles` },
  ],
  faq: [
    { q: `Can you sync Apple Health, Oura and Garmin at the same time?`, a: `Yes, provided you assign one source to each measured metric. Sleep comes from Oura, training load from Garmin, overall activity from Apple Health. Never let two apps write the same data, otherwise the gaps become impossible to interpret.` },
    { q: `Why do the sleep scores of two devices differ?`, a: `Each manufacturer applies its own detection method and its own thresholds. These values are not designed to be compared across platforms. Always compare a source with itself over time, and never use two different scores to discuss the same metric.` },
    { q: `How often should you import data into the record?`, a: `A weekly import is enough for intensive coaching, and a monthly import for maintenance. Importing every day produces more data without more information. Set the frequency, tell the patient, and stick to it.` },
    { q: `How do you handle a gap between two sources that contradict each other?`, a: `Keep the reference source you chose, note the gap in the record and only comment on it once it becomes a trend. Neither value is automatically wrong, because each measures with its own method. Commenting on an isolated gap creates confusion, not information.` },
    { q: `Which data should you not try to sync?`, a: `Self-reported data: nutrition, perceived sleep, pain, life context. No device measures them, and manual entry remains the only way to collect them. Yet they are often more important than self-tracking indicators for steering the coaching.` },
    { q: `Can a biomarker record be shared with the patient?`, a: `Yes, and it is even recommended: the record should be shareable, password-protected and accessible to the patient. Transparency about data strengthens ownership of decisions and improves adherence. Collection must stay proportionate to the purpose pursued, in line with data protection rules.` },
  ],
};
