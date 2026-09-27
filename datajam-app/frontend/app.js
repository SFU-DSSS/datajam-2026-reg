import { createClient } from '@supabase/supabase-js';
import { setupAdmin } from './admin.js';
const $ = id => document.getElementById(id);
let client, state, widget, captchaToken = '', busy = false;
let resetAdmin = () => {};
let recovering = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
const invitation = new URLSearchParams(location.search).get('invite');
if (invitation && /^[a-f0-9]{12}$/i.test(invitation)) localStorage.setItem('pending-invite', invitation);
function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
function fields(form) { return Object.fromEntries(new FormData(form)); }
async function run(fn) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  try { await fn(); } catch (e) { message(e.message || 'Something went wrong.', true); }
  finally { busy = false; document.querySelectorAll('button').forEach(b => b.disabled = false); }
}
async function api(action, data = {}) {
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error('Please sign in.');
  const res = await fetch('/api/action', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, data })
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Request failed.');
  state = result;
  render();
  return result;
}
function render() {
  const { profile, team, permissions, max_team_size } = state;
  const profileComplete = profile && typeof profile.photo_consent === 'boolean';
  $('profile-details').open = !profileComplete;
  for (const input of $('profile-form').querySelectorAll('input[name=photo_consent]')) {
    input.checked = typeof profile?.photo_consent === 'boolean' && input.value === String(profile.photo_consent);
  }
  if (profile) for (const [key, value] of Object.entries(profile)) {
    if (key === 'photo_consent') continue;
    const input = $('profile-form').elements.namedItem(key);
    if (input) input.value = value;
  }
  $('choose-team').hidden = !profileComplete || !!team;
  $('team').hidden = !team;
  $('capacity').textContent = `Teams can have up to ${max_team_size} members. You can belong to one team.`;
  $('join-form').elements.code.value = localStorage.getItem('pending-invite') || '';
  if (!team) return;
  $('team-name').textContent = team.name;
  $('team-count').textContent = `${team.members.length} / ${max_team_size} members`;
  $('invite-code').value = team.invite_code;
  $('invite-link').value = `${location.origin}/?invite=${team.invite_code}`;
  $('captain').hidden = !permissions.manage_team;
  $('rename-form').elements.name.value = team.name;
  $('roster').replaceChildren();
  for (const member of team.members) {
    const li = document.createElement('li');
    li.textContent = `${member.name} · ${member.discord_username}${member.id === team.captain_id ? ' (captain)' : ''} `;
    if (permissions.manage_team && member.id !== state.user_id) {
      for (const [action, label] of [['remove', 'Remove'], ['transfer', 'Make captain']]) {
        const button = document.createElement('button');
        button.textContent = label;
        button.onclick = () => run(async () => {
          if (!confirm(`${label}: ${member.name}?`)) return;
          await api(action, { user_id: member.id });
          message(action === 'remove' ? 'Member removed; invitations regenerated.' : 'Captaincy transferred.');
        });
        li.append(button);
      }
    }
    $('roster').append(li);
  }
}
async function refresh() {
  const { data: { session } } = await client.auth.getSession();
  $('auth').hidden = !!session;
  $('account').hidden = !session;
  if (!session) { state = null; resetAdmin(); return; }
  $('account-email').textContent = session.user.email;
  $('profile-form').elements.student_email.value ||= session.user.email;
  $('password-form').hidden = !recovering;
  await api('me');
  message(recovering ? 'Choose your new password.' : state.next_step === 'complete_profile' ? 'Complete your profile to create or join a team.' : 'Account loaded.');
}
function bindForm(id, action, success) {
  $(id).onsubmit = e => { e.preventDefault(); run(async () => {
    const data = fields(e.target);
    if (action === 'profile') {
      if (!['true', 'false'].includes(data.photo_consent)) throw new Error('Choose your photo consent preference.');
      data.photo_consent = data.photo_consent === 'true';
    }
    await api(action, data);
    if (action === 'join' || action === 'create') {
      localStorage.removeItem('pending-invite');
      history.replaceState(null, '', location.pathname);
    }
    message(success);
  }); };
}
async function init() {
  const res = await fetch('/api/config');
  const config = await res.json();
  if (!res.ok) throw new Error(config.error);
  client = createClient(config.url, config.key);
  resetAdmin = setupAdmin(client, run, message);
  // Supabase consumes verification/recovery URL fragments and persists the session.
  client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') recovering = true;
    if (['SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(event)) setTimeout(() => {
      if (!busy) run(refresh);
    }, 0);
  });
  if (config.captchaSiteKey) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.onload = resolve; script.onerror = () => reject(new Error('CAPTCHA could not load. Refresh to try again.'));
      document.head.append(script);
    });
    widget = window.turnstile.render('#captcha', { sitekey: config.captchaSiteKey,
      callback: token => { captchaToken = token; },
      'expired-callback': () => { captchaToken = ''; },
      'error-callback': () => { captchaToken = ''; message('CAPTCHA failed. Please retry.', true); }
    });
  }
  $('auth-form').onsubmit = e => {
    e.preventDefault();
    const intent = e.submitter.value;
    run(async () => {
      const { email, password } = fields(e.target);
      if (!e.target.elements.email.reportValidity()) return;
      if (config.captchaSiteKey && !captchaToken) throw new Error('Complete the CAPTCHA first.');
      try {
        let result;
        if (intent === 'signup') result = await client.auth.signUp({ email, password, options: { captchaToken, emailRedirectTo: location.origin + '/' } });
        else if (intent === 'reset') result = await client.auth.resetPasswordForEmail(email, { captchaToken, redirectTo: location.origin + '/' });
        else result = await client.auth.signInWithPassword({ email, password, options: { captchaToken } });
        if (result.error) throw result.error;
        if (intent === 'login') await refresh();
        else message(intent === 'signup' ? 'Check your login email for the verification link, then return here to log in.' : 'If this account exists, a reset link will arrive by email.');
        e.target.elements.password.value = '';
      } finally { captchaToken = ''; if (widget !== undefined) window.turnstile.reset(widget); }
    });
  };
  $('logout').onclick = () => run(async () => {
    const { error } = await client.auth.signOut(); if (error) throw error;
    recovering = false; $('profile-form').reset(); await refresh(); message('Logged out.');
  });
  $('password-form').onsubmit = e => { e.preventDefault(); run(async () => {
    const { error } = await client.auth.updateUser({ password: fields(e.target).password });
    if (error) throw error;
    recovering = false; e.target.reset(); $('password-form').hidden = true; message('Password updated.');
  }); };
  bindForm('profile-form', 'profile', 'Profile saved.');
  bindForm('create-form', 'create', 'Team created. You are the captain.');
  bindForm('join-form', 'join', 'You joined the team.');
  bindForm('rename-form', 'rename', 'Team renamed.');
  $('rotate').onclick = () => run(async () => {
    if (!confirm('Invalidate the old invitation code and link?')) return;
    await api('rotate'); message('New invitations are ready to copy.');
  });
  $('leave').onclick = () => run(async () => {
    if (!confirm('Leave this team? If you are the last member, the team will be deleted.')) return;
    await api('leave'); message('You left the team.');
  });
  for (const type of ['code', 'link']) $('copy-' + type).onclick = () => run(async () => {
    await navigator.clipboard.writeText($('invite-' + type).value); message(`Invitation ${type} copied.`);
  });
  await refresh();
  if (!state) message(config.captchaSiteKey ? 'Log in or create your account.' : 'Local testing: CAPTCHA widget is not configured. Enable it before public registration.');
}
run(init);
