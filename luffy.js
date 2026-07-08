/* 8-bit Luffy, ported from my "Merry Voyage" Lively wallpaper.
   He walks the perimeter of the viewport — along the bottom, up the right
   wall, across the top, down the left — forever. Decorative only:
   pointer-events none, hidden if the visitor prefers reduced motion. */
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // --- Sprite (16x22), same rows + palette as the wallpaper ---
    const ROWS = [
        '.....XXXXXX.....',
        '....XhhhhhhX....',
        '...XhhhhhhhhX...',
        '...XhhhhhhhhX...',
        '...XRRRRRRRRX...',
        '.XXhhhhhhhhhhXX.',
        'XHHHHHHHHHHHHHHX',
        '..XkkkkkkkkkX...',
        '..XkssssssskX...',
        '..XssesssessX...',
        '..XsssssssssX...',
        '..XssSSSssssX...',
        '...XsssssssX....',
        '.XrrrsssssrrX...',
        'XsXrrseesssrXsX.',
        'XsXrrsssssrrXsX.',
        '.ssXrrrrrrrXss..',
        '...XyyyyyyyX....',
        '...XbbbbbbbX....',
        '....XbbX.XbbX...',
        '....XssX.XssX...',
        '....XddX.XddX...'
    ];
    const PAL = {
        X: [30, 28, 32], h: [206, 182, 112], H: [174, 150, 88], R: [166, 52, 46],
        k: [40, 38, 42], s: [222, 186, 148], S: [190, 152, 116], e: [36, 32, 36],
        r: [172, 58, 50], y: [224, 192, 74], b: [70, 94, 120], d: [92, 70, 50]
    };

    const SCALE = 2, W = 16 * SCALE, H = 22 * SCALE;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    ROWS.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const col = PAL[row[x]];
            if (!col) continue;
            c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
            c.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
    });

    const el = document.createElement('div');
    el.appendChild(cv);
    el.style.cssText =
        'position:fixed;left:0;top:0;width:' + W + 'px;height:' + H + 'px;' +
        'pointer-events:none;z-index:9999;image-rendering:pixelated;will-change:transform;';
    document.body.appendChild(el);

    // --- Perimeter walk ---
    // Edges: 0 bottom (left->right), 1 right (bottom->top),
    //        2 top (right->left), 3 left (top->bottom)
    const SPEED = 28;          // px per second
    let edge = 0, dist = Math.random() * 200, lastT = null;

    function frame(t) {
        if (lastT === null) lastT = t;
        const dt = Math.min((t - lastT) / 1000, 0.1);
        lastT = t;
        dist += SPEED * dt;

        const vw = window.innerWidth, vh = window.innerHeight;
        const lens = [vw - W, vh - H, vw - W, vh - H];
        if (dist >= lens[edge]) { dist = 0; edge = (edge + 1) % 4; }

        // 8-bit gait: a 1px bob and a small lean, stepped (not smoothed)
        const step = Math.floor(t / 180) % 2;
        const bob = step * SCALE;
        const lean = step ? 4 : -4;

        let x, y, rot;
        if (edge === 0) {       // bottom, walking right
            x = dist; y = vh - H + bob; rot = 0;
        } else if (edge === 1) { // right wall, climbing up
            x = vw - W + bob; y = vh - H - dist; rot = -90;
        } else if (edge === 2) { // top, walking left, hanging upside down
            x = vw - W - dist; y = bob; rot = 180;
        } else {                // left wall, climbing down
            x = bob; y = dist; rot = 90;
        }

        el.style.transform =
            `translate(${x | 0}px,${y | 0}px) rotate(${rot + lean}deg)`;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
