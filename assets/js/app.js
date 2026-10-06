/* ============================================================
   WinCTF — app: navegação, validação, progresso, referência
   ============================================================ */
(function () {
  'use strict';

  const STORE_KEY = 'winctf_progress_v1';
  const state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign({ solved: {}, hints: {}, score: 0, hintsUsed: 0, egg: false }, JSON.parse(raw));
    } catch (e) { /* storage indisponível */ }
    return { solved: {}, hints: {}, score: 0, hintsUsed: 0, egg: false };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------------- utilidades ---------------- */
  function norm(s) {
    return String(s)
      .toLowerCase()
      .trim()
      .replace(/^["'`]|["'`]$/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\s*\\\s*/g, '\\')
      .replace(/\s*\/\s*/g, '/')
      .replace(/[;,]$/, '');
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function toast(msg, kind) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------------- ícones ---------------- */
  const ICONS = {
    gear: '<path d="M19.3 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9c.27.6.86.97 1.52.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.46.97z"/>',
    pulse: '<path d="M14 2.6H6.6A1.6 1.6 0 0 0 5 4.2v15.6a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6V7.6z"/><path d="M14 2.6V7.6h5"/><path d="M8 14.4h1.7l1.2 2.6 1.9-5 1.2 2.4H16"/>',
    console: '<rect x="2.6" y="4.2" width="18.8" height="15.6" rx="2.2"/><path d="m7 9.6 3 2.6-3 2.6"/><path d="M12.6 15h4.8"/>',
    code: '<path d="m8.4 7.6-4.6 4.4 4.6 4.4"/><path d="m15.6 7.6 4.6 4.4-4.6 4.4"/><path d="m13.2 5.6-2.4 12.8"/>',
  };

  /* ---------------- navegação ---------------- */
  function goto(page) {
    $$('.page').forEach((p) => p.classList.toggle('active', p.id === 'page-' + page));
    $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (page === 'terminal') setTimeout(() => { const i = $('#termInput'); if (i) i.focus(); }, 120);
  }
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => goto(b.dataset.page)));
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]');
    if (g) goto(g.dataset.goto);
  });

  /* ---------------- render: dashboard ---------------- */
  function renderCatGrid() {
    const grid = $('#catGrid');
    grid.innerHTML = CATEGORIES.map((c) => {
      const list = CHALLENGES.filter((ch) => ch.cat === c.id);
      const done = list.filter((ch) => state.solved[ch.id]).length;
      const pct = Math.round((done / list.length) * 100);
      return `
      <button class="cat-card" data-goto="${c.id}">
        <span class="cat-ico"><svg viewBox="0 0 24 24">${ICONS[c.icon]}</svg></span>
        <h3>${esc(c.name)}</h3>
        <p>${esc(c.desc)}</p>
        <div class="cat-meta"><span>${esc(c.url)}</span><b>${done}/${list.length}</b></div>
        <div class="bar mini"><i style="width:${pct}%"></i></div>
      </button>`;
    }).join('');
  }

  /* ---------------- render: desafios ---------------- */
  function artifactHtml(a) {
    const body = esc(a.content).replace(/(CTF\{[^}]+\})/gi, '<span class="flag-hit">$1</span>');
    return `<div class="artifact"><div class="art-label">${esc(a.label)}</div><pre>${body}</pre></div>`;
  }

  function cardHtml(ch) {
    const lv = LEVELS[ch.level];
    const solved = !!state.solved[ch.id];
    const flag = (ch.answers.find((a) => /^ctf\{/i.test(a))) || null;
    const artifacts = ch.artifact ? (Array.isArray(ch.artifact) ? ch.artifact : [ch.artifact]) : [];
    const hintsShown = state.hints[ch.id] || 0;

    return `
    <article class="chal${solved ? ' solved' : ''}" id="ch-${ch.id}" data-id="${ch.id}">
      <div class="chal-in">
        <div class="chal-top">
          <span class="badge lvl-${ch.level}">${lv.label}</span>
          <span class="pts-chip" data-pts>${lv.pts} pts${hintsShown ? ' · −' + hintsShown * 50 + ' dicas' : ''}</span>
          ${solved ? `<span class="chal-flagchip">${flag ? esc(flag) : '✓ resolvido'}</span>` : ''}
        </div>
        <h3>${esc(ch.title)}</h3>
        <p class="desc">${ch.desc}</p>
        ${artifacts.map(artifactHtml).join('')}
        <p class="task"><b>Missão:</b> ${ch.task}</p>
        <span class="fmt">${esc(ch.format)}</span>
        <div class="solve">
          <input type="text" placeholder="${/^ctf\{/i.test(ch.answers[0]) ? 'CTF{...}' : 'sua resposta'}" spellcheck="false" autocomplete="off" ${solved ? 'disabled' : ''}>
          <button class="btn check" ${solved ? 'disabled' : ''}>Verificar</button>
        </div>
        <div class="feedback${solved ? ' show ok' : ''}">${solved ? feedbackOk(ch, true) : ''}</div>
        <div class="chal-tools">
          <button class="tool warn" data-act="hint" ${solved || hintsShown >= 2 ? 'disabled' : ''}>💡 Dica (${hintsShown}/2)</button>
          <button class="tool" data-act="explain" ${solved || hintsShown < 2 ? '' : ''}>📖 Explicação</button>
          <button class="tool" data-act="collapse">minimizar</button>
        </div>
        <div class="hints">${Array.from({ length: hintsShown }, (_, i) => `<div class="hint"><b>Dica ${i + 1}</b>${esc(ch.hints[i])}</div>`).join('')}</div>
        <div class="explain" style="display:none"><h4>Solução comentada</h4>${ch.explain}</div>
      </div>
    </article>`;
  }

  function feedbackOk(ch, already) {
    const flag = ch.answers.find((a) => /^ctf\{/i.test(a));
    return `<b>Correto!</b> ${flag ? `A flag é <span class="flag">${esc(flag)}</span> · ` : ''}+${gainedPts(ch)} pontos${already ? ' (já resolvido)' : ''}.`;
  }

  function gainedPts(ch) {
    const base = LEVELS[ch.level].pts;
    const spent = (state.hints[ch.id] || 0) * 50;
    return Math.max(0, base - spent);
  }

  function renderLists() {
    CATEGORIES.forEach((c) => {
      const el = $('#list-' + c.id);
      if (!el) return;
      el.innerHTML = CHALLENGES.filter((ch) => ch.cat === c.id).map(cardHtml).join('');
    });
  }

  /* ---------------- interação dos desafios ---------------- */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.chal');
    if (!card) return;
    const ch = CHALLENGES.find((x) => x.id === card.dataset.id);
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('check')) { check(card, ch); return; }

    const act = btn.dataset.act;
    if (act === 'hint') {
      const used = state.hints[ch.id] || 0;
      if (used >= 2) return;
      state.hints[ch.id] = used + 1;
      state.hintsUsed += 1;
      state.score = Math.max(0, state.score - 50);
      save();
      $('.hints', card).insertAdjacentHTML('beforeend', `<div class="hint"><b>Dica ${used + 1}</b>${esc(ch.hints[used])}</div>`);
      const pts = $('[data-pts]', card);
      pts.textContent = `${LEVELS[ch.level].pts} pts · −${(used + 1) * 50} dicas`;
      if (used + 1 >= 2) { btn.disabled = true; btn.textContent = '💡 Dicas esgotadas'; }
      else btn.textContent = `💡 Dica (${used + 1}/2)`;
      const exBtn = $('[data-act="explain"]', card);
      if (exBtn) exBtn.disabled = false;
      updateStats();
      toast('Dica revelada: −50 pontos', 'gold');
      return;
    }
    if (act === 'explain') {
      const box = $('.explain', card);
      const open = box.style.display !== 'none';
      box.style.display = open ? 'none' : 'block';
      btn.textContent = open ? '📖 Explicação' : '▾ Ocultar explicação';
      return;
    }
    if (act === 'collapse') {
      const inBox = $('.chal-in', card);
      const hidden = inBox.dataset.fold === '1';
      Array.from(inBox.children).forEach((el, i) => {
        if (el.classList.contains('chal-top') || el.tagName === 'H3') return;
        if (i < 3) return;
        el.style.display = hidden ? '' : 'none';
      });
      inBox.dataset.fold = hidden ? '0' : '1';
      btn.textContent = hidden ? 'minimizar' : 'maximizar';
      return;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.solve input')) {
      const card = e.target.closest('.chal');
      check(card, CHALLENGES.find((x) => x.id === card.dataset.id));
    }
  });

  function check(card, ch) {
    if (!ch || state.solved[ch.id]) return;
    const input = $('input', card);
    const fb = $('.feedback', card);
    const val = input.value;
    if (!val.trim()) { show(fb, 'err', 'Digite uma resposta primeiro.'); return; }

    const nVal = norm(val);
    const hit = ch.answers.some((a) => norm(a) === nVal);
    if (hit) {
      const gain = gainedPts(ch);
      state.solved[ch.id] = true;
      state.score += gain;
      save();
      card.classList.add('solved');
      input.disabled = true;
      $('.check', card).disabled = true;
      $('[data-act="hint"]', card).disabled = true;
      show(fb, 'ok', feedbackOk(ch, false));
      const flag = ch.answers.find((a) => /^ctf\{/i.test(a));
      $('.chal-top', card).insertAdjacentHTML('beforeend',
        `<span class="chal-flagchip">${flag ? esc(flag) : '✓ resolvido'}</span>`);
      $('.explain', card).style.display = 'block';
      $('[data-act="explain"]', card).textContent = '▾ Ocultar explicação';
      toast(`+${gainedPts(ch)} pontos — flag capturada!`, 'good');
      updateStats();
    } else {
      const remaining = 2 - (state.hints[ch.id] || 0);
      show(fb, 'err', `Resposta incorreta. ${remaining > 0 ? `Você ainda tem ${remaining} dica(s) disponível(is).` : 'Sem dicas — leia o artefato de novo.'}`);
      input.select();
    }
  }

  function show(el, cls, html) {
    el.className = 'feedback show ' + cls;
    el.innerHTML = html;
  }

  /* ---------------- stats ---------------- */
  const RANKS = [
    [0, 'Novato'], [300, 'Analista Júnior'], [700, 'Analista SOC'],
    [1200, 'Incident Handler'], [1800, 'Threat Hunter'], [2400, 'Blue Team Lead'],
  ];
  function updateStats() {
    const total = CHALLENGES.length;
    const solved = Object.keys(state.solved).length;
    const pct = Math.round((solved / total) * 100);
    $('#railScore').textContent = state.score;
    $('#statScore').textContent = state.score;
    $('#statSolved').innerHTML = `${solved}<small>/${total}</small>`;
    $('#statHints').textContent = state.hintsUsed;
    $('#statPct').textContent = pct + '%';
    $('#statBar').style.width = pct + '%';
    let rank = RANKS[0][1];
    for (const [min, name] of RANKS) if (state.score >= min) rank = name;
    $('#statLevel').textContent = rank;

    CATEGORIES.forEach((c) => {
      const list = CHALLENGES.filter((ch) => ch.cat === c.id);
      const done = list.filter((ch) => state.solved[ch.id]).length;
      const p = $('#prog-' + c.id), b = $('#bar-' + c.id);
      if (p) p.textContent = `${done}/${list.length} resolvidos`;
      if (b) b.style.width = Math.round((done / list.length) * 100) + '%';
    });
    renderCatGrid();
  }

  /* ---------------- referência ---------------- */
  function renderRef() {
    $('#refGrid').innerHTML =
      REFERENCE.map((g) => `
        <section class="ref-group" data-group="${g.id}">
          <h3>${esc(g.title)}<span>${g.items.length} itens</span></h3>
          <p class="sub">${esc(g.sub)}</p>
          ${g.items.map((it) => `<div class="ref-item"><span class="k">${it.k}</span><span class="v">${it.v}</span></div>`).join('')}
        </section>`).join('') +
      `<div class="ref-empty" id="refEmpty" style="display:none">Nada encontrado. Tente: 4624, run, winevt, findstr, for...</div>`;
  }
  function refFilter(q) {
    q = q.toLowerCase().trim();
    let any = false;
    $$('.ref-group').forEach((g) => {
      let shown = 0;
      $$('.ref-item', g).forEach((it) => {
        const ok = !q || it.textContent.toLowerCase().includes(q);
        it.classList.toggle('hide', !ok);
        if (ok) shown++;
      });
      g.classList.toggle('hide', shown === 0);
      if (shown) any = true;
    });
    $('#refEmpty').style.display = any ? 'none' : 'block';
  }

  /* ---------------- terminal ---------------- */
  function initTerminal() {
    const out = $('#termOut'), input = $('#termInput'), prompt = $('#termPrompt'), body = $('#termBody');
    Terminal.init({ outEl: out, inputEl: input, promptEl: prompt, bodyEl: body });
    Terminal.onFlag = (flag) => {
      if (state.egg) return;
      state.egg = true;
      state.score += 50;
      save();
      updateStats();
      toast('+50 pontos — você achou a flag escondida no disco!', 'gold');
    };

    $$('.term-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.term-tab').forEach((t) => t.classList.toggle('active', t === tab));
        Terminal.setShell(tab.dataset.shell);
        input.focus();
      });
    });
    $('#termClear').addEventListener('click', () => { out.innerHTML = ''; input.focus(); });
  }

  /* ---------------- reset ---------------- */
  $('#resetProgress').addEventListener('click', () => {
    if (!confirm('Zerar todo o progresso (pontos, flags e dicas)?')) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });

  /* ---------------- boot ---------------- */
  renderLists();
  renderRef();
  updateStats();
  initTerminal();
  $('#refSearch').addEventListener('input', (e) => refFilter(e.target.value));
})();
