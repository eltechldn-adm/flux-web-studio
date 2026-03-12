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

    // 1. Dynamically create the mobile panel wrapper
    const mobilePanel = document.createElement('div');
    mobilePanel.classList.add('nav__mobile-panel');
    
    // Move menu and CTA inside the new panel
    if (navMenu) mobilePanel.appendChild(navMenu);
    if (navCta) mobilePanel.appendChild(navCta);
    
    // Append the panel to the main nav container
    const navInner = nav.querySelector('.nav__inner');
    if (navInner) navInner.appendChild(mobilePanel);

    function openNav() {
      mobilePanel.classList.add('nav__mobile-panel--open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.classList.add('nav__toggle--open');
    }

    function closeNav() {
      mobilePanel.classList.remove('nav__mobile-panel--open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('nav__toggle--open');
    }

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeNav() : openNav();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });

    // Close when a nav link is clicked
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
