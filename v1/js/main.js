/* EganWood West Real Estate: header, mobile nav, reveal, contact form. No dependencies. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ----- Header: solid background once the page scrolls ----- */
  var header = document.querySelector('[data-header]');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ----- Mobile nav ----- */
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  function setNav(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
    window.matchMedia('(min-width: 1181px)').addEventListener('change', function () { setNav(false); });
  }

  /* ----- Hero slideshow -----
     Crossfades the <figure data-slide> photos. Later photos are fetched one step ahead,
     so visitors only download what they are about to see. */
  (function heroSlideshow() {
    var hero = document.querySelector('[data-hero]');
    if (!hero) return;
    var slides = Array.prototype.slice.call(hero.querySelectorAll('[data-slide]'));
    if (slides.length < 2) return;

    var INTERVAL = 6500;
    var controls = hero.querySelector('[data-hero-controls]');
    var dotsWrap = hero.querySelector('[data-hero-dots]');
    var caption = hero.querySelector('[data-hero-caption]');
    var pauseBtn = hero.querySelector('[data-hero-pause]');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var index = 0, timer = null, userPaused = reduced, hovering = false;

    function load(i) {
      var img = slides[(i + slides.length) % slides.length].querySelector('img');
      if (img && img.dataset.src) {
        img.srcset = img.dataset.srcset || '';
        img.src = img.dataset.src;
        delete img.dataset.src;
        delete img.dataset.srcset;
      }
    }

    var dots = slides.map(function (slide, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hero__dot';
      b.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + slides.length + ': ' + (slide.dataset.caption || ''));
      b.addEventListener('click', function () { go(i, true); });
      dotsWrap.appendChild(b);
      return b;
    });

    function render() {
      slides.forEach(function (s, i) {
        var on = i === index;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
        dots[i].setAttribute('aria-current', String(on));
      });
      if (caption) caption.textContent = slides[index].dataset.caption || '';
    }

    function go(i, byUser) {
      index = (i + slides.length) % slides.length;
      load(index);
      load(index + 1);
      render();
      if (byUser && caption) caption.setAttribute('aria-live', 'polite');
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      if (userPaused || hovering || document.hidden) return;
      timer = setTimeout(function () {
        var next = slides[(index + 1) % slides.length].querySelector('img');
        // Wait for the next photo rather than fading to an empty frame
        if (next && !next.complete) { load(index + 1); schedule(); return; }
        go(index + 1, false);
      }, INTERVAL);
    }

    function setPaused(p) {
      userPaused = p;
      pauseBtn.setAttribute('aria-pressed', String(p));
      pauseBtn.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
      schedule();
    }

    hero.querySelector('[data-hero-prev]').addEventListener('click', function () { go(index - 1, true); });
    hero.querySelector('[data-hero-next]').addEventListener('click', function () { go(index + 1, true); });
    pauseBtn.addEventListener('click', function () { setPaused(!userPaused); });
    controls.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(index - 1, true);
      if (e.key === 'ArrowRight') go(index + 1, true);
    });
    // Hold while someone is using the controls (not the whole hero: it fills the screen)
    controls.addEventListener('mouseenter', function () { hovering = true; schedule(); });
    controls.addEventListener('mouseleave', function () { hovering = false; schedule(); });
    controls.addEventListener('focusin', function () { hovering = true; schedule(); });
    controls.addEventListener('focusout', function () { hovering = false; schedule(); });
    document.addEventListener('visibilitychange', schedule);

    // Swipe on touch screens
    var startX = null;
    hero.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1), true);
      startX = null;
    }, { passive: true });

    controls.hidden = false;
    setPaused(reduced);
    load(1);
    render();
  })();

  /* ----- Reveal on scroll (fast; starts before the element is fully in view) ----- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ----- Client stories: scroll one card at a time with the arrows; swipe works natively ----- */
  (function stories() {
    var wrap = document.querySelector('[data-stories]');
    if (!wrap) return;
    var track = wrap.querySelector('[data-stories-track]');
    var prev = wrap.querySelector('[data-stories-prev]');
    var next = wrap.querySelector('[data-stories-next]');
    function step() {
      var card = track.firstElementChild;
      return card ? card.getBoundingClientRect().width + 24 : 300;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ----- Footer year ----- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ----- Contact form -----
     With data-endpoint set: POSTs JSON to it and shows a confirmation.
     Without one: opens the visitor's email app addressed to data-fallback-email. */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var say = function (msg, isError) {
      status.textContent = msg;
      status.classList.toggle('is-error', !!isError);
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(form).entries());
      if (data.company) return; // honeypot filled: a bot

      var firstBad = null;
      form.querySelectorAll('[required], [type="email"]').forEach(function (input) {
        var ok = input.checkValidity();
        input.setAttribute('aria-invalid', String(!ok));
        if (!ok && !firstBad) firstBad = input;
      });
      if (firstBad) {
        say('Please add your name and a valid email so we can reply.', true);
        firstBad.focus();
        return;
      }
      delete data.company;

      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        var to = form.getAttribute('data-fallback-email');
        var body = [
          'Name: ' + data.firstName + ' ' + data.lastName,
          'Email: ' + data.email,
          'Phone: ' + (data.phone || 'n/a'),
          'Interested in: ' + data.interest,
          '',
          data.message || ''
        ].join('\n');
        window.location.href = 'mailto:' + to +
          '?subject=' + encodeURIComponent('Website inquiry: ' + data.interest) +
          '&body=' + encodeURIComponent(body);
        say('Opening your email app. If nothing happens, email ' + to + ' directly.');
        return;
      }

      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      say('Sending…');
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('Bad response');
        form.reset();
        say('Thank you. Your message is on its way, and we will be in touch shortly.');
      }).catch(function () {
        say('Something went wrong. Please call (917) 538-3736 or email janie@bigskysir.com.', true);
      }).finally(function () {
        button.disabled = false;
      });
    });
  }
})();
