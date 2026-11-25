import Stripe from 'stripe';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFile,writeFile,open} from 'node:fs/promises';
import {onRequestPost} from '../functions/api/checkout.ts';
const key=process.env.STRIPE_SECRET_KEY||'';
if(!/^(sk|rk)_test_/.test(key)) throw new Error('Clé TEST obligatoire.');
const appPath='/Users/benjamindesaint-laurent/Documents/optibilan';
const localDb='postgresql://postgres@127.0.0.1:55432/optibilan_test';
const {PrismaClient}=createRequire(`${appPath}/package.json`)('@prisma/client');
const db=new PrismaClient({datasources:{db:{url:localDb}}});
const stripe=new Stripe(key);
const previous=JSON.parse(await readFile('/tmp/optibilan-beta-stripe-proof.json','utf8'));
const reference=await stripe.subscriptions.retrieve(previous.subscriptionId);
const price=reference.items.data[0].price.id;
const email=`contact+signup-recette-${Date.now()}@optibilan.com`;
const proof={mode:'test-local',startedAt:new Date().toISOString()};
let subId,orgId,server;
const log=await open('/tmp/optibilan-signup-server.log','w');
try {
 const card=await stripe.paymentMethods.create({type:'card',card:{token:'tok_visa'}});
 const body={plan:'solo',billing:'monthly',email,firstName:'Recette',lastName:'Inscription',country:'FR',address:'Test uniquement',promoCode:'BETA3MOIS',requestId:crypto.randomUUID(),paymentMethodId:card.id};
 const checkout=await onRequestPost({request:new Request('https://optibilan.com/api/checkout',{method:'POST',body:JSON.stringify(body)}),env:{STRIPE_SECRET_KEY:key,STRIPE_PRICE_SOLO_MONTHLY:price}});
 assert.equal(checkout.status,200);
 const result=await checkout.json();subId=result.subscriptionId;
 const claimUrl=new URL(result.url);
 server=spawn(process.execPath,['.next/standalone/server.js'],{cwd:appPath,stdio:['ignore',log.fd,log.fd],env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',PORT:'3998',HOSTNAME:'127.0.0.1',AUTH_TRUST_HOST:'1',DATABASE_URL:localDb,DIRECT_URL:localDb,AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),CRON_SECRET:crypto.randomUUID(),STRIPE_SECRET_KEY:key,STRIPE_PRICE_SOLO_MONTHLY:price,NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3998',RESEND_API_KEY:'',ANTHROPIC_API_KEY:''}});
 let ready=false;
 for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:3998/inscription');if(r.ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'Serveur local disponible');
 const eligibility=async()=>{const r=await fetch('http://127.0.0.1:3998/api/checkout/eligibility',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':'127.0.0.1'},body:JSON.stringify({email})});assert.equal(r.status,200);return (await r.json()).eligible;};
 assert.equal(await eligibility(),true);
 const manifest=JSON.parse(await readFile(`${appPath}/.next/server/server-reference-manifest.json`,'utf8'));
 const actionId=Object.entries(manifest.node).find(([,v])=>v.exportedName==='signupAction')?.[0];
 assert.ok(actionId);
 const form=new FormData();
 const data={firstName:'Recette',lastName:'Inscription',orgName:`Recette paiement ${Date.now()}`,profileKey:'coach',email,password:`Z!${crypto.randomUUID()}Ab9`,terms:'on',checkoutSubscription:subId,checkoutToken:claimUrl.searchParams.get('token')};
 for(const [name,value]of Object.entries(data))form.set('_1_'+name,value);
 form.set('0','[{},"$K1"]');
 const response=await fetch('http://127.0.0.1:3998/inscription',{method:'POST',headers:{'Next-Action':actionId,Origin:'http://127.0.0.1:3998'},body:form,redirect:'manual'});
 proof.actionStatus=response.status;
 const text=await response.text();
 const org=await db.organization.findUnique({where:{stripeSubscriptionId:subId}});
 if(!org) {proof.actionError=text.slice(0,1500).replaceAll(data.checkoutToken,'[TOKEN]');throw new Error('Aucun espace lié après inscription.');}
 orgId=org.id;
 const actual=await stripe.subscriptions.retrieve(subId);
 assert.equal(org.stripeCustomerId,actual.customer);
 assert.equal(org.plan,'SOLO');assert.equal(org.status,'ACTIVE');assert.equal(org.trialEndsAt,null);
 const users=await db.user.count({where:{orgId}});assert.equal(users,1);
 proof.checks=['vrai formulaire serveur exécuté','espace lié au bon abonnement et client Stripe','forfait Solo actif sans essai ajouté','un seul administrateur créé'];
 const retry=await fetch('http://127.0.0.1:3998/inscription',{method:'POST',headers:{'Next-Action':actionId,Origin:'http://127.0.0.1:3998'},body:form,redirect:'manual'});
 await retry.text();assert.equal(await db.organization.count({where:{stripeSubscriptionId:subId}}),1);
 proof.checks.push('rejeu sans deuxième espace');
 assert.equal(await eligibility(),false);proof.checks.push('compte existant refusé avant un nouveau paiement');
 assert.ok(response.headers.get('set-cookie'));proof.checks.push('session créée après inscription');
 proof.complete=true;
} catch(e) {proof.complete=false;proof.error=e.type?'Erreur Stripe, détails omis':e.message;process.exitCode=1;}
finally {
 if(server) server.kill('SIGTERM');
 if(orgId) await db.organization.delete({where:{id:orgId}});
 if(subId) await stripe.subscriptions.cancel(subId);
 await db.$disconnect();await log.close();
 proof.finishedAt=new Date().toISOString();
 await writeFile('/tmp/optibilan-beta-signup-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}
