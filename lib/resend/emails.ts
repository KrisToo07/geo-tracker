import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Sender address. Resend rejects unverified domains, so this MUST be a domain you own and have
// verified in Resend (set EMAIL_FROM once you do). Until then it falls back to Resend's shared
// onboarding sender, which works out of the box (test mode only sends to your own address).
const FROM = process.env.EMAIL_FROM || 'GEO Tracker <onboarding@resend.dev>';

export async function sendScoreDropAlert({
  to, brandName, previousScore, currentScore, scanUrl,
}: {
  to: string; brandName: string; previousScore: number;
  currentScore: number; scanUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `⚠️ ${brandName} visibility dropped to ${currentScore.toFixed(0)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#ef4444">Visibility Score Alert</h2>
        <p>Your brand <strong>${brandName}</strong> visibility score has dropped.</p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0">Previous score: <strong>${previousScore.toFixed(0)}</strong></p>
          <p style="margin:8px 0 0">Current score: <strong style="color:#ef4444">${currentScore.toFixed(0)}</strong></p>
          <p style="margin:8px 0 0">Drop: <strong>${(previousScore - currentScore).toFixed(0)} points</strong></p>
        </div>
        <a href="${scanUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
          View Full Report
        </a>
      </div>
    `,
  });
}

export async function sendNotMentionedAlert({
  to, brandName, llmProvider, keyword, scanUrl,
}: {
  to: string; brandName: string; llmProvider: string; keyword: string; scanUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `🔍 ${brandName} not mentioned for "${keyword}" on ${llmProvider}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#f59e0b">Brand Not Mentioned</h2>
        <p><strong>${brandName}</strong> was not mentioned by <strong>${llmProvider}</strong> when asked:</p>
        <blockquote style="border-left:4px solid #6366f1;padding-left:16px;color:#374151">"${keyword}"</blockquote>
        <a href="${scanUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
          View Full Report
        </a>
      </div>
    `,
  });
}
