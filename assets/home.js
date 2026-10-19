// NangmanGames 첫 화면의 연출과 장난.
// 움직임 줄이기를 켠 사람에게는 멈춘 그림과 바로 바뀌는 상태만 준다. 글(window.NG)은 site.py가 언어마다 넣는다.
(() => {
  const NG = window.NG || {};
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const PAL = { ink: "#efe6d2", sun: "#ffc658", orange: "#ff8a50", pink: "#ff5f7a", soft: "#a59e90" };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => "rgb(" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(",") + ")";

  // 아래 가운데 잠깐 뜨는 알림
  let toastEl, toastT;
  function toast(text, link, href) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.append(toastEl);
    }
    toastEl.replaceChildren();
    const p = document.createElement("span");
    p.textContent = text;
    toastEl.append(p);
    if (link) {
      const a = document.createElement("a");
      a.className = "btn main";
      a.href = href;
      a.textContent = link;
      toastEl.append(a);
    }
    const x = document.createElement("button");
    x.type = "button"; x.className = "x"; x.textContent = "×"; x.setAttribute("aria-label", "close");
    x.onclick = () => toastEl.classList.remove("on");
    toastEl.append(x);
    toastEl.classList.remove("on"); void toastEl.offsetWidth; toastEl.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("on"), 8000);
  }

  // ── 1. 밤하늘: 해가 바다 위로 뜨고 진다 ──────────────────────────────
  const hero = document.querySelector(".studio-hero:not(.lost)");
  const sky = hero && (() => {
    const cv = hero.querySelector(".night"), g = cv.getContext("2d");
    const sunBtn = hero.querySelector(".sun"), sun = sunBtn.querySelector("img");
    const PX = 3;  // 3px을 한 칸으로 낮은 해상도에 그려 키운다
    const DAY = ["#0b1020", "#0d1220", "#111733", "#161c3d", "#1d2047", "#28234d", "#36264f"];
    const DARK = ["#04060c", "#060811", "#080b17", "#0a0d1c", "#0c1022", "#0f1228", "#13152e"];
    const GLOW = [PAL.sun, PAL.orange, PAL.pink];
    let w, h, sea, horizon, stars = [], shoots = [], sparks = [];
    let set = false, dusk = still ? 0 : 1, e = 0, dropMax = 1, sunTop = 0, sunH = 1;
    let mx = 0, my = 0, px = 0, py = 0, sx = 0, seen = true, last = 0, lastDraw = 0;

    function size() {
      w = Math.ceil(hero.clientWidth / PX); h = Math.ceil(hero.clientHeight / PX);
      const seaCss = parseFloat(getComputedStyle(hero).paddingBottom);
      sea = Math.round(seaCss / PX); horizon = h - sea;
      cv.width = w; cv.height = h;
      const hr = hero.getBoundingClientRect(), sr = sunBtn.getBoundingClientRect();
      sunTop = sr.top - hr.top; sunH = sr.height;
      dropMax = Math.max(1, hero.clientHeight - seaCss - sunTop);
      stars = Array.from({ length: Math.round(w * horizon / 170) }, () => ({
        x: rnd(0, w), y: rnd(0, horizon - 4) | 0, c: Math.random() < .15 ? PAL.sun : PAL.ink,
        big: Math.random() < .07, deep: Math.random() < .45, t: rnd(0, 6), s: rnd(.6, 2.2), d: rnd(.3, 1),
      }));
    }

    // 해 자리: 매 장면 움직이되 3px 계단으로. 수평선 아래로 내려간 만큼은 잘라 숨긴다
    function moveSun(dt) {
      const goal = set ? 1 : 0;
      dusk += (goal - dusk) * (still ? 1 : Math.min(1, dt * 2.2));
      if (Math.abs(dusk - goal) < .002) dusk = goal;
      if (dusk < .2 && !hero.classList.contains("ready")) hero.classList.add("ready");
      px += (mx - px) * Math.min(1, dt * 5); py += (my - py) * Math.min(1, dt * 5);
      const scroll = still ? 0 : Math.max(0, scrollY) * .5;
      const drop = Math.min(dropMax + PX, dusk * dropMax + scroll);
      e = clamp(drop / dropMax, 0, 1);
      const d = Math.round(drop / PX) * PX;
      sx = Math.round(-px * 8 / PX) * PX;
      sun.style.transform = `translate(${sx}px, ${d}px)`;
      sun.style.clipPath = `inset(0 0 ${clamp(sunH - (dropMax - d), 0, sunH)}px 0)`;
    }

    function shoot(x, y) {
      const dir = x > w * .6 ? -1 : x < w * .4 ? 1 : Math.random() < .5 ? -1 : 1;
      shoots.push({ x, y, vx: dir * rnd(2.2, 3.2), vy: rnd(1, 1.6), age: 0, max: rnd(22, 34) | 0 });
    }

    function draw(time) {
      const sec = time / 1000;
      // 하늘: 띠로 칠하고 경계는 바둑판 점으로 섞는다. 해가 질수록 어두워진다
      const band = Math.ceil(horizon / DAY.length);
      const col = DAY.map((c, i) => mix(c, DARK[i], e));
      col.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * band, w, band); });
      col.forEach((c, i) => {
        if (!i) return;
        g.fillStyle = c;
        for (let y = i * band - 3; y < i * band; y++)
          for (let x = y & 1; x < w; x += 2) if (y - (i * band - 3) >= (x >> 1) % 3 - 1) g.fillRect(x, y, 1, 1);
      });
      // 별: 마우스 쪽으로 겹마다 다르게 밀린다. 해가 지면 숨어 있던 별까지 나온다
      for (const s of stars) {
        if (s.deep && e < s.d * .9) continue;
        const on = Math.sin(sec * s.s + s.t);
        if (on < -.55) continue;
        const x = Math.round(((s.x + px * 6 * s.d) % w + w) % w), y = Math.round(s.y + py * 3 * s.d);
        g.globalAlpha = (on > .4 ? 1 : .45) * (.6 + .4 * e);
        g.fillStyle = s.c;
        g.fillRect(x, y, 1, 1);
        if (s.big && on > .7) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
      }
      g.globalAlpha = 1;
      // 별똥별
      if (!still && Math.random() < .012 + .03 * e) shoot(rnd(w * .1, w * .9), rnd(2, horizon * .35));
      shoots = shoots.filter(s => {
        s.age++; s.x += s.vx; s.y += s.vy;
        for (let i = 0; i < 9; i++) {
          g.globalAlpha = (1 - i / 9) * (s.age > s.max - 6 ? (s.max - s.age) / 6 : 1);
          g.fillStyle = i ? PAL.ink : "#ffffff";
          g.fillRect(Math.round(s.x - s.vx * i * .5), Math.round(s.y - s.vy * i * .5), 1, 1);
        }
        g.globalAlpha = 1;
        return s.age < s.max && s.y < horizon;
      });
      sparks = sparks.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += .12; p.life--;
        g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        return p.life > 0;
      });
      // 바다와 해 그림자. 해가 내려가면 그림자도 사그라진다
      g.fillStyle = mix("#0a0e1b", "#05070d", e); g.fillRect(0, horizon, w, sea);
      g.fillStyle = mix("#36264f", "#13152e", e); g.fillRect(0, horizon, w, 1);
      const mid = w / 2 + sx / PX, tick = Math.floor(sec * 5);
      for (let r = 1; r < sea; r += 2) {
        const k = r / sea, half = Math.max(2, (1 - k * .7) * Math.min(56, w * .16));
        g.fillStyle = GLOW[Math.min(2, Math.floor(k * 3))];
        for (let d = 0; d < 4; d++) {
          const n = Math.sin(r * 12.9 + d * 78.2 + tick * 1.7) * .5 + .5;
          const len = 2 + (n * half * .5 | 0);
          g.globalAlpha = (.35 + (1 - k) * .6) * (1 - e * .92);
          g.fillRect(Math.round(mid - half + n * half * 2 - len / 2), horizon + r, len, 1);
        }
        g.globalAlpha = .18;
        g.fillStyle = PAL.soft;
        g.fillRect(Math.round((Math.sin(r * 3.1 + tick * .7) * .5 + .5) * w), horizon + r, 3 + (r % 5), 1);
      }
      g.globalAlpha = 1;
    }

    function loop(time) {
      const dt = Math.min(.1, (time - last) / 1000 || 0); last = time;
      if (seen) {
        moveSun(dt);
        if (time - lastDraw > 110) { draw(time); lastDraw = time; }  // 하늘은 초당 9장, 픽셀 그림답게
      }
      requestAnimationFrame(loop);
    }

    const at = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / PX, (ev.clientY - r.top) / PX]; };
    const near = (x, y) => shoots.find(s => Math.abs(s.x - x) < 10 && Math.abs(s.y - y) < 10);

    // 해를 누르면 지고, 다시 누르면 뜬다
    sunBtn.addEventListener("click", () => {
      set = !set;
      sunBtn.setAttribute("aria-pressed", set);
      if (still) { moveSun(1); draw(performance.now()); }
    });
    // 별똥별을 누르면 잡힌다(소원은 위시리스트로). 빈 하늘을 누르면 거기서 하나 떨어진다
    hero.addEventListener("click", ev => {
      if (ev.target.closest("a, button")) return;
      const [x, y] = at(ev), hit = near(x, y);
      if (hit) {
        shoots.splice(shoots.indexOf(hit), 1);
        for (let i = 0; i < 18; i++)
          sparks.push({ x: hit.x, y: hit.y, vx: rnd(-1.6, 1.6), vy: rnd(-2, .6), life: rnd(8, 16) | 0, c: [PAL.sun, PAL.ink, PAL.orange][i % 3] });
        toast(NG.wish, NG.wishGo, NG.wishUrl);
      } else if (y < horizon - 4 && !still) shoot(x, y);
    });
    hero.addEventListener("mousemove", ev => {
      const r = hero.getBoundingClientRect();
      mx = (ev.clientX - r.left) / r.width * 2 - 1; my = (ev.clientY - r.top) / r.height * 2 - 1;
      const [x, y] = at(ev);
      hero.style.cursor = near(x, y) ? "pointer" : "";
    });
    hero.addEventListener("mouseleave", () => { mx = my = 0; });

    size();
    addEventListener("resize", () => { size(); draw(performance.now()); });
    if (still) { moveSun(1); draw(0); return { rise() {} }; }
    // 열 때: 해가 바다에서 떠오르고, 이름과 한 줄이 뒤따른다
    hero.classList.add("intro");
    setTimeout(() => hero.classList.add("ready"), 2500);  // 탭이 뒤에 있어 장면이 느려도 이름은 나오게
    new IntersectionObserver(([en]) => { seen = en.isIntersecting; }).observe(hero);
    requestAnimationFrame(loop);
    return { rise() { if (!set) dusk = 1; } };
  })();

  // 다른 탭에 갔다 오면: 제목은 해가 졌다고 하고, 돌아오면 해가 다시 뜬다
  const title = document.title;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (NG.away) document.title = NG.away; }
    else { document.title = title; if (sky && scrollY < 200) sky.rise(); }
  });

  // ── 2. 칸이 화면에 들어올 때 계단 걸음으로 올라온다 ─────────────────────
  if (!still && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in"); io.unobserve(en.target);
      setTimeout(() => { en.target.style.transitionDelay = ""; }, 1200);  // 등장 뒤 마우스 반응은 곧바로
    }), { threshold: .12 });
    document.querySelectorAll("main .head, main .game, main .strip a, main .talk, main .mailcard").forEach(el => {
      el.classList.add("rv"); io.observe(el);
    });
    document.querySelectorAll(".strip a").forEach((a, i) => { a.style.transitionDelay = 200 + i * 90 + "ms"; });
  }

  // ── 3. 스튜디오 소개: 게임 대화 상자처럼 한 글자씩 ─────────────────────
  const talk = document.querySelector(".talk");
  if (talk && !still && "IntersectionObserver" in window) {
    const dev = talk.querySelector(".dev");
    const ps = [...dev.querySelectorAll("p:not(.who)")];
    const sr = document.createElement("div");
    sr.className = "sr"; sr.textContent = ps.map(p => p.textContent).join(" ");
    talk.append(sr); dev.setAttribute("aria-hidden", "true");
    // 자리는 그대로 두고(남은 글은 숨김) 보이는 글만 늘린다
    const parts = ps.map(p => {
      const text = p.textContent, shown = document.createElement("span"), rest = document.createElement("span");
      rest.className = "rest"; rest.textContent = text;
      p.replaceChildren(shown, rest);
      return { text, shown, rest };
    });
    let i = 0, n = 0, timer;
    const done = () => {
      clearInterval(timer);
      parts.forEach(q => { q.shown.textContent = q.text; q.rest.textContent = ""; });
      talk.classList.remove("typing"); dev.removeAttribute("aria-hidden"); sr.remove();
    };
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      talk.classList.add("typing");
      timer = setInterval(() => {
        const q = parts[i];
        if (!q) return done();
        n += 1;
        q.shown.textContent = q.text.slice(0, n); q.rest.textContent = q.text.slice(n);
        if (n >= q.text.length) { i++; n = 0; }
      }, 26);
    }, { threshold: .4 });
    io.observe(talk);
    talk.addEventListener("click", () => talk.classList.contains("typing") && done());
  }

  // 말 상자의 해가 가끔 윙크한다
  const face = document.querySelector(".talk .face");
  if (face && face.dataset.wink && !still) {
    const calm = face.src, wink = new Image();
    wink.src = face.dataset.wink;
    const later = () => setTimeout(() => {
      face.src = wink.src;
      setTimeout(() => { face.src = calm; later(); }, 700);
    }, rnd(3000, 8000));
    later();
  }

  // ── 4. Dock 7 칸 위의 고양이 ────────────────────────────────────────
  const perch = document.querySelector(".perch"), cat = perch && perch.querySelector(".cat");
  if (cat && NG.cat) {
    const F = NG.cat;
    let W = cat.clientWidth, S = W / 9, x = 24, dir = 1, state = "sit", left = 16, target = 0, step = 0;
    const show = name => { cat.style.backgroundPositionX = -F[name] * W + "px"; };
    const place = () => { cat.style.left = x + "px"; cat.style.transform = dir < 0 ? "scaleX(-1)" : ""; };
    const room = () => Math.max(0, perch.clientWidth - W);

    function heart() {
      const h = document.createElement("span");
      h.className = "heart";
      h.style.left = x + W / 2 + rnd(-8, 8) + "px";
      perch.append(h);
      h.addEventListener("animationend", () => h.remove());
    }
    function next() {
      const r = Math.random();
      if (r < .45) { state = "walk"; target = rnd(0, room()) | 0; }
      else if (r < .6) { state = "groom"; left = 16; }
      else if (r < .7) { state = "scratch"; left = 10; }
      else if (r < .85) { state = "loaf"; left = 40; }
      else { state = "sit"; left = 24; }
    }
    function tick() {
      step++;
      switch (state) {
        case "walk": case "run": {
          const d = target - x, v = state === "run" ? S * 3 : S;
          if (Math.abs(d) <= v) { x = target; state = "sit"; left = rnd(15, 40) | 0; show("Sit"); break; }
          dir = Math.sign(d); x += dir * v;
          show(step % 2 ? "WalkA" : "WalkB");
          break;
        }
        case "sit": show(Math.random() < .07 ? "Blink" : Math.random() < .08 ? "Tail" : "Sit"); if (--left <= 0) next(); break;
        case "groom": show(step % 6 < 4 ? "Groom" : "Sit"); if (--left <= 0) next(); break;
        case "scratch": show(step % 2 ? "ScratchA" : "ScratchB"); if (--left <= 0) next(); break;
        case "loaf": show("Loaf"); if (--left <= 0) { state = "yawn"; left = 5; } break;
        case "yawn": show("Yawn"); if (--left <= 0) { state = "sleep"; left = rnd(80, 160) | 0; cat.classList.add("zz"); } break;
        case "sleep": show("Sleep"); if (--left <= 0) { cat.classList.remove("zz"); state = "sit"; left = 10; } break;
        case "belly": show("Belly"); if (--left <= 0) { state = "sit"; left = 14; } break;
        case "jump": show("Climb"); if (--left <= 0) { state = "run"; target = x > room() / 2 ? 0 : room(); } break;
      }
      place();
    }
    // 쓰다듬으면 배를 보인다. 자고 있었으면 깨어난다
    cat.addEventListener("click", () => {
      cat.classList.remove("zz");
      state = "belly"; left = 12; show("Belly"); heart();
      if (Math.random() < .5) setTimeout(heart, 160);
    });
    // 레이저에 맞으면 펄쩍 뛰어 반대편으로 달아난다
    cat.addEventListener("zap", () => {
      if (state === "jump" || state === "run") return;
      cat.classList.remove("zz"); state = "jump"; left = 3; show("Climb");
    });
    // 앉아 있을 때는 마우스 쪽을 본다
    if (fine) addEventListener("mousemove", ev => {
      if (state !== "sit") return;
      const r = cat.getBoundingClientRect();
      if (Math.abs(ev.clientY - r.top) < 220 && Math.abs(ev.clientX - r.left) > 20) { dir = ev.clientX > r.left + W / 2 ? 1 : -1; place(); }
    });
    addEventListener("resize", () => { W = cat.clientWidth; S = W / 9; x = Math.min(x, room()); target = Math.min(target, room()); place(); show("Sit"); });
    show(still ? "Loaf" : "Sit"); place();
    if (!still) setInterval(() => { if (!document.hidden) tick(); }, 150);
  }

  // ── 5. 게임 화면은 마우스를 따라 살짝 기운다 ─────────────────────────
  if (fine && !still) document.querySelectorAll(".game .cover").forEach(c => {
    c.addEventListener("mousemove", ev => {
      const r = c.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-4px)`;
    });
    c.addEventListener("mouseleave", () => { c.style.transform = ""; });
  });

  // ── 6. 숨은 레이저: ↑↑↓↓←→←→BA, 휴대폰은 위 띠의 해를 3초 안에 일곱 번 ──────
  const laser = (() => {
    let on = false, cv, g, badge, num, raf = 0, firing = false, px = 0, py = 0, bits = [], scrap = 0, t = 0;
    const P = 3, BITS = ["#efe6d2", "#a59e90", "#6f7487", "#34406a", PAL.orange, PAL.sun];
    const fit = () => { cv.width = Math.ceil(innerWidth / P); cv.height = Math.ceil(innerHeight / P); };
    const block = ev => { if (!ev.target.closest(".laser-badge")) { ev.preventDefault(); ev.stopPropagation(); } };
    const down = ev => { if (ev.target.closest(".laser-badge")) return; firing = true; move(ev); };
    const move = ev => { px = ev.clientX; py = ev.clientY; };
    const up = () => { firing = false; };

    function beam(x0, y0, x1, y1, c) {
      g.fillStyle = c;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let k = 0; k < 2000; k++) {
        g.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    function zap() {
      const el = document.elementFromPoint(px, py);
      if (!el) return;
      if (el.closest(".cat")) return cat && cat.dispatchEvent(new Event("zap"));
      const hit = el.closest(".strip a, .game .cover, .glogo, .talk, .mailcard, .head, .slogo, .brand, .btn");
      if (!hit) return;
      hit.classList.remove("zap"); void hit.offsetWidth; hit.classList.add("zap");
    }
    function loop() {
      const W = cv.width, H = cv.height, x = px / P | 0, y = py / P | 0, bx = W >> 1, by = H - 5;
      g.clearRect(0, 0, W, H);
      // 바닥 가운데 작은 절단기
      g.fillStyle = PAL.ink; g.fillRect(bx - 4, by + 1, 9, 3);
      g.fillStyle = PAL.orange; g.fillRect(bx - 1, by - 1, 3, 2);
      if (firing) {
        beam(bx + 1, by - 1, x + 1, y, PAL.orange);
        beam(bx, by - 1, x, y, Math.random() < .5 ? PAL.sun : "#fff3c4");
        g.fillStyle = "#ffffff"; g.fillRect(x - 1, y - 1, 3, 3);
        g.fillStyle = PAL.sun; g.fillRect(x - 2 + (Math.random() * 2 | 0), y - 2 + (Math.random() * 2 | 0), 1, 1);
        for (let i = 0; i < 2; i++) bits.push({ x, y, vx: rnd(-1.6, 1.6), vy: rnd(-2.6, -.4), c: BITS[Math.random() * BITS.length | 0], s: Math.random() < .3 ? 2 : 1 });
        if (++t % 4 === 0) num.textContent = ++scrap;
        if (t % 6 === 0) zap();
      }
      bits = bits.filter(b => {
        b.vy += .14; b.x += b.vx; b.y += b.vy;
        g.fillStyle = b.c; g.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
        return b.y < H;
      });
      raf = requestAnimationFrame(loop);
    }
    function start() {
      on = true;
      document.documentElement.classList.add("laser");
      cv = document.createElement("canvas"); cv.className = "laser-fx"; cv.setAttribute("aria-hidden", "true");
      g = cv.getContext("2d"); fit();
      badge = document.createElement("button"); badge.type = "button"; badge.className = "laser-badge";
      num = document.createElement("b"); num.textContent = scrap;
      badge.append(NG.laser + "  ·  " + NG.scrap + " ", num);
      badge.onclick = stop;
      document.body.append(cv, badge);
      addEventListener("resize", fit);
      addEventListener("pointerdown", down, true); addEventListener("pointermove", move, true);
      addEventListener("pointerup", up, true); addEventListener("pointercancel", up, true);
      addEventListener("click", block, true);
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      on = false; firing = false;
      document.documentElement.classList.remove("laser");
      cancelAnimationFrame(raf); cv.remove(); badge.remove(); bits = [];
      removeEventListener("resize", fit);
      removeEventListener("pointerdown", down, true); removeEventListener("pointermove", move, true);
      removeEventListener("pointerup", up, true); removeEventListener("pointercancel", up, true);
      removeEventListener("click", block, true);
    }
    return { get on() { return on; }, toggle() { on ? stop() : start(); }, stop };
  })();

  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kpos = 0;
  addEventListener("keydown", ev => {
    if (ev.key === "Escape" && laser.on) return laser.stop();
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === KONAMI[kpos]) kpos++;
    else kpos = k === "ArrowUp" ? (kpos === 2 ? 2 : 1) : 0;
    if (kpos === KONAMI.length) { kpos = 0; laser.toggle(); }
  });
  let taps = [];
  const brand = document.querySelector(".brand");
  if (brand) brand.addEventListener("click", () => {
    const now = Date.now();
    taps = taps.filter(t => now - t < 3000); taps.push(now);
    if (taps.length >= 7) { taps = []; laser.toggle(); }
  });

  // ── 7. 경험치 막대: 내려 읽은 만큼 위 띠 아래가 찬다. 끝까지 오면 레벨 업 ─────
  const bar = document.querySelector(".bar");
  if (bar) {
    const exp = document.createElement("div");
    exp.className = "exp"; exp.setAttribute("aria-hidden", "true");
    exp.append(document.createElement("i"));
    bar.append(exp);
    let leveled = false;
    const fill = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const k = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
      exp.style.setProperty("--p", Math.round(k * 40) / 40);  // 40칸 계단으로 찬다
      if (k > .985 && !leveled) {
        leveled = true;
        const up = document.createElement("span");
        up.className = "lvup"; up.textContent = "LEVEL UP!";
        bar.append(up);
        up.addEventListener("animationend", () => up.remove());
        if (still) setTimeout(() => up.remove(), 1500);
      }
    };
    addEventListener("scroll", fill, { passive: true });
    addEventListener("resize", fill);
    fill();
  }

  // ── 8. 맨 끝: 오락실처럼 "계속할까요?" 9부터 0까지 ───────────────────
  const foot = document.querySelector("body > footer");
  if (foot && NG.cont && "IntersectionObserver" in window) {
    const box = document.createElement("div");
    box.className = "cont";
    const head = document.createElement("p"), num = document.createElement("b"), go = document.createElement("button");
    head.className = "q"; go.type = "button"; go.className = "btn main"; go.textContent = "▶ " + NG.top;
    box.append(head, num, go);
    foot.prepend(box);
    let n = 9, timer = null, over = false;
    const show = () => {
      if (over) { head.textContent = "GAME OVER"; num.textContent = NG.thanks; box.classList.add("over"); return; }
      head.textContent = NG.cont; num.textContent = n; box.classList.remove("over");
      num.classList.remove("tick"); void num.offsetWidth; num.classList.add("tick");
    };
    const run = () => {
      if (timer || over) return;
      show();
      timer = setInterval(() => {
        if (--n < 0) { clearInterval(timer); timer = null; over = true; }
        show();
      }, 1000);
    };
    const reset = () => { clearInterval(timer); timer = null; n = 9; over = false; show(); };
    new IntersectionObserver(([en]) => { en.isIntersecting ? run() : reset(); }, { threshold: .6 }).observe(box);
    go.addEventListener("click", () => {
      scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
      if (sky) setTimeout(() => sky.rise(), still ? 0 : 500);  // 맨 위로 가면 해가 다시 뜬다
    });
    show();
  }

  // ── 9. 메일 주소 복사: 누르면 도장 찍듯 ─────────────────────────────
  document.querySelectorAll(".mailcopy").forEach(b => {
    const label = b.textContent;
    b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
      b.textContent = NG.copied || label; b.classList.add("done");
      setTimeout(() => { b.textContent = label; b.classList.remove("done"); }, 1800);
    });
  });

  // 소스를 열어 본 개발자에게
  console.log("%c NangmanGames %c\n  hi, fellow dev.\n  ↑ ↑ ↓ ↓ ← → ← → B A",
    "background:#ff8a50;color:#1a1209;font:bold 14px monospace;padding:4px 10px", "color:#a59e90;font:12px/1.6 monospace");
})();
