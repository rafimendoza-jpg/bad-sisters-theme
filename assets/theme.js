/* ========================================
   BAD SISTERS DESIGN — Theme JavaScript
   ======================================== */

(function() {
  'use strict';

  /* === HEADER SCROLL EFFECT === */
  const header = document.querySelector('.site-header');
  if (header) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  /* === MOBILE MENU === */
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.header__nav');
  
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      mobileNav.classList.toggle('is-open');
      document.body.style.overflow = mobileNav.classList.contains('is-open') ? 'hidden' : '';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target) && mobileNav.classList.contains('is-open')) {
        mobileToggle.classList.remove('active');
        mobileNav.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });
  }

  /* === PRODUCT PAGE: IMAGE GALLERY === */
  const mainImage = document.querySelector('.product__main-image img');
  const thumbnails = document.querySelectorAll('.product__thumbnail');
  
  if (mainImage && thumbnails.length) {
    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const newSrc = thumb.querySelector('img').dataset.fullSrc || thumb.querySelector('img').src;
        mainImage.src = newSrc;
        thumbnails.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  /* === PRODUCT PAGE: VARIANT SELECTOR === */
  const variantOptions = document.querySelectorAll('.product__variant-option');
  
  variantOptions.forEach(option => {
    option.addEventListener('click', () => {
      const parent = option.closest('.product__variants');
      parent.querySelectorAll('.product__variant-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      
      // Update hidden variant input
      const variantInput = document.querySelector('input[name="id"]');
      if (variantInput && option.dataset.variantId) {
        variantInput.value = option.dataset.variantId;
      }
    });
  });

  /* === PRODUCT PAGE: QUANTITY SELECTOR === */
  const quantityBtns = document.querySelectorAll('.product__quantity-btn');
  
  quantityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const currentVal = parseInt(input.value) || 1;
      
      if (btn.dataset.action === 'decrease' && currentVal > 1) {
        input.value = currentVal - 1;
      } else if (btn.dataset.action === 'increase') {
        input.value = currentVal + 1;
      }
      input.dispatchEvent(new Event('change'));
    });
  });

  /* === ADD TO CART (AJAX) === */
  const addToCartForms = document.querySelectorAll('form[action="/cart/add"]');
  
  addToCartForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Agregando...';
      
      try {
        const formData = new FormData(form);
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const item = await response.json();
          submitBtn.textContent = '¡Agregado!';
          
          // Update cart count in header
          updateCartCount();
          
          setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
          }, 2000);
        } else {
          throw new Error('Error al agregar');
        }
      } catch (error) {
        submitBtn.textContent = 'Error - Intenta de nuevo';
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }, 2000);
      }
    });
  });

  /* === UPDATE CART COUNT === */
  async function updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      const countElements = document.querySelectorAll('.header__cart-count');
      countElements.forEach(el => {
        el.textContent = cart.item_count;
        el.style.display = cart.item_count > 0 ? 'flex' : 'none';
      });
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  }

  /* === CART PAGE: QUANTITY UPDATE === */
  const cartQuantityInputs = document.querySelectorAll('.cart__quantity-input');
  
  cartQuantityInputs.forEach(input => {
    input.addEventListener('change', async () => {
      const line = input.dataset.line;
      const quantity = parseInt(input.value);
      
      try {
        const response = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line: parseInt(line), quantity })
        });
        
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error updating cart:', error);
      }
    });
  });

  /* === CART PAGE: REMOVE ITEM === */
  const removeButtons = document.querySelectorAll('.cart__item-remove');
  
  removeButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const line = btn.dataset.line;
      
      try {
        const response = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line: parseInt(line), quantity: 0 })
        });
        
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error removing item:', error);
      }
    });
  });

  /* === SCROLL ANIMATIONS === */
  if ('IntersectionObserver' in window) {
    const animateElements = document.querySelectorAll('[data-animate]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    animateElements.forEach(el => observer.observe(el));
  }

  /* === NEWSLETTER FORM === */
  const newsletterForms = document.querySelectorAll('.newsletter-form, .footer__newsletter-form');
  
  newsletterForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      // Let Shopify handle the form submission
      const email = form.querySelector('input[type="email"]');
      if (email && !email.value) {
        e.preventDefault();
        email.focus();
      }
    });
  });

  /* === SEARCH DRAWER / OVERLAY (optional) === */
  const searchToggle = document.querySelector('.header__search-toggle');
  const searchOverlay = document.querySelector('.search-overlay');
  
  if (searchToggle && searchOverlay) {
    searchToggle.addEventListener('click', () => {
      searchOverlay.classList.toggle('is-open');
      const input = searchOverlay.querySelector('input');
      if (input) input.focus();
    });
  }

  /* === INIT ON DOM READY === */
  document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
  });

})();
