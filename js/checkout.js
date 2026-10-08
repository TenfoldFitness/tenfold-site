/* Shared checkout logic for signup.html and membership.html.

   Goals:
   - A card is never charged without the purchase being recorded, or if it was, we say so clearly.
   - A retry never charges twice.
   - Every outcome is explained in plain words.

   Each purchase carries an idempotency key. Updated server functions use it so a repeat of the same
   request cannot charge again. Older server functions ignore it, so this file never retries on its own
   after an unclear failure. It only retries when the server says explicitly that the payment went
   through but the membership was not saved (membershipRecorded === false). */
(function () {
  var PREFIX = 'tenfold_purchase_key_';

  var MESSAGES = {
    unclear: "We couldn't confirm whether your payment went through. Please don't pay again yet. Check your email for a receipt, or contact us and we'll sort it out right away.",
    paidPending: "Your payment went through, but we couldn't switch on your membership just now. Please don't pay again. Your payment is on record and we'll fix this quickly. Contact us if you don't hear from us soon.",
    invalid: "Something was missing from your order, so nothing was charged. Please refresh the page and try again.",
    cardUnverified: "We could not verify those card details. Please check the number, date and code, then try again."
  };

  function newKey() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function storageName(tier, email) {
    return PREFIX + tier + '_' + String(email || '').toLowerCase();
  }

  // One key per purchase attempt. It survives a page refresh, so a retry reuses it.
  function getKey(tier, email) {
    try {
      var k = sessionStorage.getItem(storageName(tier, email));
      if (!k) { k = newKey(); sessionStorage.setItem(storageName(tier, email), k); }
      return k;
    } catch (e) { return newKey(); }
  }

  function clearKey(tier, email) {
    try { sessionStorage.removeItem(storageName(tier, email)); } catch (e) {}
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function callOnce(opts) {
    var fn = opts.kind === 'subscription' ? 'start-membership' : 'purchase-package';
    var res = await fetch(SUPABASE_URL + '/functions/v1/' + fn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': 'Bearer ' + opts.authToken
      },
      body: JSON.stringify({
        sourceId: opts.sourceId,
        tier: opts.tier,
        clientEmail: opts.email,
        idempotencyKey: opts.key
      })
    });
    var payload = {};
    try { payload = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, payload: payload };
  }

  // Square returns an error list when it refuses a card. In that case nothing was charged.
  function cardMessage(payload) {
    var errs = payload && payload.error && payload.error.errors;
    if (!errs || !errs.length) return null;
    var code = String(errs[0].code || '');
    if (/CVV|ADDRESS_VERIFICATION|POSTAL/.test(code)) return "We couldn't verify your card's security code or ZIP code. Please check them and try again.";
    if (/EXPIR/.test(code)) return 'That card looks expired. Please check the date, or try another card.';
    if (/INSUFFICIENT_FUNDS/.test(code)) return 'That card was declined for insufficient funds. Please try another card.';
    return 'Your card was declined. Please check the details, or try another card.';
  }

  /* purchase({ kind: 'subscription' | 'package', tier, email, sourceId, authToken })
     resolves to { state, message } where state is one of:
       ok           paid and recorded
       paid_pending paid, but the membership could not be recorded yet
       declined     card refused, nothing charged
       invalid      the order was incomplete, nothing charged
       auth_required the payment function wants a signed-in visitor, nothing charged
       unclear      we cannot tell, do not pay again */
  async function purchase(opts) {
    opts.key = opts.key || getKey(opts.tier, opts.email);
    var r;
    try { r = await callOnce(opts); }
    catch (e) { return { state: 'unclear', message: MESSAGES.unclear }; }

    if (r.ok && r.payload && r.payload.success !== false) {
      if (r.payload.membershipRecorded === false) {
        // Paid, but not recorded. A retry with the same key is safe on updated server functions.
        for (var i = 0; i < 2; i++) {
          await wait(1500);
          try { r = await callOnce(opts); } catch (e) { break; }
          if (r.ok && r.payload && r.payload.membershipRecorded !== false) {
            clearKey(opts.tier, opts.email);
            return { state: 'ok' };
          }
        }
        return { state: 'paid_pending', message: MESSAGES.paidPending };
      }
      clearKey(opts.tier, opts.email);
      return { state: 'ok' };
    }

    if (r.status === 401 || r.status === 403) return { state: 'auth_required' };

    var card = cardMessage(r.payload);
    if (r.status === 400 && card) {
      clearKey(opts.tier, opts.email); // a new card needs a new key
      return { state: 'declined', message: card + ' You have not been charged.' };
    }
    if (r.status === 400 && r.payload && typeof r.payload.error === 'string') {
      return { state: 'invalid', message: MESSAGES.invalid };
    }
    return { state: 'unclear', message: MESSAGES.unclear };
  }

  window.TenfoldCheckout = {
    purchase: purchase,
    getKey: getKey,
    clearKey: clearKey,
    messages: MESSAGES
  };
})();
