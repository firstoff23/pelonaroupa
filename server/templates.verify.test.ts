import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase Email Templates & Security Notifications", () => {
  const rootDir = path.resolve(__dirname, "..");
  const templatesDir = path.join(rootDir, "supabase", "templates");
  const configTomlPath = path.join(rootDir, "supabase", "config.toml");

  const expectedAuthTemplates = [
    {
      file: "confirm_signup.html",
      name: "Confirm sign up (confirmation)",
      requiredVars: ["{{ .ConfirmationURL }}", "{{ .Token }}"],
    },
    {
      file: "invite.html",
      name: "Invite user (invite)",
      requiredVars: ["{{ .ConfirmationURL }}", "{{ .Token }}"],
    },
    {
      file: "magic_link.html",
      name: "Magic link or OTP (magic_link)",
      requiredVars: ["{{ .ConfirmationURL }}", "{{ .Token }}"],
    },
    {
      file: "email_change.html",
      name: "Change email address (email_change)",
      requiredVars: ["{{ .ConfirmationURL }}", "{{ .Token }}", "{{ .NewEmail }}"],
    },
    {
      file: "recovery.html",
      name: "Reset password (recovery)",
      requiredVars: ["{{ .ConfirmationURL }}", "{{ .Token }}"],
    },
    {
      file: "reauthentication.html",
      name: "Reauthentication (reauthentication)",
      requiredVars: ["{{ .Token }}"],
    },
  ];

  const expectedNotificationTemplates = [
    {
      file: "password_changed_notification.html",
      name: "Password changed (password_changed)",
      requiredKeywords: ["palavra-passe", "alterada"],
    },
    {
      file: "email_changed_notification.html",
      name: "Email address changed (email_changed)",
      requiredKeywords: ["email", "alterado"],
      requiredVars: ["{{ .OldEmail }}", "{{ .Email }}"],
    },
    {
      file: "phone_changed_notification.html",
      name: "Phone number changed (phone_changed)",
      requiredKeywords: ["telefone", "alterado"],
    },
    {
      file: "identity_linked_notification.html",
      name: "Sign-in method linked (identity_linked)",
      requiredKeywords: ["método", "associado"],
    },
    {
      file: "identity_unlinked_notification.html",
      name: "Sign-in method removed (identity_unlinked)",
      requiredKeywords: ["método", "removido"],
    },
    {
      file: "mfa_factor_enrolled_notification.html",
      name: "MFA method added (mfa_factor_enrolled)",
      requiredKeywords: ["MFA", "ativada"],
    },
    {
      file: "mfa_factor_unenrolled_notification.html",
      name: "MFA method removed (mfa_factor_unenrolled)",
      requiredKeywords: ["MFA", "desativada"],
    },
  ];

  it("should have all 6 authentication template files present, valid and non-empty", () => {
    for (const t of expectedAuthTemplates) {
      const fullPath = path.join(templatesDir, t.file);
      expect(fs.existsSync(fullPath), `Missing template file: ${t.file}`).toBe(true);

      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content.length).toBeGreaterThan(1000);
      expect(content).toContain("<!DOCTYPE html>");
      const hasBranding = content.includes("PeloNaRoupa") || content.includes("AnimalMind");
      expect(hasBranding, `Template ${t.file} missing branding`).toBe(true);

      for (const v of t.requiredVars) {
        expect(content, `Template ${t.file} missing required variable ${v}`).toContain(v);
      }
    }
  });

  it("should have all 7 security notification template files present, valid and non-empty", () => {
    for (const t of expectedNotificationTemplates) {
      const fullPath = path.join(templatesDir, t.file);
      expect(fs.existsSync(fullPath), `Missing notification template: ${t.file}`).toBe(true);

      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content.length).toBeGreaterThan(1000);
      expect(content).toContain("<!DOCTYPE html>");
      expect(content).toContain("AnimalMind");

      for (const kw of t.requiredKeywords) {
        expect(content.toLowerCase(), `Notification ${t.file} missing keyword ${kw}`).toContain(kw.toLowerCase());
      }

      if (t.requiredVars) {
        for (const v of t.requiredVars) {
          expect(content, `Notification ${t.file} missing variable ${v}`).toContain(v);
        }
      }
    }
  });

  it("should have all 13 templates correctly registered in supabase/config.toml", () => {
    expect(fs.existsSync(configTomlPath)).toBe(true);
    const configContent = fs.readFileSync(configTomlPath, "utf-8");

    // Check auth email templates
    const authKeys = [
      "confirmation",
      "invite",
      "magic_link",
      "email_change",
      "recovery",
      "reauthentication",
    ];
    for (const key of authKeys) {
      expect(configContent).toContain(`[auth.email.template.${key}]`);
    }

    // Check security notification templates
    const notificationKeys = [
      "password_changed",
      "email_changed",
      "phone_changed",
      "identity_linked",
      "identity_unlinked",
      "mfa_factor_enrolled",
      "mfa_factor_unenrolled",
    ];
    for (const key of notificationKeys) {
      expect(configContent).toContain(`[auth.email.notification.${key}]`);
      expect(configContent).toMatch(
        new RegExp(`\\[auth\\.email\\.notification\\.${key}\\][\\s\\S]*?enabled\\s*=\\s*true`)
      );
    }

    // Check that every content_path in config.toml points to an existing file
    const contentPathRegex = /content_path\s*=\s*"([^"]+)"/g;
    let match;
    let count = 0;
    while ((match = contentPathRegex.exec(configContent)) !== null) {
      count++;
      const relativePath = match[1];
      const resolvedPath = path.resolve(rootDir, relativePath);
      expect(fs.existsSync(resolvedPath), `Path in config.toml does not exist: ${relativePath}`).toBe(true);
    }
    expect(count).toBe(13);
  });
});
