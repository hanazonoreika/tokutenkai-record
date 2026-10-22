(() => {
  'use strict';
  const EVENTS_URL = 'https://hanazonoreika.github.io/member-event-calendar/data/events.json';
  const STORAGE_KEY = 'tokutenkai-record-v1';
  const SETTINGS_KEY = 'tokutenkai-record-settings-v1';
  const $ = (id) => document.getElementById(id);
  const state = { events: [], records: [], visibleCount: 30, secret: false, settings: {}, loaded: false };
  const money = (n) => '¥' + Math.max(0, Number(n) || 0).toLocaleString('ja-JP');
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parseDate = (s) => { const d = new Date((s || '') + 'T00:00:00'); return Number.isNaN(d.getTime()) ? null : d; };
  const fmtDate = (s) => { const d = parseDate(s); return d ? `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}` : (s || '日付未定'); };
  const totalFor = (r) => (Number(r.itemPrice)||0) * (Number(r.itemQty)||0) + (Number(r.transportCost)||0) + (Number(r.otherCost)||0);
  const toast = (message) => { const t = $('toast'); t.textContent = message; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2600); };
  function loadLocal() {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); state.records = Array.isArray(saved) ? saved : []; } catch { state.records = []; }
    try { state.settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch { state.settings = {}; }
    state.secret = !!state.settings.secret;
    document.body.classList.toggle('secret', state.secret);
    $('secretToggle').classList.toggle('active', state.secret);
    $('secretToggle').setAttribute('aria-pressed', String(state.secret));
    $('secretLabel').textContent = `マル秘モード ${state.secret ? 'ON' : 'OFF'}`;
  }
  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
    updateStats();
  }
  function updateStats() {
    $('statRecords').textContent = state.records.length.toLocaleString('ja-JP');
    const now = new Date();
    const monthCount = state.records.filter(r => { const d = parseDate(r.date); return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
    $('statMonth').textContent = monthCount.toLocaleString('ja-JP');
    $('statSpend').textContent = state.secret ? '••••' : money(state.records.reduce((sum, r) => sum + totalFor(r), 0));
  }
  async function fetchEvents() {
    $('syncStatus').textContent = 'イベントデータを取得しています…';
    $('syncStatus').classList.remove('error');
    $('refreshEvents').disabled = true;
    try {
      const res = await fetch(EVENTS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.events)) throw new Error('JSONに events 配列がありません');
      state.events = data.events.map((e, i) => ({ ...e, _id: String(e.id || `${e.date || 'unknown'}-${e.title || 'event'}-${i}`) }));
      state.loaded = true;
      const stamp = data.updated_at ? new Date(data.updated_at).toLocaleString('ja-JP') : '更新日時不明';
      $('syncStatus').textContent = `${state.events.length.toLocaleString('ja-JP')}件を読み込みました · データ更新：${stamp}`;
      state.visibleCount = 30;
      renderEvents();
    } catch (err) {
      $('syncStatus').textContent = 'イベントデータを読み込めませんでした。ネット接続と公開URLを確認してください。';
      $('syncStatus').classList.add('error');
      $('eventList').innerHTML = `<div class="empty-state">イベントデータを取得できませんでした。<br>手入力で記録することはできます。<br><small>${escapeHtml(err.message || '')}</small></div>`;
      $('eventCount').textContent = '0件';
    } finally { $('refreshEvents').disabled = false; }
  }
  function recordForEvent(eventId) { return state.records.find(r => String(r.eventId || '') === String(eventId)); }
  function filteredEvents() {
    const q = $('searchInput').value.trim().toLocaleLowerCase();
    const type = $('typeFilter').value;
    const view = $('viewFilter').value;
    return state.events.filter(e => {
      const rec = recordForEvent(e._id) || state.records.find(r => r.sourceId && r.sourceId === e._id);
      if (view === 'special' && e.type !== '特典会' && !rec) return false;
      if (view === 'recorded' && !rec) return false;
      if (type && e.type !== type) return false;
      const haystack = [e.title,e.member,e.place,e.notes,e.type,e.date].join(' ').toLocaleLowerCase();
      return !q || haystack.includes(q);
    }).sort((a,b) => String(a.date||'9999').localeCompare(String(b.date||'9999')) || String(a.time||'').localeCompare(String(b.time||'')));
  }
  function renderEvents() {
    if (!state.loaded) return;
    const events = filteredEvents();
    const shown = events.slice(0, state.visibleCount);
    $('eventCount').textContent = `${events.length.toLocaleString('ja-JP')}件中 ${shown.length.toLocaleString('ja-JP')}件表示`;
    $('loadMore').hidden = events.length <= state.visibleCount;
    if (!shown.length) { $('eventList').innerHTML = '<div class="empty-state">条件に合うイベントがありません。<br>別のキーワードで探すか、右側から手入力してください。</div>'; return; }
    $('eventList').innerHTML = shown.map(e => {
      const d = parseDate(e.date);
      const rec = recordForEvent(e._id) || state.records.find(r => r.sourceId === e._id);
      const official = e.url ? `<a class="official-link" href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer">公式ページ ↗</a>` : '';
      return `<article class="event-card">
        <div class="event-date">${d ? `${d.getFullYear()}年` : ''}${d ? `${d.getMonth()+1}月` : ''}<span class="day">${d ? d.getDate() : '—'}</span>${d ? '日' : '日付未定'}</div>
        <div class="event-main"><p class="event-title">${escapeHtml(e.title || 'タイトル未設定')}${rec ? '<span class="recorded-chip">記録済み</span>' : ''}</p><div class="event-meta"><span class="type-chip">${escapeHtml(e.type || '種別不明')}</span>${e.time ? `<span>◷ ${escapeHtml(e.time)}</span>` : ''}${e.member ? `<span>♡ ${escapeHtml(e.member)}</span>` : ''}${e.place ? `<span>⌖ ${escapeHtml(e.place)}</span>` : ''}</div>${e.notes ? `<p class="event-meta" style="margin:6px 0 0">${escapeHtml(e.notes)}</p>` : ''}</div>
        <div class="event-actions"><button class="small-button" type="button" data-event-id="${escapeHtml(e._id)}">${rec ? '記録を編集' : '記録する'}</button>${official}</div>
      </article>`;
    }).join('');
    $('eventList').querySelectorAll('[data-event-id]').forEach(btn => btn.addEventListener('click', () => selectEvent(btn.dataset.eventId)));
  }
  function selectEvent(id) {
    const e = state.events.find(ev => ev._id === id);
    if (!e) return;
    const existing = recordForEvent(id) || state.records.find(r => r.sourceId === id);
    resetForm();
    $('recordId').value = existing?.id || '';
    $('eventId').value = id;
    $('eventTitle').value = existing?.title ?? e.title ?? '';
    $('eventDate').value = existing?.date ?? e.date ?? '';
    $('eventTime').value = existing?.time ?? e.time ?? '';
    $('eventMember').value = existing?.member ?? e.member ?? '';
    $('eventPlace').value = existing?.place ?? e.place ?? '';
    $('eventUrl').value = existing?.url ?? e.url ?? '';
    if (existing) {
      $('outfit').value = existing.outfit || ''; $('pose').value = existing.pose || ''; $('memo').value = existing.memo || '';
      $('itemPrice').value = existing.itemPrice ?? 0; $('itemQty').value = existing.itemQty ?? 0;
      $('transportCost').value = existing.transportCost ?? 0; $('otherCost').value = existing.otherCost ?? 0;
    }
    $('editorTitle').textContent = existing ? '記録を編集' : 'イベントを記録';
    $('deleteRecord').hidden = !existing;
    updateExpenseTotal();
    $('recordForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function resetForm() {
    $('recordForm').reset(); $('recordId').value = ''; $('eventId').value = '';
    $('itemPrice').value = '0'; $('itemQty').value = '0'; $('transportCost').value = '0'; $('otherCost').value = '0';
    $('editorTitle').textContent = '記録をつける'; $('deleteRecord').hidden = true; updateExpenseTotal();
  }
  function updateExpenseTotal() {
    const total = (Number($('itemPrice').value)||0) * (Number($('itemQty').value)||0) + (Number($('transportCost').value)||0) + (Number($('otherCost').value)||0);
    $('expenseTotal').textContent = state.secret ? '••••' : money(total);
  }
  function handleSave(event) {
    event.preventDefault();
    const title = $('eventTitle').value.trim();
    if (!title || !$('eventDate').value) { toast('イベント名と日付を入力してください'); return; }
    const id = $('recordId').value || `rec-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const record = { id, eventId: $('eventId').value || '', sourceId: $('eventId').value || '', title, date: $('eventDate').value,
      time: $('eventTime').value.trim(), member: $('eventMember').value.trim(), place: $('eventPlace').value.trim(), url: $('eventUrl').value.trim(),
      outfit: $('outfit').value.trim(), pose: $('pose').value.trim(), memo: $('memo').value.trim(), itemPrice: Math.max(0,Number($('itemPrice').value)||0),
      itemQty: Math.max(0,Number($('itemQty').value)||0), transportCost: Math.max(0,Number($('transportCost').value)||0), otherCost: Math.max(0,Number($('otherCost').value)||0), updatedAt: new Date().toISOString() };
    const index = state.records.findIndex(r => r.id === id || (record.eventId && r.eventId === record.eventId));
    if (index >= 0) state.records[index] = { ...state.records[index], ...record, id: state.records[index].id };
    else state.records.unshift(record);
    saveLocal(); renderEvents(); resetForm(); toast('記録を保存しました');
  }
  function deleteCurrentRecord() {
    const id = $('recordId').value;
    if (!id) return;
    if (!confirm('この記録を削除しますか？ この操作は元に戻せません。')) return;
    state.records = state.records.filter(r => r.id !== id); saveLocal(); renderEvents(); resetForm(); toast('記録を削除しました');
  }
  function exportData() {
    const payload = { app: '特典会記録帳', version: 1, exported_at: new Date().toISOString(), records: state.records };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `tokutenkai-record-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast('バックアップを書き出しました');
  }
  async function importData(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data) ? data : data.records;
      if (!Array.isArray(incoming)) throw new Error('records配列が見つかりません');
      if (!confirm(`${incoming.length}件の記録を読み込みます。既存の同じIDの記録は置き換えます。続けますか？`)) return;
      const map = new Map(state.records.map(r => [r.id, r]));
      for (const r of incoming) { if (!r || !r.id || !r.title || !r.date) continue; map.set(r.id, r); }
      state.records = Array.from(map.values()); saveLocal(); renderEvents(); toast('バックアップを復元しました');
    } catch (err) { toast(`復元できませんでした：${err.message}`); }
    finally { $('importFile').value = ''; }
  }
  $('recordForm').addEventListener('submit', handleSave);
  $('clearForm').addEventListener('click', () => { resetForm(); $('eventTitle').focus(); });
  $('deleteRecord').addEventListener('click', deleteCurrentRecord);
  ['itemPrice','itemQty','transportCost','otherCost'].forEach(id => $(id).addEventListener('input', updateExpenseTotal));
  ['searchInput','typeFilter','viewFilter'].forEach(id => $(id).addEventListener(id === 'searchInput' ? 'input' : 'change', () => { state.visibleCount = 30; renderEvents(); }));
  $('refreshEvents').addEventListener('click', fetchEvents);
  $('loadMore').addEventListener('click', () => { state.visibleCount += 30; renderEvents(); });
  $('exportData').addEventListener('click', exportData);
  $('importFile').addEventListener('change', e => importData(e.target.files?.[0]));
  $('secretToggle').addEventListener('click', () => {
    state.secret = !state.secret; state.settings.secret = state.secret;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    document.body.classList.toggle('secret', state.secret); $('secretToggle').classList.toggle('active', state.secret);
    $('secretToggle').setAttribute('aria-pressed', String(state.secret)); $('secretLabel').textContent = `マル秘モード ${state.secret ? 'ON' : 'OFF'}`;
    updateStats(); updateExpenseTotal(); toast(state.secret ? '金額の表示を隠しました' : '金額を表示しました');
  });
  loadLocal(); updateStats(); updateExpenseTotal(); fetchEvents();
})();
