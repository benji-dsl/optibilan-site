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

    const email = (form.get('email') || '').toString().trim().toLowerCase().slice(0, 160);
    const website = (form.get('website') || '').toString().trim();
    const consent = form.get('consent');

    if (website) return json({ error: 'Spam détecté' }, 400);
    if (!isEmail(email)) return json({ error: 'Email invalide' }, 400);
    if (!consent) return json({ error: 'Consentement requis' }, 400);

    const apiKey = (env.RESEND_API_KEY || '').trim();
    if (!apiKey || !apiKey.startsWith('re_')) {
      return json({ error: 'Service de messagerie non configuré' }, 500);
    }

    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Contact Optibilan <${FROM_ADDRESS}>`,
        to: [TO_ADDRESS],
        replyTo: email,
        subject: `[Newsletter] ${email}`,
        text: `Nouvelle inscription newsletter depuis optibilan.com.\nEmail : ${email}`,
        html: `<p>Nouvelle inscription newsletter depuis optibilan.com.</p><p>Email : ${email.replace(
          /[&<>"']/g,
          (c) =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;',
            })[c],
        )}</p>`,
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