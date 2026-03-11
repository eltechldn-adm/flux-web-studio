/**
 * ============================================================
 * Flux Web Studio — Shared Utilities
 * ============================================================
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ── Copyright year ────────────────────────────────────────
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Mobile nav toggle ─────────────────────────────────────
  const toggle   = document.getElementById('nav-toggle');
  const navMenu  = document.querySelector('.nav__menu');
  const navCta   = document.querySelector('.nav__cta');
  const nav      = document.getElementById('main-nav');

  if (toggle && navMenu) {

    function openNav() {
      navMenu.classList.add('nav__menu--open');
      if (navCta) navCta.classList.add('nav__cta--open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.classList.add('nav__toggle--open');
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      navMenu.classList.remove('nav__menu--open');
      if (navCta) navCta.classList.remove('nav__cta--open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('nav__toggle--open');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeNav() : openNav();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });

    // Close when a nav link is clicked (SPA-style navigation)
    navMenu.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', closeNav);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (nav && !nav.contains(e.target)) closeNav();
    });
  }

  // ── Scroll-aware nav ──────────────────────────────────────
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

});
