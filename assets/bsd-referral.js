/**
 * BSD Referral Capture
 * --------------------------------------------------
 * 1. Reads ?ref=XXXX from URL (alphanumeric only)
 * 2. Stores in localStorage with 365-day expiry
 * 3. POSTs to /cart/update.js as cart attribute
 *    so it arrives in the order for Shopify Flow
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'bsd_ref';
  var EXPIRY_KEY = 'bsd_ref_exp';
  var SENT_KEY = 'bsd_ref_sent';
  var DAYS = 365;

  /* ---- helpers ---- */
  function getParam(name) {
    var match = RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function isValid(code) {
    return /^[0-9A-Za-z]{3,32}$/.test(code);
  }

  function setWithExpiry(code) {
    var exp = Date.now() + DAYS * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem(EXPIRY_KEY, String(exp));
    } catch (e) { /* storage full – ignore */ }
  }

  function getStored() {
    try {
      var code = localStorage.getItem(STORAGE_KEY);
      var exp = localStorage.getItem(EXPIRY_KEY);
      if (!code || !exp) return null;
      if (Date.now() > Number(exp)) {
        clear();
        return null;
      }
      return code;
    } catch (e) { return null; }
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      localStorage.removeItem(SENT_KEY);
    } catch (e) { /* noop */ }
  }

  /* ---- main ---- */
  // 1. Capture from URL
  var urlRef = getParam('ref');
  if (urlRef && isValid(urlRef)) {
    setWithExpiry(urlRef.toUpperCase());
    // Remove ?ref= from URL without reload
    if (window.history && history.replaceState) {
      var url = new URL(location.href);
      url.searchParams.delete('ref');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }

  // 2. Send stored ref to cart attributes (once per ref)
  var ref = getStored();
  if (ref) {
    var alreadySent;
    try { alreadySent = localStorage.getItem(SENT_KEY); } catch (e) { alreadySent = null; }

    if (alreadySent !== ref) {
      fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes: { ref_code: ref } })
      }).then(function () {
        try { localStorage.setItem(SENT_KEY, ref); } catch (e) { /* noop */ }
      }).catch(function () { /* will retry next page load */ });
    }
  }
})();
