/* =================================================
   BSD Wishlist – localStorage per customer
   Requires window.__bsdCustomerId set in theme.liquid
   ================================================= */
(function () {
  'use strict';

  var CID = window.__bsdCustomerId || null;
  var KEY = CID ? 'bsd_wishlist_' + CID : null;

  /* ---- helpers ---- */
  function getList() {
    if (!KEY) return [];
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function saveList(arr) {
    if (!KEY) return;
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function has(handle) {
    return getList().indexOf(handle) !== -1;
  }
  function add(handle) {
    var list = getList();
    if (list.indexOf(handle) === -1) {
      list.push(handle);
      saveList(list);
    }
    refreshUI();
  }
  function remove(handle) {
    var list = getList();
    var idx = list.indexOf(handle);
    if (idx !== -1) {
      list.splice(idx, 1);
      saveList(list);
    }
    refreshUI();
  }
  function toggle(handle) {
    has(handle) ? remove(handle) : add(handle);
  }

  /* ---- UI sync (hearts across the page) ---- */
  function refreshUI() {
    document.querySelectorAll('[data-wishlist-btn]').forEach(function (btn) {
      var h = btn.dataset.wishlistBtn;
      btn.classList.toggle('is-wishlisted', has(h));
      btn.setAttribute('aria-label', has(h) ? 'Quitar de favoritos' : 'Agregar a favoritos');
      btn.setAttribute('title', has(h) ? 'Quitar de favoritos' : 'Agregar a favoritos');
    });
    /* Update counter badge if present */
    var badge = document.querySelector('[data-wishlist-count]');
    if (badge) {
      var c = getList().length;
      badge.textContent = c;
      badge.style.display = c > 0 ? '' : 'none';
    }
  }

  /* ---- click handler (delegated on body) ---- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-wishlist-btn]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    if (!CID) {
      /* Guest → prompt login */
      window.location.href = '/account/login';
      return;
    }
    toggle(btn.dataset.wishlistBtn);
  });

  /* ---- account page: render wishlist grid ---- */
  function renderAccountWishlist() {
    var container = document.querySelector('[data-wishlist-grid]');
    if (!container) return;

    var list = getList();
    var emptyMsg = document.querySelector('[data-wishlist-empty]');
    var countEl = document.querySelector('[data-wishlist-total]');

    if (list.length === 0) {
      container.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (countEl) countEl.textContent = '0';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    if (countEl) countEl.textContent = list.length;

    /* Fetch products in parallel */
    container.innerHTML = '<p class="wishlist-loading">Cargando favoritos…</p>';

    Promise.all(
      list.map(function (handle) {
        return fetch('/products/' + handle + '.js')
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; });
      })
    ).then(function (products) {
      container.innerHTML = '';
      var valid = [];

      products.forEach(function (p) {
        if (!p) return;
        valid.push(p);

        var price = formatMoney(p.price);
        var compareHtml = '';
        if (p.compare_at_price && p.compare_at_price > p.price) {
          compareHtml = '<span class="wishlist-card__price--compare">' + formatMoney(p.compare_at_price) + '</span>';
        }
        var imgSrc = p.featured_image ? resizeImg(p.featured_image, 400) : '';
        var badge = '';
        if (p.compare_at_price && p.compare_at_price > p.price) {
          var pct = Math.round((p.compare_at_price - p.price) / p.compare_at_price * 100);
          badge = '<span class="wishlist-card__badge">-' + pct + '%</span>';
        } else if (!p.available) {
          badge = '<span class="wishlist-card__badge" style="background:var(--color-text-light);">Agotado</span>';
        }

        var card = document.createElement('div');
        card.className = 'wishlist-card';
        card.innerHTML =
          '<div class="wishlist-card__media">' +
            '<a href="/products/' + p.handle + '">' +
              (imgSrc ? '<img src="' + imgSrc + '" alt="' + escapeHtml(p.title) + '" loading="lazy" width="400">' : '') +
            '</a>' +
            badge +
            '<button class="wishlist-card__remove" data-wishlist-remove="' + p.handle + '" aria-label="Quitar de favoritos" title="Quitar de favoritos">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="wishlist-card__info">' +
            '<a href="/products/' + p.handle + '" class="wishlist-card__title">' + escapeHtml(p.title) + '</a>' +
            '<div class="wishlist-card__price">' +
              '<span class="wishlist-card__price--current">' + price + '</span>' +
              compareHtml +
            '</div>' +
          '</div>';

        container.appendChild(card);
      });

      if (valid.length === 0) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
      }
    });
  }

  /* Remove from wishlist (account page) */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-wishlist-remove]');
    if (!btn) return;
    e.preventDefault();
    remove(btn.dataset.wishlistRemove);
    var card = btn.closest('.wishlist-card');
    if (card) {
      card.style.transition = 'opacity .3s, transform .3s';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(function () {
        card.remove();
        var grid = document.querySelector('[data-wishlist-grid]');
        var emptyMsg = document.querySelector('[data-wishlist-empty]');
        var countEl = document.querySelector('[data-wishlist-total]');
        if (grid && grid.children.length === 0 && emptyMsg) emptyMsg.style.display = 'block';
        if (countEl) countEl.textContent = getList().length;
      }, 300);
    }
  });

  /* ---- money formatting (CLP) ---- */
  function formatMoney(cents) {
    return '$' + Math.floor(cents / 100).toLocaleString('es-CL');
  }

  function resizeImg(url, size) {
    if (!url) return '';
    /* Already has size param? replace, else append */
    if (url.indexOf('_') !== -1 && /\.\w+$/.test(url)) {
      return url.replace(/(\.\w+)$/, '_' + size + 'x$1');
    }
    return url;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---- init ---- */
  document.addEventListener('DOMContentLoaded', function () {
    refreshUI();
    renderAccountWishlist();
  });

  /* Expose for external use */
  window.BsdWishlist = { has: has, add: add, remove: remove, toggle: toggle, getList: getList, refreshUI: refreshUI };
})();
