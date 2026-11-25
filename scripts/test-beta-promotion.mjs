import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseBetaCode, validateBetaPromotion } from '../src/lib/beta-promotion.ts';
const valid = () => ({active:true,code:'BETA3MOIS',max_redemptions:18,times_redeemed:0,expires_at:null,customer:null,restrictions:{first_time_transaction:true},promotion:{coupon:{valid:true,percent_off:100,duration:'repeating',duration_in_months:3}}});
test('normalise le code et laisse les inscriptions sans code inchangées',()=>{assert.equal(normaliseBetaCode(' beta3mois ','monthly'),'BETA3MOIS');assert.equal(normaliseBetaCode('','yearly'),'');});
test('refuse un code sur annuel avant tout appel Stripe',()=>assert.throws(()=>normaliseBetaCode('BETA3MOIS','yearly')));
test('refuse un code inconnu ou de type inattendu',()=>{assert.throws(()=>normaliseBetaCode('AUTRE','monthly'));assert.throws(()=>normaliseBetaCode({},'monthly'));});
test('accepte uniquement trois mois à 100% et dix-huit nouvelles places et deux historiques réservées',()=>assert.doesNotThrow(()=>validateBetaPromotion(valid())));
for (const [name,change] of [
 ['quota épuisé',p=>p.times_redeemed=18],['code inactif',p=>p.active=false],['quota différent',p=>p.max_redemptions=100],['réutilisation permise',p=>p.restrictions.first_time_transaction=false],['réduction permanente',p=>p.promotion.coupon.duration='forever'],['mauvaise durée',p=>p.promotion.coupon.duration_in_months=6],['réduction partielle',p=>p.promotion.coupon.percent_off=50],['code expiré',p=>p.expires_at=1],['coupon non développé',p=>p.promotion.coupon='coupon_1']
]) test('refuse '+name,()=>{const p=valid();change(p);assert.throws(()=>validateBetaPromotion(p));});
