/* Light/dark toggle. A saved choice in localStorage overrides the system
   preference via data-theme on <html>; no choice means follow the system.
   Dispatches 'themechange' on window so the canvases can re-ink. */
(function () {
    'use strict';

    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    function current() {
        const t = root.dataset.theme;
        if (t === 'dark' || t === 'light') return t;
        return mq.matches ? 'dark' : 'light';
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle light/dark mode');

    function render() {
        btn.textContent = current() === 'dark' ? '[light]' : '[dark]';
    }

    btn.addEventListener('click', () => {
        const next = current() === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
        render();
        window.dispatchEvent(new Event('themechange'));
    });

    if (mq.addEventListener) mq.addEventListener('change', render);
    else if (mq.addListener) mq.addListener(render);

    const nav = document.querySelector('.nav');
    if (nav) nav.appendChild(btn);
    else { btn.classList.add('floating'); document.body.appendChild(btn); }
    render();
})();
