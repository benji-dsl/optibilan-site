const RESEND_API = 'https://api.resend.com/emails';
const TO_ADDRESS = 'contact@optibilan.com';
const FROM_ADDRESS = 'no-reply@optibilan.com';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
}

export async function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env: { RESEND_API_KEY?: string };
}) {
  try {
    const form = await request.formData();

    const firstName = (form.get('firstName') || '').toString().trim().slice(0, 80);
    const lastName = (form.get('lastName') || '').toString().trim().slice(0, 80);
    const email = (form.get('email') || '').toString().trim().toLowerCase().slice(0, 160);
    const cabinet = (form.get('cabinet') || '').toString().trim().slice(0, 160);
    const subject = (form.get('subject') || '').toString().trim().slice(0, 80);
    const message = (form.get('message') || '').toString().trim().slice(0, 5000);
    const website = (form.get('website') || '').toString().trim();
    const consent = form.get('consent');

    if (website) return json({ error: 'Spam détecté' }, 400);

    if (!firstName || !lastName) return json({ error: 'Prénom et nom requis' }, 400);
    if (!isEmail(email)) return json({ error: 'Email invalide' }, 400);
    if (!subject) return json({ error: 'Sujet requis' }, 400);
    if (!message || message.length < 10) return json({ error: 'Message requis (10 caractères min.)' }, 400);
    if (!consent) return json({ error: 'Consentement requis' }, 400);

    const apiKey = (env.RESEND_API_KEY || '').trim();
    if (!apiKey || !apiKey.startsWith('re_')) {
      return json({ error: 'Service de messagerie non configuré' }, 500);
    }

    const subjectLabel = String(subject);
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${'Contact Optibilan'} <${FROM_ADDRESS}>`,
        to: [TO_ADDRESS],
        replyTo: email,
        subject: `[Contact] ${subjectLabel} - ${firstName} ${lastName}`,
        text: `Prénom : ${firstName}\nNom : ${lastName}\nEmail : ${email}\nCabinet : ${cabinet || 'Non renseigné'}\nSujet : ${subjectLabel}\n\n${message}`,
        html: ``
          + `<p><strong>Prénom :</strong> ${escapeHtml(firstName)}</p>`
          + `<p><strong>Nom :</strong> ${escapeHtml(lastName)}</p>`
          + `<p><strong>Email :</strong> ${escapeHtml(email)}</p>`
          + `<p><strong>Cabinet :</strong> ${escapeHtml(cabinet) || 'Non renseigné'}</p>`
          + `<p><strong>Sujet :</strong> ${escapeHtml(subjectLabel)}</p>`
          + `<p><strong>Message :</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json({ error: 'Échec de l\'envoi', detail }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Erreur interne', detail: String(err) }, 500);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c];
  });
}