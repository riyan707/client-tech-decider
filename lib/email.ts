import { Resend } from "resend";
import type { Recommendation } from "./types";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend's default onboarding address if the custom domain isn't verified
const FROM_EMAIL = "Tech Decider <onboarding@resend.dev>";
const REPLY_TO = "dsgnrlabs@gmail.com";

function buildEmailHtml(opts: {
  firstName: string;
  category: string;
  picks: Recommendation[];
  submissionId: string;
}): string {
  const { firstName, category, picks, submissionId } = opts;
  const siteUrl = process.env.SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://client-tech-decider.vercel.app";

  const pickRows = picks
    .map((p, i) => {
      const name = `${p.brand ?? ""} ${p.model ?? ""}`.trim();
      const pct = p.percent ?? 0;
      const reasons = (p.reasons ?? []).slice(0, 3);
      const affiliateLinks = p.affiliate_links ?? {};
      const linkButtons = Object.entries(affiliateLinks)
        .filter(([, url]) => typeof url === "string" && url.trim().length > 0)
        .map(
          ([retailer]) =>
            `<a href="${siteUrl}/r/${encodeURIComponent(p.product_id)}/${encodeURIComponent(retailer)}" style="display:inline-block;padding:10px 20px;margin:0 6px 6px 0;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Buy on ${retailer}</a>`
        )
        .join("");

      return `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;font-size:18px;font-weight:700;color:#111;">#${i + 1} — ${name}</h3>
            <span style="font-size:14px;font-weight:700;color:#059669;background:#d1fae5;padding:4px 12px;border-radius:999px;">${pct}% match</span>
          </div>
          ${p.price_hint ? `<p style="margin:6px 0 0;font-size:14px;color:#6b7280;">Price band: <strong>${p.price_hint}</strong></p>` : ""}
          <ul style="margin:12px 0 0;padding-left:20px;font-size:14px;color:#374151;line-height:1.6;">
            ${reasons.map((r) => `<li>${r}</li>`).join("")}
          </ul>
          ${p.warranty_text ? `<p style="margin:10px 0 0;font-size:13px;color:#6b7280;">Warranty: ${p.warranty_text}</p>` : ""}
          ${linkButtons ? `<div style="margin-top:14px;">${linkButtons}</div>` : '<p style="margin-top:10px;font-size:13px;color:#9ca3af;">Links coming soon.</p>'}
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#111;">Your Tech Decider Results</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Personalised ${category} picks for ${firstName}</p>
    </div>

    <div style="background:#fff;border-radius:16px;padding:24px;border:1px solid #e5e7eb;margin-bottom:20px;">
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
        Hi ${firstName},<br><br>
        Based on your quiz answers, here are the <strong>top ${picks.length} ${category}</strong> that match your needs:
      </p>
    </div>

    ${pickRows}

    <div style="text-align:center;margin-top:24px;">
      <a href="${siteUrl}/results/${submissionId}" style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">View full results →</a>
    </div>

    <div style="text-align:center;margin-top:24px;padding:16px 0;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Tech Decider — Independent product recommendations.<br>
        We may earn a commission if you buy through our links (at no extra cost to you).
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendResultsEmail(opts: {
  to: string;
  firstName: string;
  category: string;
  picks: Recommendation[];
  submissionId: string;
}): Promise<void> {
  const { to, firstName, category, picks, submissionId } = opts;

  const html = buildEmailHtml({ firstName, category, picks, submissionId });

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      replyTo: REPLY_TO,
      subject: `Your ${category} recommendations — Tech Decider`,
      html,
    });

    if (result.error) {
      console.error("[email] Resend error:", JSON.stringify(result.error));
    } else {
      console.log("[email] Sent successfully:", result.data?.id);
    }
  } catch (err) {
    // Never break the submission flow over email
    console.error("[email] Failed to send:", err);
  }
}
