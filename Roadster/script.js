(function () {
    var track = document.getElementById('track');
    var arc = document.getElementById('arc'), car = document.getElementById('car');
    var wheels = document.querySelectorAll('#wheels circle');
    var solid = document.getElementById('solid'), ticker = document.getElementById('ticker');
    var spec = document.getElementById('spec'), num = document.getElementById('num');
    var vs = [v1, v2, v3], letters = document.querySelectorAll('#brand i'), hint = document.getElementById('hint');
    var all = [arc, car].concat([].slice.call(wheels));
    var len = all.map(function (e) { var l = e.getTotalLength(); e.style.strokeDasharray = l; e.style.strokeDashoffset = l; return l; });
    var scenes = [[arc, 0, 0.3], [car, 0.05, 0.4], [wheels[0], 0.3, 0.4], [wheels[1], 0.3, 0.4], [wheels[2], 0.3, 0.4], [wheels[3], 0.3, 0.4]];
    function c(x, a, b) { return Math.min(1, Math.max(0, (x - a) / (b - a))); }
    function render() {
        var r = track.getBoundingClientRect();
        var p = c(-r.top, 0, r.height - innerHeight);
        all.forEach(function (e, i) { var s = scenes[i]; e.style.strokeDashoffset = len[i] * (1 - c(p, s[1], s[2])); });
        var fade = 1 - c(p, 0.62, 0.74);
        document.getElementById('stage').querySelector('svg').style.opacity = fade;
        solid.style.opacity = c(p, 0.38, 0.48);
        vs.forEach(function (v, i) { var a = c(p, 0.42 + i * 0.03, 0.54 + i * 0.03) * (1 - c(p, 0.62, 0.72)); v.style.opacity = a; v.style.transform = 'translate(' + ((1 - c(p, 0.42, 0.7)) * (i - 1) * -60) + 'px,' + (-c(p, 0.42, 0.7) * 40 * (i + 1)) + 'px)'; });
        ticker.style.transform = 'translateX(' + (105 - 105 * c(p, 0.46, 0.62)) + '%)';
        ticker.style.opacity = 1 - c(p, 0.78, 0.86);
        spec.style.opacity = c(p, 0.5, 0.58) * (1 - c(p, 0.66, 0.74));
        num.textContent = (1.9 * c(p, 0.5, 0.62)).toFixed(1);
        letters.forEach(function (l, i) { var a = c(p, 0.74 + i * 0.02, 0.82 + i * 0.02); l.style.opacity = a; l.style.transform = 'translateY(' + (60 * (1 - a)) + '%)'; });
        hint.style.opacity = 1 - c(p, 0, 0.05);
    }
    var stageSvg = document.querySelector('#stage > svg');
    function fit() { var portrait = innerWidth / innerHeight < 0.9; stageSvg.setAttribute('viewBox', portrait ? '250 130 700 520' : '180 130 840 500'); render(); }
    addEventListener('scroll', render, { passive: true }); addEventListener('resize', fit); addEventListener('orientationchange', fit); fit();
})();