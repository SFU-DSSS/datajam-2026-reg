const $ = id => document.getElementById(id);
const statuses = ['pending', 'accepted', 'waitlisted', 'rejected'];
export function setupAdmin(client, run, message) {
  let registrations = [], selected = new Set(), draft = null;
  async function api(action, data = {}) {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Please sign in.');
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, data })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Admin request failed.');
    return result;
  }
  function invalidate() { draft = null; $('email-preview').hidden = true; }
  function visible() {
    const query = $('admin-search').value.toLowerCase();
    return registrations.filter(r => (!$('admin-filter').value || r.status === $('admin-filter').value) &&
      [r.name, r.login_email, r.student_email, r.institution, r.team_name].some(v => v?.toLowerCase().includes(query)));
  }
  function render() {
    const rows = visible();
    $('admin-count').textContent = `${rows.length} of ${registrations.length} registrations · ${selected.size} selected for email`;
    $('admin-rows').replaceChildren();
    for (const r of rows) {
      const card = document.createElement('article');
      const label = document.createElement('label');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.has(r.id);
      checkbox.onchange = () => { checkbox.checked ? selected.add(r.id) : selected.delete(r.id); invalidate(); render(); };
      label.append(checkbox, document.createTextNode(` ${r.name} · ${r.status}`)); card.append(label);
      const info = document.createElement('p');
      info.textContent = `${r.login_email} · ${r.institution} · Team: ${r.team_name || 'No team'}\nStudent email: ${r.student_email} · Student number: ${r.student_number}\nDiscord: ${r.discord_username} · Photo consent: ${r.photo_consent === null ? 'Not answered' : r.photo_consent ? 'Yes' : 'No'}`;
      card.append(info);
      const status = document.createElement('select'); status.setAttribute('aria-label', `Registration status for ${r.name}`);
      for (const value of statuses) status.add(new Option(value, value)); status.value = r.status;
      const save = document.createElement('button'); save.textContent = 'Save status';
      save.onclick = () => run(async () => {
        const next = status.value;
        if (!confirm(`Set ${r.name} to ${next}?${next === 'accepted' ? ' This sends the acceptance email to their login address (once per participant).' : ''}`)) return;
        const result = await api('decision', { user_id: r.id, status: next });
        await load(); message(`Registration updated. ${result.email_notice || ''}`);
      });
      card.append(status, save); $('admin-rows').append(card);
    }
  }
  async function load() {
    const result = await api('list'); registrations = result.registrations;
    selected = new Set([...selected].filter(id => registrations.some(r => r.id === id)));
    render(); $('admin-history').replaceChildren();
    for (const email of result.emails) {
      const details = document.createElement('details'), summary = document.createElement('summary'), body = document.createElement('pre');
      summary.textContent = `${email.state} · ${email.recipient} · ${email.subject}`;
      body.textContent = `${new Date(email.created_at).toLocaleString()}\n${email.body}\n\n${email.message_id || email.detail || ''}`;
      details.append(summary, body);
      if (email.state === 'queued') {
        const send = document.createElement('button'); send.textContent = 'Send queued email';
        send.onclick = () => run(async () => {
          if (!confirm(`Send this email to ${email.recipient}?`)) return;
          const result = await api('send', { id: email.id }); await load(); message(result.email_notice);
        }); details.append(send);
      }
      $('admin-history').append(details);
    }
  }
  $('admin-open').onclick = () => run(async () => {
    reset(); await load(); $('admin-panel').hidden = false; message('Organizer dashboard loaded.');
  });
  $('admin-refresh').onclick = () => run(load);
  $('admin-search').oninput = render; $('admin-filter').onchange = render;
  $('admin-select').onclick = () => { visible().forEach(r => selected.add(r.id)); invalidate(); render(); };
  $('admin-clear').onclick = () => { selected.clear(); invalidate(); render(); };
  $('admin-email').oninput = invalidate;
  $('admin-email').onsubmit = e => {
    e.preventDefault();
    if (!selected.size) return message('Select at least one registration.', true);
    const data = Object.fromEntries(new FormData(e.target));
    draft = { ...data, recipients: registrations.filter(r => selected.has(r.id)).map(r => ({ id: crypto.randomUUID(), user_id: r.id, email: r.login_email })) };
    $('email-preview-text').textContent = `To (${draft.recipients.length} individual emails): ${draft.recipients.map(r => r.email).join(', ')}\nSubject: ${draft.subject}\n\n${draft.text}`;
    $('email-preview').hidden = false;
  };
  $('admin-send').onclick = () => run(async () => {
    if (!draft) throw new Error('Preview your email first.');
    if (!confirm(`Send ${draft.recipients.length} individual emails?`)) return;
    const pending = draft;
    let completed = 0;
    try {
      for (const r of pending.recipients) {
        const result = await api('compose', { id: r.id, user_id: r.user_id, subject: pending.subject, text: pending.text });
        completed++;
        message(`${completed}/${pending.recipients.length}: ${result.email_notice}`);
      }
      invalidate();
    } finally { await load(); }
  });
  function reset() {
    registrations = []; selected.clear(); invalidate();
    $('admin-panel').hidden = true; $('admin-rows').replaceChildren(); $('admin-history').replaceChildren();
    $('email-preview-text').textContent = ''; $('admin-email').reset();
  }
  return reset;
}
