/* Page effects: typewriter titles, link scramble, animated details,
   the ASCII falls, and one easter egg. Everything respects
   prefers-reduced-motion and the --text/--bg theme variables. */
(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function inkColor() {
        return getComputedStyle(document.documentElement)
            .getPropertyValue('--text').trim() || '#000000';
    }
    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    /* ---------- 1. Typewriter section titles ---------- */
    (function () {
        const titles = document.querySelectorAll('.section-title');
        if (!titles.length || REDUCED || !('IntersectionObserver' in window)) return;

        function type(el) {
            const full = el.dataset.full;
            const speed = Math.min(38, 900 / full.length);
            let i = 0;
            const tick = setInterval(() => {
                i++;
                el.textContent = full.slice(0, i) + '█';
                if (i >= full.length) {
                    clearInterval(tick);
                    let blinks = 0;
                    const blink = setInterval(() => {
                        blinks++;
                        el.textContent = full + (blinks % 2 ? ' ' : '█');
                        if (blinks >= 4) { clearInterval(blink); el.textContent = full; }
                    }, 320);
                }
            }, speed);
        }

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                obs.unobserve(entry.target);
                type(entry.target);
            });
        }, { threshold: 0.4 });

        titles.forEach(el => {
            el.dataset.full = el.textContent.trim();
            el.style.minHeight = el.offsetHeight + 'px';
            el.textContent = '█';
            obs.observe(el);
        });
    })();

    /* ---------- 2. Scramble-resolve on hero links ---------- */
    (function () {
        if (REDUCED) return;
        const GLYPHS = '#%&/\\|=+*:;!?~<>';
        document.querySelectorAll('.links a').forEach(a => {
            const text = a.textContent;
            let running = false;
            function scramble() {
                if (running) return;
                running = true;
                let frame = 0;
                const total = Math.max(10, text.length * 2);
                const tick = setInterval(() => {
                    frame++;
                    let out = '';
                    for (let i = 0; i < text.length; i++) {
                        out += (i < frame / 2)
                            ? text[i]
                            : GLYPHS[(Math.random() * GLYPHS.length) | 0];
                    }
                    a.textContent = out;
                    if (frame >= total) {
                        clearInterval(tick);
                        a.textContent = text;
                        running = false;
                    }
                }, 26);
            }
            a.addEventListener('mouseenter', scramble);
            a.addEventListener('focus', scramble);
        });
    })();

    /* ---------- 3. Smooth expand/collapse for details ---------- */
    (function () {
        document.querySelectorAll('details.expandable-list').forEach(d => {
            const summary = d.querySelector('summary');
            const content = d.querySelector('.expandable-content');
            if (!summary || !content) return;
            let animating = false;

            summary.addEventListener('click', (e) => {
                if (REDUCED || !content.animate) return; // native toggle
                e.preventDefault();
                if (animating) return;
                animating = true;

                if (!d.open) {
                    d.open = true;
                    const h = content.offsetHeight;
                    content.style.overflow = 'hidden';
                    const anim = content.animate(
                        { height: ['0px', h + 'px'], opacity: [0, 1] },
                        { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }
                    );
                    anim.onfinish = () => { content.style.overflow = ''; animating = false; };
                } else {
                    d.classList.add('closing');
                    const h = content.offsetHeight;
                    content.style.overflow = 'hidden';
                    const anim = content.animate(
                        { height: [h + 'px', '0px'], opacity: [1, 0] },
                        { duration: 220, easing: 'cubic-bezier(.4,0,.2,1)' }
                    );
                    anim.onfinish = () => {
                        d.open = false;
                        d.classList.remove('closing');
                        content.style.overflow = '';
                        animating = false;
                    };
                }
            });
        });
    })();

    /* ---------- 4. The falls ---------- */
    /* An Ithaca gorge falls in side profile: a shale cliff on the left,
       the creek running along the clifftop, water pouring over the brink
       into a plunge pool, and the stream flowing off to the right.
       Value noise advected with the flow keeps the motion coherent (no
       per-frame flicker); the fall's sample grid is stretched toward the
       bottom so streaks elongate as the water accelerates. */
    const falls = (function () {
        const canvas = document.getElementById('falls-canvas');
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');

        const FONT = 12, CH = 12;
        let CW = 7.2, cols = 0, rows = 0, poolRows = 3;
        let ink = hexToRgb(inkColor());
        let visible = false, running = false, t = 0, lastT = null;

        const splashes = [];  // {x, age, power}
        const drops = [];     // ballistic spray particles
        let rider = null;     // set by the easter egg

        function hash(ix, iy) {
            let h = (ix * 374761393 + iy * 668265263) | 0;
            h = Math.imul(h ^ (h >>> 13), 1274126177);
            return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
        }
        const sm = t => t * t * (3 - 2 * t);
        function noise2(x, y) {
            const ix = Math.floor(x), iy = Math.floor(y);
            const fx = sm(x - ix), fy = sm(y - iy);
            const a = hash(ix, iy), b = hash(ix + 1, iy);
            const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
            return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
        }

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.offsetWidth, h = canvas.offsetHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.font = FONT + "px 'Courier New', Courier, monospace";
            ctx.textBaseline = 'top';
            CW = ctx.measureText('M').width || 7.2;
            cols = Math.ceil(w / CW);
            rows = Math.floor(h / CH);
        }

        function boostAt(cx) {
            let b = 0;
            for (const s of splashes) {
                const dx = cx - s.x;
                b += s.power * Math.exp(-(dx * dx) / 20) * (1 - s.age);
            }
            return b;
        }

        const FALL_RAMP = [' ', '.', ':', ';', '!', '|'];
        const MIST_RAMP = ['"', '*', 'o'];
        const ROCK_RAMP = [':', '%', '#'];
        const BAND = 8; // width of the falling curtain, in cells

        function brinkCol() { return Math.floor(cols * 0.34); }
        function surfaceRow() { return rows - poolRows; }
        function cliffEdge(cy) {
            return brinkCol() - 1 + Math.round(2 * noise2(0.5, cy * 0.35) - 1);
        }

        function draw(dt) {
            t += dt;
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
            const [r, g, b] = ink;
            const brink = brinkCol();
            const surface = surfaceRow();
            const plunge = brink + 2 + BAND / 2;

            // the creek along the clifftop, accelerating into the brink
            for (let cy = 0; cy < 2; cy++) {
                for (let cx = 0; cx < brink + 2; cx++) {
                    const rush = 1 + Math.max(0, (cx - brink + 10) / 8);
                    let v = noise2(cx * 0.13 - t * 1.6 * rush, cy * 4 + 2.2);
                    v *= Math.min(1, cx / 3) * (0.75 + 0.25 * cy);
                    if (v < 0.3) continue;
                    const ch = cy === 0 ? (v > 0.6 ? '~' : '-') : (v > 0.6 ? '-' : '.');
                    ctx.fillStyle = `rgba(${r},${g},${b},${(0.2 + 0.55 * v).toFixed(3)})`;
                    ctx.fillText(ch, cx * CW, cy * CH);
                }
            }

            // the shale cliff: a mostly bare face, horizontal strata, a firm edge
            for (let cy = 2; cy < rows; cy++) {
                const edge = cliffEdge(cy);
                const strataRow = cy % 4 === 1;
                for (let cx = 0; cx <= edge; cx++) {
                    const h = hash(cx, cy);
                    if (cx === edge) {
                        ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
                        ctx.fillText('#', cx * CW, cy * CH);
                    } else if (strataRow && h > 0.25) {
                        ctx.fillStyle = `rgba(${r},${g},${b},${(0.16 + 0.14 * h).toFixed(3)})`;
                        ctx.fillText(h > 0.8 ? '=' : '-', cx * CW, cy * CH);
                    } else if (!strataRow && h > 0.82) {
                        ctx.fillStyle = `rgba(${r},${g},${b},${(0.1 + 0.25 * (h - 0.82)).toFixed(3)})`;
                        ctx.fillText(ROCK_RAMP[Math.min(2, Math.floor((h - 0.82) * 12))], cx * CW, cy * CH);
                    }
                }
            }

            // the falls: over the brink, hugging the cliff down to the pool
            for (let cy = 1; cy < surface; cy++) {
                const arc = Math.min(2.5, Math.pow(cy / 6, 1.4)); // slight throw off the lip
                const x0 = brink + 1 + Math.round(arc);
                const wy = Math.pow(cy / surface, 0.62) * surface; // acceleration stretch
                for (let i = 0; i < BAND; i++) {
                    const cx = x0 + i;
                    const prof = 0.4 + 0.6 * Math.sin((i + 0.5) / BAND * Math.PI); // dense core, soft edges
                    let v = 0.72 * noise2(cx * 0.45, wy * 0.24 - t * 3.2)
                        + 0.28 * noise2(cx * 1.1 + 40, wy * 0.55 - t * 5.2);
                    v *= (0.55 + 0.75 * prof);
                    if (cy < 3) v = Math.max(v, 0.65 * prof); // solid sheet at the lip
                    if (v < 0.32) continue;
                    const idx = Math.min(FALL_RAMP.length - 1,
                        1 + Math.floor((v - 0.32) / 0.68 * (FALL_RAMP.length - 1)));
                    ctx.fillStyle = `rgba(${r},${g},${b},${(0.15 + 0.75 * v).toFixed(3)})`;
                    ctx.fillText(FALL_RAMP[idx], cx * CW, cy * CH);
                }
                // stray spray off the curtain
                if (noise2(cy * 0.8, t * 4) > 0.82) {
                    ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
                    ctx.fillText('.', (x0 + BAND + 1) * CW, cy * CH);
                }
            }

            // plunge mist
            for (let m = -2; m <= 0; m++) {
                const cy = surface + m;
                for (let cx = plunge - 6; cx < plunge + BAND + 4; cx++) {
                    let v = noise2(cx * 0.5, t * 3.4 + cy * 7) * (1 - Math.abs(m) * 0.25);
                    v += boostAt(cx);
                    if (v < 0.52) continue;
                    const idx = Math.min(MIST_RAMP.length - 1, Math.floor((v - 0.5) * 4));
                    ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.6, 0.15 + 0.45 * v).toFixed(3)})`;
                    ctx.fillText(MIST_RAMP[idx], cx * CW, cy * CH);
                }
            }

            // the pool, calming into a stream that exits right
            for (let p = 0; p < poolRows; p++) {
                const cy = surface + p;
                const rockEdge = cliffEdge(cy);
                for (let cx = rockEdge + 1; cx < cols; cx++) {
                    const dist = Math.max(0, cx - plunge);
                    const amp = 0.45 + 0.55 * Math.exp(-dist / 16);
                    let v = Math.max(
                        noise2(cx * 0.15 - t * 1.5, 3.3 + p * 4),
                        0.85 * noise2(cx * 0.15 - t * 0.9, 9.9 + p * 4)
                    );
                    v = v * amp * (1 - p * 0.22) + boostAt(cx) * 0.6;
                    v *= Math.min(1, (cols - 1 - cx) / 3);
                    if (v < 0.3) continue;
                    const ch = p === 0 ? (v > 0.56 ? '~' : '-') : (v > 0.6 ? '-' : '.');
                    ctx.fillStyle = `rgba(${r},${g},${b},${(0.15 + 0.5 * v).toFixed(3)})`;
                    ctx.fillText(ch, cx * CW, cy * CH);
                }
            }

            // spray particles
            for (let i = drops.length - 1; i >= 0; i--) {
                const d = drops[i];
                d.life -= dt;
                if (d.life <= 0) { drops.splice(i, 1); continue; }
                d.vy += 420 * dt;
                d.x += d.vx * dt;
                d.y += d.vy * dt;
                const ch = d.life > 0.45 ? '*' : (d.life > 0.2 ? 'o' : '.');
                ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, d.life * 2).toFixed(3)})`;
                ctx.fillText(ch, d.x, d.y);
            }

            // splash decay
            for (let i = splashes.length - 1; i >= 0; i--) {
                splashes[i].age += dt * 1.1;
                if (splashes[i].age >= 1) splashes.splice(i, 1);
            }

            if (rider) rider(dt);
        }

        function frame(now) {
            if (!running) { lastT = null; return; }
            if (lastT === null) lastT = now;
            const dt = Math.min((now - lastT) / 1000, 0.05);
            lastT = now;
            draw(dt);
            requestAnimationFrame(frame);
        }
        function start() {
            if (running || REDUCED) return;
            running = true;
            requestAnimationFrame(frame);
        }
        function stop() { running = false; }

        resize();
        if (REDUCED) {
            t = 8;
            draw(0); // a single still frame
        } else {
            new IntersectionObserver((entries) => {
                visible = entries[0].isIntersecting;
                (visible && !document.hidden) ? start() : stop();
            }).observe(canvas);
            document.addEventListener('visibilitychange', () => {
                (visible && !document.hidden) ? start() : stop();
            });
        }
        window.addEventListener('resize', () => { resize(); if (REDUCED) draw(0); });

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onTheme = () => { ink = hexToRgb(inkColor()); if (REDUCED) draw(0); };
        if (mq.addEventListener) mq.addEventListener('change', onTheme);
        else if (mq.addListener) mq.addListener(onTheme);

        return {
            canvas, ctx,
            splash(x, power) {
                splashes.push({ x: x / CW, age: 0, power });
                const n = Math.round(8 + power * 7);
                for (let i = 0; i < n; i++) {
                    drops.push({
                        x: x + (Math.random() - 0.5) * (18 + power * 14),
                        y: (rows - poolRows) * CH - 4,
                        vx: (Math.random() - 0.5) * (60 + power * 40),
                        vy: -60 - Math.random() * (90 + power * 50),
                        life: 0.4 + Math.random() * 0.5
                    });
                }
            },
            setRider(fn) { rider = fn; },
            surfaceY() { return (rows - poolRows) * CH; },
            plungeX() { return (brinkCol() + 2 + BAND / 2) * CW; },
            width() { return canvas.offsetWidth; }
        };
    })();

    /* ---------- 5. Easter egg: type "merry" ---------- */
    /* The Going Merry comes over the falls, rights herself in the
       plunge pool, and sails off downstream. */
    (function () {
        if (!falls || REDUCED) return;

        const ROWS = [
            '....................X',
            '....................Xrrrr',
            '....................Xrr',
            '....................X',
            '.......XXXXXXXXXXXXXXXXXXXXXXXXX',
            '.......XwwwwwwwwwwwwwwwwwwwwwwwX',
            '.......XwwwwwwwwwwyyyyyywwwwwwwX',
            '.......XwwwwwwwwwwwyyyywwwwwwwwX',
            '.......XwwwwwwwwwwwkkkkwwwwwwwwX',
            '.......XwwwwwwwwwwkkkkkkwwwwwwwX',
            '.......XwwwwwwwwwwwkkkkwwwwwwwwX',
            '.......XXwwwwwwwkwwwwwwwwkwwwwXX',
            '........XXwwwwwwwwwwwwwwwwwwwXX',
            '....................X',
            '....................X.........XXXX',
            '....................X........XwwwwX',
            '....................X........XwXXwwX',
            '..XXX...............X.......XwwwwwwX',
            '..XwdX..............X.......XwwwwwwwX',
            '..XddX..............X........XwwwwwwX',
            '..XXdXXXXXXXXXXXXXXXXXXXXXXXXXwwwwwwX',
            '...XdddddddddddddddddddddddddXwwwwwX',
            '...XoooooooooooooooooooooooooXXwwXX',
            '....XoodddddddddddddddddddddooXXX',
            '....XoooooooooooooooooooooooooX',
            '.....XOooooooooooooooooooooooX',
            '......XOOooooooooooooooooooOX',
            '.......XOOOOOOOOOOOOOOOOOOOX',
            '........XXXXXXXXXXXXXXXXXXX'
        ].map(row => row.padEnd(42, '.'));
        const PAL = {
            X: [30, 28, 32], w: [228, 214, 180], k: [40, 38, 42],
            y: [224, 192, 74], r: [166, 52, 46], o: [200, 124, 64],
            O: [152, 88, 42], d: [222, 174, 110]
        };
        const SCALE = 3;

        const merry = (function () {
            const cv = document.createElement('canvas');
            cv.width = 42 * SCALE;
            cv.height = ROWS.length * SCALE;
            const c = cv.getContext('2d');
            ROWS.forEach((row, y) => {
                for (let x = 0; x < row.length; x++) {
                    const col = PAL[row[x]];
                    if (!col) continue;
                    c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
                    c.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
                }
            });
            return cv;
        })();

        let playing = false;

        function voyage() {
            playing = true;
            const ctx = falls.ctx;
            ctx.imageSmoothingEnabled = false;
            const W = falls.width();
            const surface = falls.surfaceY();
            const plunge = falls.plungeX();
            const H = merry.height;
            const DROP = 2.0, UNDER = 0.55;
            const waterline = surface - H + 14; // hull sits in the water
            const driftEnd = W - 40;
            let elapsed = 0, splashed = false;

            falls.setRider((dt) => {
                elapsed += dt;

                if (elapsed < DROP) {
                    // bow tips over the brink, then the whole ship goes
                    const p = elapsed / DROP;
                    const y = -H + (surface - H * 0.6 + H) * p * p;
                    const x = plunge + Math.sin(elapsed * 3) * 4;
                    const rot = 0.1 + p * 0.28; // nosing down as she falls
                    ctx.save();
                    ctx.translate(x, y + H / 2);
                    ctx.rotate(rot);
                    ctx.drawImage(merry, -merry.width / 2, -H / 2);
                    ctx.restore();
                } else if (!splashed) {
                    splashed = true;
                    falls.splash(plunge, 2.4);
                    falls.splash(plunge + 24, 1.2);
                } else if (elapsed > DROP + UNDER) {
                    // she rights herself and sails off downstream
                    const d = elapsed - DROP - UNDER;
                    const x = plunge + 30 + d * 34;
                    if (x > driftEnd + 40) { falls.setRider(null); playing = false; return; }
                    const y = waterline + Math.sin(d * 1.8) * 2.5;
                    const rot = Math.sin(d * 1.8 + 0.5) * 0.05;
                    const alpha = x > driftEnd - 50 ? Math.max(0, (driftEnd + 40 - x) / 90) : 1;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.translate(x, y + H / 2);
                    ctx.rotate(rot);
                    ctx.drawImage(merry, -merry.width / 2, -H / 2);
                    ctx.restore();
                }
            });
        }

        let buffer = '';
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key.length !== 1) return;
            buffer = (buffer + e.key.toLowerCase()).slice(-5);
            if (buffer === 'merry' && !playing) {
                buffer = '';
                falls.canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(voyage, 600);
            }
        });
    })();
})();
