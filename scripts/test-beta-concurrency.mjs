import Stripe from 'stripe';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {onRequestPost} from '../functions/api/checkout.ts';
const key=process.env.STRIPE_SECRET_KEY || '';
if(!/^(sk|rk)_test_/.test(key)) throw new Error('Clé TEST obligatoire.');
const stripe=new Stripe(key);
const previous=JSON.parse(await readFile('/tmp/optibilan-beta-stripe-proof.json','utf8'));
const reference=await stripe.subscriptions.retrieve(previous.subscriptionId);
const price=reference.items.data[0].price.id;
const email=`contact+concurrence-${Date.now()}@optibilan.com`;
const proof={mode:'test',startedAt:new Date().toISOString()};
const subIds=[];
const originalError=console.error;
try {
  const cards=await Promise.all([1,2].map(()=>stripe.paymentMethods.create({type:'card',card:{token:'tok_visa'}})));
  console.error=()=>{};
  const results=await Promise.all(cards.map(async(card)=>{
    const body={plan:'solo',billing:'monthly',email,firstName:'Recette',lastName:'Concurrence',country:'FR',address:'Test uniquement',promoCode:'BETA3MOIS',requestId:crypto.randomUUID(),paymentMethodId:card.id};
    const response=await onRequestPost({request:new Request('https://optibilan.com/api/checkout',{method:'POST',body:JSON.stringify(body)}),env:{STRIPE_SECRET_KEY:key,STRIPE_PRICE_SOLO_MONTHLY:price}});
    return {status:response.status,data:await response.json()};
  }));
  console.error=originalError;
  proof.responseStatuses=results.map(x=>x.status);
  assert.ok(results.some(x=>x.status===200));
  const customers=(await stripe.customers.list({email})).data;
  assert.equal(customers.length,1);
  for(const customer of customers) for await(const sub of stripe.subscriptions.list({customer:customer.id,status:'all'})) subIds.push(sub.id);
  assert.equal(subIds.length,1);
  proof.customers=customers.length;proof.subscriptions=subIds.length;proof.complete=true;
} catch(e) {proof.complete=false;proof.error=e.type?'Erreur Stripe, détails omis':e.message;process.exitCode=1;}
finally {
 console.error=originalError;
 for(const id of subIds) await stripe.subscriptions.cancel(id);
 proof.cleanedUp=true;
 await writeFile('/tmp/optibilan-beta-concurrency-proof.json',JSON.stringify(proof,null,2));
 console.log(JSON.stringify(proof,null,2));
}
