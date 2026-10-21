(function () {
    var $ = function (s) { return document.querySelector(s); };

    /* Roadster side profile: ~2.7 m wheelbase, ~1.1 m tall, long low hood, raked windshield, glass targa roof, short tail */
    var BODY = "M752 205 C752 192 740 184 700 176 C650 166 590 150 535 140 C500 118 470 96 430 84 C400 76 340 74 300 80 C240 90 180 118 120 132 C90 136 66 140 58 152 L56 200 C56 216 62 226 74 230 L740 232 C750 230 752 218 752 205 Z";
    var GLASS = "M535 140 C500 118 470 96 430 86 C400 78 340 76 300 82 C255 90 215 108 180 122 L535 140 Z";

    function wheel(x) {
        var s = "";
        for (var i = 0; i < 5; i++) {
            var a = i * 72 * Math.PI / 180;
            s += '<line class="spk" x1="' + x + '" y1="200" x2="' + (x + Math.sin(a) * 33) + '" y2="' + (200 - Math.cos(a) * 33) + '"/>';
        }
        return '<circle class="well" cx="' + x + '" cy="200" r="57"/><g class="wheel">' +
            '<circle class="tire o" cx="' + x + '" cy="200" r="50"/><circle class="rim o" cx="' + x + '" cy="200" r="36"/>' +
            s + '<circle class="hub" cx="' + x + '" cy="200" r="7"/></g>';
    }

    function car() {
        return '<svg class="car" viewBox="0 0 800 280"><ellipse cx="405" cy="252" rx="350" ry="8" fill="#000" opacity=".25"/><g class="rig"><g class="fills">' +
            '<path class="body" d="' + BODY + '"/><path d="' + BODY + '" fill="url(#shade)"/>' +
            '<rect class="seat" x="250" y="112" width="18" height="24" rx="8"/><rect class="seat" x="318" y="102" width="22" height="34" rx="10"/><rect class="seat" x="386" y="106" width="22" height="30" rx="10"/>' +
            '<path class="glass" d="' + GLASS + '"/><path class="screen" d="M535 140 C505 118 480 98 452 90"/>' +
            '<path class="lights" d="M722 183 C736 186 747 192 751 201 L722 194 Z"/><path class="tail" d="M59 156 L59 178"/>' +
            wheel(200) + wheel(620) +
            '</g><g class="lines"><path class="o" d="' + BODY + '"/><path class="o" d="' + GLASS + '"/>' +
            '<path class="o" d="M330 136 C326 170 326 205 332 228"/><path class="o" d="M500 142 C498 170 500 200 506 228"/><path class="o" d="M440 160 L470 160"/></g></g></svg>';
    }
    $('#heroCar').innerHTML = car();
    $('#cfgCar').innerHTML = car();
    $('#cfgCar .lines').style.opacity = '.35';

    /* scroll-driven intro */
    var track = $('#track'), hero = $('#heroCar');
    var lines = [].slice.call(hero.querySelectorAll('.o')), fills = hero.querySelector('.fills');
    var len = lines.map(function (e) { var l = e.getTotalLength(); e.style.strokeDasharray = l; e.style.strokeDashoffset = l; return l; });
    var spec = $('#spec'), num = $('#num'), tick = $('#ticker'), word = $('#word'), hint = $('#hint');
    function c(x, a, b) { return Math.min(1, Math.max(0, (x - a) / (b - a))); }
    var still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    function render() {
        var r = track.getBoundingClientRect(), p = still ? 0.85 : c(-r.top, 0, r.height - innerHeight);
        lines.forEach(function (e, i) { e.style.strokeDashoffset = len[i] * (1 - c(p, 0, 0.45)); });
        fills.style.opacity = c(p, 0.4, 0.55);
        word.style.opacity = c(p, 0.6, 0.75) * 0.9;
        spec.style.opacity = c(p, 0.5, 0.6);
        num.textContent = (1.9 * c(p, 0.52, 0.68)).toFixed(1);
        tick.style.transform = 'translateX(' + (105 - 105 * c(p, 0.58, 0.72)) + '%)';
        hint.style.opacity = 1 - c(p, 0, 0.05);
    }
    addEventListener('scroll', render, { passive: true });
    addEventListener('resize', render);
    render();
    $('#goCfg').onclick = function () { $('#configure').scrollIntoView(); };

    /* paint */
    var cols = [["Pearl White", "#e8eaec"], ["Midnight Silver", "#6e7479"], ["Deep Blue", "#1f3a6e"], ["Red Multi-Coat", "#b3121c"], ["Solid Black", "#15171a"]];
    var sw = $('#sw');
    cols.forEach(function (k, i) {
        var b = document.createElement('button');
        b.style.background = k[1];
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', k[0]);
        b.setAttribute('aria-checked', i == 3);
        b.onclick = function () {
            document.documentElement.style.setProperty('--paint', k[1]);
            $('#cname').textContent = k[0];
            [].forEach.call(sw.children, function (x, j) { x.setAttribute('aria-checked', j == i); });
        };
        sw.appendChild(b);
    });
    $('#cname').textContent = "Red Multi-Coat";

    /* roof */
    var cfg = $('#cfgCar'), roofBtn = $('#roofBtn');
    roofBtn.onclick = function () {
        var off = cfg.classList.toggle('noroof');
        roofBtn.setAttribute('aria-pressed', off);
        roofBtn.textContent = off ? 'Put roof on' : 'Remove roof';
    };

    /* optional real photo: put your own file at images/roadster.jpg */
    var photo = $('#photo'), photoBtn = $('#photoBtn'), wrap = $('#wrap');
    function checkPhoto() { if (photo.naturalWidth) photoBtn.hidden = false; }
    photo.addEventListener('load', checkPhoto);
    checkPhoto();
    photoBtn.onclick = function () {
        var on = wrap.classList.toggle('showphoto');
        photo.hidden = false;
        photoBtn.setAttribute('aria-pressed', on);
        photoBtn.textContent = on ? 'Show drawing' : 'Show photo';
    };

    /* hotspots */
    var info = {
        battery: ["200 kWh battery", "A very large pack in the floor. Tesla’s target range is 620 miles (1,000 km) on one charge."],
        motors: ["Three motors, all-wheel drive", "One motor up front and two at the rear. Tesla quotes 10,000 Nm (7,376 lb-ft) of wheel torque."],
        roof: ["Removable glass roof", "The roof panel lifts off for open-air driving. Use the Remove roof button to try it."],
        space: ["SpaceX package (optional)", "Cold-gas thrusters built into the car. Tesla claims 0–60 mph in about 1.1 seconds with it."]
    };
    var dots = [].slice.call(document.querySelectorAll('.dot'));
    dots.forEach(function (d) {
        d.onclick = function () {
            dots.forEach(function (x) { x.setAttribute('aria-pressed', x == d); });
            var i = info[d.dataset.k];
            $('#info').innerHTML = '<b>' + i[0] + '</b>' + i[1];
            if (d.dataset.k == 'space' && !space) spaceBtn.click();
        };
    });

    /* launch */
    var space = false, spaceBtn = $('#spaceBtn'), busy = false;
    spaceBtn.onclick = function () { space = !space; spaceBtn.setAttribute('aria-pressed', space); };
    $('#launch').onclick = function () {
        if (busy) return;
        busy = true;
        var L = $('#launch'), show = $('#show');
        L.disabled = true; show.classList.add('go'); cfg.classList.add('go');
        var T = space ? 1.1 : 1.9, t0 = performance.now();
        (function f(now) {
            var e = Math.min(T, (now - t0) / 1000);
            $('#t').textContent = e.toFixed(1);
            $('#mph').textContent = Math.round(60 * e / T);
            if (e < T) requestAnimationFrame(f);
            else setTimeout(function () { show.classList.remove('go'); cfg.classList.remove('go'); L.disabled = false; busy = false; }, 1200);
        })(t0);
    };
})();