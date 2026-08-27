import nodemailer from "nodemailer";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "http://localhost:3000";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const SMTP_FROM =
  process.env.SMTP_FROM || "Hireloop Talent Network <noreply@hireloop.dev>";

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function emailWrapper(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e2825;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7f9f8; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4eae8; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="background-color: #7a1229; padding: 24px 32px; text-align: left;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 700; font-size: 16px;">
                    ✦
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Hireloop</span>
                    <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.7); font-weight: 600;">Talent Network</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafbfb; padding: 20px 32px; border-top: 1px solid #edf1f0; text-align: center; font-size: 12px; color: #788c85;">
              <p style="margin: 0 0 6px 0;">This email was sent by <strong>Hireloop Talent Network</strong>.</p>
              <p style="margin: 0;">If you did not expect this message, you can safely disregard it.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendCandidateInviteEmail({
  to,
  candidateName,
  inviteLink,
}: {
  to: string;
  candidateName: string;
  inviteLink: string;
}): Promise<{ success: boolean; delivered: boolean; error?: string }> {
  const subject = "You're invited to the Hireloop Candidate Portal";
  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 700; color: #1e2825; margin: 0 0 16px 0;">Welcome, ${candidateName}!</h2>
    <p style="font-size: 15px; line-height: 1.5; color: #475a53; margin: 0 0 20px 0;">
      Your recruiting team has invited you to your personal <strong>Hireloop Candidate Portal</strong>. Track your active placement pipeline, view scheduled interviews, update your availability, and refine your skill matrices in real time.
    </p>
    <div style="background-color: #f3f7f5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #479c73;">
      <p style="font-size: 14px; color: #2e3e38; margin: 0; font-weight: 500;">
        ⚡ <strong>Passwordless Access:</strong> Click below to securely enter your candidate dashboard immediately. No password required.
      </p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}" style="display: inline-block; background-color: #7a1229; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(122, 18, 41, 0.25);">
        Enter Candidate Portal →
      </a>
    </div>
    <p style="font-size: 12px; color: #788c85; margin: 24px 0 6px 0; word-break: break-all;">
      Or copy and paste this secure link into your browser:
    </p>
    <p style="font-size: 12px; color: #3b82f6; margin: 0; word-break: break-all;">
      <a href="${inviteLink}" style="color: #3b82f6; text-decoration: underline;">${inviteLink}</a>
    </p>
    <p style="font-size: 12px; color: #a2b0ab; margin: 20px 0 0 0;">
      This link is valid for 72 hours.
    </p>
  `;

  const html = emailWrapper(subject, bodyContent);
  const transporter = getTransporter();

  if (!transporter) {
    console.log(
      `\n======================================================\n[EMAIL DISPATCH (DEV MODE - SMTP NOT CONFIGURED)]\nTo: ${to} (${candidateName})\nSubject: ${subject}\nMagic Link: ${inviteLink}\n======================================================\n`
    );
    return { success: true, delivered: false };
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    return { success: true, delivered: true };
  } catch (err: unknown) {
    console.error("SMTP Delivery error:", err);
    console.log(
      `\n======================================================\n[EMAIL DISPATCH (FALLBACK AFTER SMTP ERROR)]\nTo: ${to} (${candidateName})\nSubject: ${subject}\nMagic Link: ${inviteLink}\n======================================================\n`
    );
    return {
      success: true,
      delivered: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
    };
  }
}

export async function sendCandidateLoginEmail({
  to,
  candidateName,
  magicLink,
}: {
  to: string;
  candidateName: string;
  magicLink: string;
}): Promise<{ success: boolean; delivered: boolean; error?: string }> {
  const subject = "Your Hireloop Portal Sign-In Link";
  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 700; color: #1e2825; margin: 0 0 16px 0;">Sign in to Hireloop</h2>
    <p style="font-size: 15px; line-height: 1.5; color: #475a53; margin: 0 0 20px 0;">
      Hello ${candidateName}, click the button below to sign in to your Candidate Portal.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${magicLink}" style="display: inline-block; background-color: #7a1229; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(122, 18, 41, 0.25);">
        Sign In to Portal →
      </a>
    </div>
    <p style="font-size: 12px; color: #788c85; margin: 24px 0 6px 0; word-break: break-all;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #3b82f6; margin: 0; word-break: break-all;">
      <a href="${magicLink}" style="color: #3b82f6; text-decoration: underline;">${magicLink}</a>
    </p>
    <p style="font-size: 12px; color: #a2b0ab; margin: 20px 0 0 0;">
      This sign-in link is valid for 15 minutes and can only be used once.
    </p>
  `;

  const html = emailWrapper(subject, bodyContent);
  const transporter = getTransporter();

  if (!transporter) {
    console.log(
      `\n======================================================\n[EMAIL DISPATCH (DEV MODE - SMTP NOT CONFIGURED)]\nTo: ${to} (${candidateName})\nSubject: ${subject}\nMagic Link: ${magicLink}\n======================================================\n`
    );
    return { success: true, delivered: false };
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    return { success: true, delivered: true };
  } catch (err: unknown) {
    console.error("SMTP Delivery error:", err);
    console.log(
      `\n======================================================\n[EMAIL DISPATCH (FALLBACK AFTER SMTP ERROR)]\nTo: ${to} (${candidateName})\nSubject: ${subject}\nMagic Link: ${magicLink}\n======================================================\n`
    );
    return {
      success: true,
      delivered: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
    };
  }
}

export async function sendTeamInviteEmail({
  to,
  inviterName,
  orgName,
  role,
  inviteLink,
}: {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteLink: string;
}): Promise<{ success: boolean; delivered: boolean; error?: string }> {
  const subject = `${inviterName} invited you to ${orgName} on Hireloop`;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 700; color: #1e2825; margin: 0 0 16px 0;">You've been invited!</h2>
    <p style="font-size: 15px; line-height: 1.5; color: #475a53; margin: 0 0 20px 0;">
      <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Hireloop as a <strong>${roleLabel}</strong>.
    </p>
    <div style="background-color: #f3f7f5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #479c73;">
      <p style="font-size: 14px; color: #2e3e38; margin: 0; font-weight: 500;">
        As a ${roleLabel}, you'll be able to ${
          role === "owner"
            ? "manage the entire workspace, team, and integrations"
            : role === "admin"
            ? "manage team members, candidates, placements, and audit logs"
            : "view and manage candidates, placements, and clients"
        }.
      </p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}" style="display: inline-block; background-color: #7a1229; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(122, 18, 41, 0.25);">
        Accept Invitation →
      </a>
    </div>
    <p style="font-size: 12px; color: #788c85; margin: 24px 0 6px 0; word-break: break-all;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #3b82f6; margin: 0; word-break: break-all;">
      <a href="${inviteLink}" style="color: #3b82f6; text-decoration: underline;">${inviteLink}</a>
    </p>
    <p style="font-size: 12px; color: #a2b0ab; margin: 20px 0 0 0;">
      This invitation link is valid for 7 days and can only be used once. If you did not expect this invitation, you can safely ignore this email.
    </p>
  `;

  const html = emailWrapper(subject, bodyContent);
  const transporter = getTransporter();

  if (!transporter) {
    console.log(
      `\n======================================================\n[TEAM INVITE (DEV MODE)]\nTo: ${to}\nOrg: ${orgName}\nRole: ${role}\nLink: ${inviteLink}\n======================================================\n`
    );
    return { success: true, delivered: false };
  }

  try {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    return { success: true, delivered: true };
  } catch (err: unknown) {
    console.error("SMTP Team Invite error:", err);
    console.log(`[TEAM INVITE FALLBACK] Link: ${inviteLink}`);
    return {
      success: true,
      delivered: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
    };
  }
}

