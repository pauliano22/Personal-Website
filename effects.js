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
    /* The last section's title underline is the clifftop: a creek runs
       along the rule, past the title text, and pours off its right end
       down the page margin into a plunge pool, which drains off the
       right edge of the screen. Value noise advected with the flow keeps
       the motion coherent (no per-frame flicker); the fall's sample grid
       is stretched toward the bottom so streaks elongate as the water
       accelerates. */
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

        let ledge = null; // the title underline, in canvas coordinates

        function measure() {
            const title = document.querySelector('.page-after-falls .section-title');
            if (!title) { ledge = null; return; }
            const cr = canvas.getBoundingClientRect();
            const tr = title.getBoundingClientRect();
            const cs = getComputedStyle(title);
            const prevFont = ctx.font;
            ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
            const text = (title.dataset.full || title.textContent).trim();
            const spacing = parseFloat(cs.letterSpacing) || 0;
            const textW = ctx.measureText(text.toUpperCase()).width + spacing * text.length;
            ctx.font = prevFont;
            const hobbies = document.querySelector('.page-after-falls .hobbies');
            let hr = null;
            if (hobbies) {
                const range = document.createRange();
                range.selectNodeContents(hobbies);
                hr = range.getBoundingClientRect(); // the text itself, not the block
            }
            ledge = {
                x0: tr.left - cr.left,
                x1: tr.right - cr.left,
                y: tr.bottom - cr.top,
                creekX: tr.left - cr.left + textW + 30,
                // keep the rock clear of the text block beside it
                guardBottom: hr ? hr.bottom - cr.top : 0,
                guardRight: hr ? hr.right - cr.left + 10 : 0
            };
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
            measure();
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
        const BAND = 8; // width of the falling curtain, in cells

        function draw(dt) {
            t += dt;
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
            if (!ledge) return;
            const [r, g, b] = ink;
            const surface = rows - poolRows;
            const ledgeRow = Math.floor(ledge.y / CH);
            // where the underline ends — pulled in when the viewport leaves
            // no room for the curtain to its right
            const brinkC = Math.min(Math.floor(ledge.x1 / CW), cols - BAND + 2);
            const creekC0 = Math.ceil(ledge.creekX / CW);
            const fallH = Math.max(1, surface - ledgeRow);
            const plunge = brinkC + 1 + BAND / 2;

            // the creek: riding the title's underline, just past the text
            for (let k = 0; k < 2; k++) {
                const cy = ledgeRow - 1 - k;
                if (cy < 0) break;
                for (let cx = creekC0; cx <= brinkC + 1; cx++) {
                    const rush = 1 + Math.max(0, (cx - brinkC + 10) / 8);
                    let v = noise2(cx * 0.13 - t * 1.6 * rush, k * 4 + 2.2);
                    v *= Math.min(1, (cx - creekC0) / 3) * (1 - k * 0.45);
                    if (v < (k === 0 ? 0.3 : 0.5)) continue;
                    const ch = k === 0 ? (v > 0.6 ? '~' : '-') : (v > 0.62 ? "'" : '.');
                    ctx.fillStyle = `rgba(${r},${g},${b},${(0.2 + 0.55 * v).toFixed(3)})`;
                    ctx.fillText(ch, cx * CW, cy * CH);
                }
            }

            // the shale lip under the brink: thin laminated beds — resistant
            // ('=') and soft (broken '-' and '.') laminae with weathered gaps,
            // faint vertical joints, a stepped '#' face — undercut near the
            // top and bulging further down, kept clear of the text beside it
            const guardRow = Math.floor(ledge.guardBottom / CH);
            const guardCol = Math.ceil(ledge.guardRight / CW);
            for (let cy = ledgeRow; cy < surface; cy++) {
                const depth = cy - ledgeRow;
                const band = Math.floor(cy / 3);
                const edge = brinkC + Math.round(1.6 * noise2(3.3, band * 1.31) - 0.8);
                const grow = depth < 5 ? 0 : (depth - 5) * 0.7;
                const width = Math.min(13, 3 + grow + 2 * noise2(7.7, band * 0.9));
                let left = edge - width;
                if (cy <= guardRow) left = Math.max(left, guardCol);
                const bed = noise2(0.7, cy * 1.7); // this layer's resistance
                for (let cx = Math.max(0, Math.floor(left)); cx <= edge; cx++) {
                    if (cx === edge) {
                        ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
                        ctx.fillText('#', cx * CW, cy * CH);
                        continue;
                    }
                    const fade = Math.min(1, (cx - left) / 2.5);
                    if (noise2(cx * 1.7, 44.4) > 0.9 && hash(cx, cy) > 0.35) {
                        ctx.fillStyle = `rgba(${r},${g},${b},${(0.17 * fade).toFixed(3)})`;
                        ctx.fillText(':', cx * CW, cy * CH);
                        continue;
                    }
                    const seg = noise2(cx * 0.14 + cy * 3.1, cy * 5.7);
                    const v = seg * (0.55 + 0.45 * bed) * fade;
                    if (v < 0.3) continue;
                    const ch = bed > 0.6 ? (v > 0.5 ? '=' : '-') : (v > 0.52 ? '-' : '.');
                    const a = (0.1 + 0.3 * v + (bed > 0.6 ? 0.08 : 0)) * fade;
                    ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
                    ctx.fillText(ch, cx * CW, cy * CH);
                }
            }

            // the falls: off the right end of the line, down the margin
            for (let cy = ledgeRow; cy < surface; cy++) {
                const depth = cy - ledgeRow;
                const arc = Math.min(2.5, Math.pow(depth / 6, 1.4)); // throw off the lip
                const x0 = brinkC + 1 + Math.round(arc);
                const wy = Math.pow(depth / fallH, 0.62) * fallH; // acceleration stretch
                for (let i = 0; i < BAND; i++) {
                    const cx = x0 + i;
                    if (cx >= cols) break;
                    const prof = 0.4 + 0.6 * Math.sin((i + 0.5) / BAND * Math.PI); // dense core, soft edges
                    let v = 0.72 * noise2(cx * 0.45, wy * 0.24 - t * 3.2)
                        + 0.28 * noise2(cx * 1.1 + 40, wy * 0.55 - t * 5.2);
                    v *= (0.55 + 0.75 * prof);
                    if (depth < 3) v = Math.max(v, 0.65 * prof); // solid sheet at the lip
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
                    if (cx >= cols) break;
                    let v = noise2(cx * 0.5, t * 3.4 + cy * 7) * (1 - Math.abs(m) * 0.25);
                    v += boostAt(cx);
                    if (v < 0.52) continue;
                    const idx = Math.min(MIST_RAMP.length - 1, Math.floor((v - 0.5) * 4));
                    ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.6, 0.15 + 0.45 * v).toFixed(3)})`;
                    ctx.fillText(MIST_RAMP[idx], cx * CW, cy * CH);
                }
            }

            // the pool, spreading into a stream that runs off the screen
            for (let p = 0; p < poolRows; p++) {
                const cy = surface + p;
                const px0 = plunge - 10;
                for (let cx = px0; cx < cols; cx++) {
                    const dist = Math.max(0, cx - plunge);
                    const amp = 0.42 + 0.58 * Math.exp(-dist / 16);
                    let v = Math.max(
                        noise2(cx * 0.15 - t * 1.5, 3.3 + p * 4),
                        0.85 * noise2(cx * 0.15 - t * 0.9, 9.9 + p * 4)
                    );
                    v = v * amp * (1 - p * 0.22) + boostAt(cx) * 0.6;
                    v *= Math.min(1, (cx - px0) / 4);
                    if (v < 0.3) continue;
                    const ch = p === 0 ? (v > 0.56 ? '~' : '-') : (v > 0.6 ? '-' : '.');
                    ctx.fillStyle = `rgba(${r},${g},${b},${(0.15 + 0.5 * v).toFixed(3)})`;
                    ctx.fillText(ch, cx * CW, cy * CH);
                }
            }

            // reeds on the bank at the foot of the rock, swaying in the spray
            for (let s = 0; s < 5; s++) {
                const rx = brinkC - 3 - s * 1.4 - noise2(s * 9.1, 0.3);
                if (rx < 1) break;
                const tall = 2 + (s * 7) % 3;
                const sway = Math.sin(t * 1.1 + s * 1.7) * 2;
                for (let k = 0; k <= tall; k++) {
                    const cy = surface - 1 - k;
                    const px = rx * CW + sway * (k / tall);
                    const ch = k === tall ? "'" : '|';
                    ctx.fillStyle = `rgba(${r},${g},${b},${k === tall ? 0.5 : 0.38})`;
                    ctx.fillText(ch, px, cy * CH);
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
        window.addEventListener('load', () => { measure(); if (REDUCED) draw(0); });

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
            plungeX() {
                if (!ledge) return canvas.offsetWidth * 0.7;
                return (Math.min(Math.floor(ledge.x1 / CW), cols - BAND + 2) + 1 + BAND / 2) * CW;
            },
            brinkX() {
                if (!ledge) return canvas.offsetWidth * 0.7;
                return Math.min(ledge.x1, (cols - BAND + 2) * CW);
            },
            creekY() { return ledge ? ledge.y : 0; },
            lineX0() { return ledge ? ledge.x0 : 0; },
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
            const brink = falls.brinkX();
            const H = merry.height;
            const deckY = falls.creekY() - H + 6; // hull riding the underline
            const waterline = surface - H + 14;   // hull sitting in the pool
            const xStart = falls.lineX0() + merry.width / 2;
            const xEnd = brink - 16;
            const SAIL_IN = Math.max(1.8, (xEnd - xStart) / 180);
            const DROP = 1.4, UNDER = 0.55;
            const outSpeed = Math.max(70, (W + merry.width - plunge - 30) / 7);
            let elapsed = 0, splashed = false;

            falls.setRider((dt) => {
                elapsed += dt;

                if (elapsed < SAIL_IN) {
                    // along the underline, past the title, toward the edge
                    const p = elapsed / SAIL_IN;
                    const x = xStart + (xEnd - xStart) * p;
                    const y = deckY + Math.sin(elapsed * 2.2) * 1.5;
                    ctx.save();
                    ctx.translate(x, y + H / 2);
                    ctx.rotate(Math.sin(elapsed * 2.2 + 0.4) * 0.03);
                    ctx.drawImage(merry, -merry.width / 2, -H / 2);
                    ctx.restore();
                } else if (elapsed < SAIL_IN + DROP) {
                    // over the edge of the line and down the falls
                    const p = (elapsed - SAIL_IN) / DROP;
                    const x = xEnd + 20 * p + (plunge - xEnd - 20) * p * p;
                    const y = deckY + (surface - H * 0.6 - deckY) * p * p;
                    const rot = 0.12 + 0.36 * Math.min(1, p * 1.6); // nosing down
                    ctx.save();
                    ctx.translate(x, y + H / 2);
                    ctx.rotate(rot);
                    ctx.drawImage(merry, -merry.width / 2, -H / 2);
                    ctx.restore();
                } else if (!splashed) {
                    splashed = true;
                    falls.splash(plunge, 2.4);
                    falls.splash(plunge + 24, 1.2);
                } else if (elapsed > SAIL_IN + DROP + UNDER) {
                    // she rights herself and sails off the edge of the screen
                    const d = elapsed - SAIL_IN - DROP - UNDER;
                    const x = plunge + 30 + d * outSpeed;
                    if (x > W + merry.width) { falls.setRider(null); playing = false; return; }
                    const y = waterline + Math.sin(d * 1.8) * 2.5;
                    const rot = Math.sin(d * 1.8 + 0.5) * 0.05;
                    ctx.save();
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
