import Stripe from 'stripe';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const key = process.env.STRIPE_SECRET_KEY || '';
if (!/^(sk|rk)_test_/.test(key)) throw new Error('Clé Stripe TEST obligatoire.');
const stripe = new Stripe(key);
const proof = { mode: 'test', startedAt: new Date().toISOString(), invoices: [] };
let clock;
const waitReady = async () => {
  for (let i = 0; i < 60; i++) {
    const state = await stripe.testHelpers.testClocks.retrieve(clock.id);
    if (state.status === 'ready') return;
    if (state.status !== 'advancing') throw new Error('Horloge de test en échec.');
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Horloge de test trop lente.');
};
try {
  const previous = await stripe.subscriptions.retrieve('sub_1UfUipPW7mUgtINVxWDq1DjV');
  assert.equal(previous.livemode, false);
  const promo = (await stripe.promotionCodes.list({code:'BETA3MOIS',active:true,limit:1})).data[0];
  assert.ok(promo && !promo.livemode);
  clock = await stripe.testHelpers.testClocks.create({frozen_time:Math.floor(Date.now()/1000),name:'OPTIBILAN trois mois puis renouvellement TEST'});
  const customer = await stripe.customers.create({test_clock:clock.id,name:'Recette renouvellement OPTIBILAN',payment_method:'pm_card_visa',invoice_settings:{default_payment_method:'pm_card_visa'}});
  let sub = await stripe.subscriptions.create({customer:customer.id,items:[{price:previous.items.data[0].price.id}],discounts:[{promotion_code:promo.id}],expand:['latest_invoice']});
  proof.subscriptionId = sub.id;
  for (let month = 0; month < 4; month++) {
    if (month) {
      const next = sub.items.data[0].current_period_end;
      await stripe.testHelpers.testClocks.advance(clock.id,{frozen_time:next+86400});
      await waitReady();
      sub = await stripe.subscriptions.retrieve(sub.id,{expand:['latest_invoice']});
    }
    const invoice = sub.latest_invoice;
    assert.equal(typeof invoice,'object');
    const expected = month < 3 ? 0 : 4900;
    assert.equal(invoice.amount_due, expected, `Montant mois ${month+1}`);
    assert.equal(invoice.status,'paid',`Facture mois ${month+1}`);
    proof.invoices.push({month:month+1,id:invoice.id,amountDue:invoice.amount_due,currency:invoice.currency,status:invoice.status});
  }
  await stripe.subscriptions.cancel(sub.id);
  const cancelled = await stripe.subscriptions.retrieve(sub.id);
  assert.equal(cancelled.status,'canceled');
  proof.cancellationVerified = true;
  proof.complete = true;
} catch (e) {
  proof.complete = false;
  proof.error = {type:e.type||e.name,message:e.type?'Erreur Stripe de test, détails sensibles omis':e.message};
  process.exitCode=1;
} finally {
  if(clock) {try {await stripe.testHelpers.testClocks.del(clock.id);proof.clockDeleted=true;} catch {proof.clockDeleted=false;process.exitCode=1;}}
  proof.finishedAt=new Date().toISOString();
  await writeFile('/tmp/optibilan-beta-renewal-proof.json',JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof,null,2));
}
