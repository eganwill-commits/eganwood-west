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

  /* ----- Client stories: a slow continuous drift, arrows jump a card, drag to scrub ----- */
  (function stories() {
    var wrap = document.querySelector('[data-stories]');
    if (!wrap) return;
    var track = wrap.querySelector('[data-stories-track]');
    var cards = Array.prototype.slice.call(track.children);
    if (cards.length < 2) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SPEED = 28;        // pixels per second while drifting
    var GAP = 24;

    // Clone the set once so the row can loop without a visible jump
    cards.forEach(function (c) { var d = c.cloneNode(true); d.setAttribute('aria-hidden', 'true'); track.appendChild(d); });

    var offset = 0, loopWidth = 0, step = 0, hold = false, dragging = false, last = null;
    var anim = null;  // {from, to, start, dur}

    function measure() {
      step = cards[0].getBoundingClientRect().width + GAP;
      loopWidth = step * cards.length;
    }
    function apply() {
      offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min(64, now - last); last = now;
      if (anim) {
        var t = Math.min(1, (now - anim.start) / anim.dur);
        offset = anim.from + (anim.to - anim.from) * ease(t);
        if (t === 1) anim = null;
      } else if (!hold && !dragging && !reduced && !document.hidden) {
        offset += SPEED * dt / 1000;
      }
      apply();
      requestAnimationFrame(frame);
    }

    function jump(dir) {
      // Land on the next card boundary in that direction
      var base = anim ? anim.to : offset;
      var target = dir > 0 ? Math.floor(base / step + 1.001) * step : Math.ceil(base / step - 1.001) * step;
      anim = { from: offset, to: target, start: performance.now(), dur: 550 };
      pauseBriefly();
    }
    var holdTimer;
    function pauseBriefly() { hold = true; clearTimeout(holdTimer); holdTimer = setTimeout(function () { hold = false; }, 4000); }

    wrap.querySelector('[data-stories-prev]').addEventListener('click', function () { jump(-1); });
    wrap.querySelector('[data-stories-next]').addEventListener('click', function () { jump(1); });
    wrap.addEventListener('mouseenter', function () { hold = true; });
    wrap.addEventListener('mouseleave', function () { hold = false; });
    wrap.addEventListener('focusin', function () { hold = true; });
    wrap.addEventListener('focusout', function () { hold = false; });

    // Drag or swipe to scrub
    var startX = 0, startOffset = 0;
    track.addEventListener('pointerdown', function (e) {
      dragging = true; anim = null; startX = e.clientX; startOffset = offset;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      offset = startOffset - (e.clientX - startX);
    });
    function endDrag() { if (dragging) { dragging = false; pauseBriefly(); } }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.style.touchAction = 'pan-y';
    track.style.cursor = 'grab';

    window.addEventListener('resize', measure);
    measure();
    requestAnimationFrame(frame);
  })();

  /* ----- Night sky behind "Meet the sisters" -----
     Draws a star field sized to the section, keeping the bigger stars clear of the photo and copy.
     Rebuilt on resize. */
  (function nightSky() {
    var svg = document.querySelector('[data-night-sky]');
    if (!svg) return;
    var section = svg.parentElement;
    var NS = 'http://www.w3.org/2000/svg';
    function rand(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function el(name, attrs) { var n = document.createElementNS(NS, name); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }
    function build() {
      var W = section.offsetWidth, H = section.offsetHeight;
      if (!W || !H) return;
      var base = section.getBoundingClientRect();
      var clear = Array.prototype.map.call(section.querySelectorAll('[data-sky-clear]'), function (n) {
        var r = n.getBoundingClientRect();
        return { l: r.left - base.left - 16, t: r.top - base.top - 16, r: r.right - base.left + 16, b: r.bottom - base.top + 16 };
      });
      function covered(x, y) { return clear.some(function (c) { return x > c.l && x < c.r && y > c.t && y < c.b; }); }
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var rnd = rand(1903);
      var count = Math.max(50, Math.min(160, Math.round(W * H / 7000)));
      var stars = [], tries = 0;
      while (stars.length < count && tries++ < count * 6) {
        var x = rnd() * W, y = rnd() * H, r = 0.7 + rnd() * rnd() * 1.9;
        if (covered(x, y) && r > 1.1) continue;
        stars.push({ x: x, y: y, r: r, warm: rnd() < 0.25, o: 0.3 + rnd() * 0.6, d: rnd() * 6 });
      }
      stars.forEach(function (s) {
        var c = el('circle', { class: 'ns-star' + (s.warm ? ' ns-star--warm' : ''), cx: s.x.toFixed(1), cy: s.y.toFixed(1), r: s.r.toFixed(2) });
        c.style.setProperty('--o', s.o.toFixed(2));
        c.style.animationDelay = s.d.toFixed(1) + 's';
        svg.appendChild(c);
      });
    }
    var t;
    function rebuild() { clearTimeout(t); t = setTimeout(build, 120); }
    window.addEventListener('resize', rebuild);
    window.addEventListener('load', rebuild);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
    build();
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
