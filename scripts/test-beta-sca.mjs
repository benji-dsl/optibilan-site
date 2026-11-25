import Stripe from 'stripe';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/checkout.ts';
import { writeFile } from 'node:fs/promises';

const key=process.env.STRIPE_SECRET_KEY || '';
if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) throw new Error('Clé Stripe TEST obligatoire.');
const stripe=new Stripe(key);
const proof={mode:'test',startedAt:new Date().toISOString(),checks:[]};
const email=`contact+beta-recette-${Date.now()}@optibilan.com`;
const previousProof = JSON.parse(await (await import("node:fs/promises")).readFile("/tmp/optibilan-beta-stripe-proof.json", "utf8"));
const reference = await stripe.subscriptions.retrieve(previousProof.subscriptionId);
const testPrice = reference.items.data[0].price.id;
let subscriptionId;
const base={plan:'solo',billing:'monthly',email,firstName:'Recette',lastName:'OPTIBILAN',country:'FR',address:'Test uniquement',promoCode:'BETA3MOIS',requestId:crypto.randomUUID()};
const originalError=console.error;
const invoke=async(body)=>{
 console.error=(_label,e)=>{proof.stripeError={type:e?.type,code:e?.code,param:e?.param};};
 try {const response=await onRequestPost({request:new Request('https://optibilan.com/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),env:{STRIPE_SECRET_KEY:key, STRIPE_PRICE_SOLO_MONTHLY:testPrice}});return {status:response.status,data:await response.json()};}
 finally {console.error=originalError;}
};
try {
 let promo=(await stripe.promotionCodes.list({code:'BETA3MOIS',active:true,limit:1,expand:['data.promotion.coupon']})).data[0];
 if(!promo){
  const coupon=await stripe.coupons.create({name:'Recette BETA3MOIS - TEST',percent_off:100,duration:'repeating',duration_in_months:3},{idempotencyKey:'optibilan-beta3mois-test-coupon-v1'});
  promo=await stripe.promotionCodes.create({code:'BETA3MOIS',promotion:{type:'coupon',coupon:coupon.id},max_redemptions:18,restrictions:{first_time_transaction:true},metadata:{purpose:'optibilan-sandbox-recette'}},{idempotencyKey:'optibilan-beta3mois-test-promo-v1'});
 }
 assert.equal(promo.livemode,false);
 proof.promotionId=promo.id;
 const paymentMethod={id:'pm_card_authenticationRequiredOnSetup'};
 const annual=await invoke({...base,billing:'yearly',paymentMethodId:paymentMethod.id});
 assert.equal(annual.status,400);assert.match(annual.data.error,/mensuels/);proof.checks.push('annuel refusé avant création de client');
 assert.equal((await stripe.customers.list({email})).data.length,0);
 const success=await invoke({...base,paymentMethodId:paymentMethod.id});
 proof.checkoutStatus=success.status;
 if(success.status!==200) throw new Error('Checkout test refusé : '+success.data.error);
 subscriptionId=success.data.subscriptionId;
 const sub=await stripe.subscriptions.retrieve(subscriptionId,{expand:['latest_invoice','discounts']});
 assert.equal(sub.livemode,false);assert.equal(sub.trial_end,null);assert.equal(sub.status,'active');
 const invoice=sub.latest_invoice;
 assert.equal(typeof invoice,'object');assert.equal(invoice.amount_due,0);
 assert.equal(sub.items.data[0].price.recurring.interval,'month');
 proof.subscriptionId=sub.id;proof.customerId=sub.customer;proof.zeroInvoice=invoice.id;
 proof.checks.push('première facture zéro','pas de cumul avec essai trente jours','abonnement mensuel actif en test');
 const discount=sub.discounts[0];
 assert.equal(typeof discount,'object');
 proof.discountStart=discount.start;proof.discountEnd=discount.end;
 assert.ok(discount.end>discount.start+80*86400 && discount.end<discount.start+94*86400);
 proof.checks.push('remise limitée à trois mois');
 const retry=await invoke({...base,paymentMethodId:paymentMethod.id});
 assert.equal(retry.status,200);assert.equal(retry.data.subscriptionId,sub.id);proof.checks.push('reprise de la même tentative sans doublon');
 const repeated=await invoke({...base,requestId:crypto.randomUUID(),paymentMethodId:paymentMethod.id});
 assert.equal(repeated.status,409);proof.checks.push('seconde inscription même email refusée');
 const expanded=await stripe.subscriptions.retrieve(sub.id,{expand:['customer','default_payment_method','pending_setup_intent','latest_invoice']});
 const {validateCheckoutClaim}=await import('../../optibilan/src/lib/checkoutClaimPolicy.ts');
 const claimUrl=new URL(success.data.url);
 assert.ok(success.data.setupClientSecret);
 assert.notEqual(expanded.pending_setup_intent?.status,'succeeded');
 assert.throws(()=>validateCheckoutClaim(expanded,claimUrl.searchParams.get('token'),email,id=>id===testPrice?{plan:'SOLO',yearly:false}:null));
 proof.checks.push('authentification bancaire exigée et espace refusé avant validation');
 proof.setupAuthenticationRequired=!!success.data.setupClientSecret;
 proof.complete=true;
} catch(e) {
 proof.complete=false;proof.error={type:e.type||e.name,code:e.code||null,message:e.type?'Erreur Stripe de test (détails sensibles omis)':e.message};process.exitCode=1;
} finally {
 if(subscriptionId){try{await stripe.subscriptions.cancel(subscriptionId);proof.testSubscriptionCancelled=true;}catch{proof.testSubscriptionCancelled=false;process.exitCode=1;}}
 proof.finishedAt=new Date().toISOString();
 await writeFile('/tmp/optibilan-beta-sca-proof.json',JSON.stringify(proof,null,2));
 console.log(JSON.stringify(proof,null,2));
}
