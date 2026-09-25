import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AuthInlineNote,
  AuthShell,
  AuthSubmitButton,
  AuthTextField,
  authIcons,
} from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { user, signIn, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const mfaVerifyMutation = trpc.auth["mfa.verify"].useMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [apiError, setApiError] = useState("");

  // 2FA Challenge state
  const [isMfaChallenge, setIsMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const normalizedEmail = email.trim();
  const isEmailValid = emailRegex.test(normalizedEmail);
  const isPasswordValid = password.length > 0;
  const isFormValid = isEmailValid && isPasswordValid;

  const emailError =
    emailBlurred && !isEmailValid
      ? "Introduza um email válido, por exemplo nome@exemplo.com."
      : "";
  const passwordError =
    apiError ||
    (passwordBlurred && !isPasswordValid
      ? "Introduza a palavra-passe da sua conta."
      : "");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailBlurred(true);
    setPasswordBlurred(true);
    setApiError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      await signIn(normalizedEmail, password);

      // Check if user has MFA/TOTP active
      try {
        const mfaStatus = await utils.auth["mfa.status"].fetch();
        if (mfaStatus?.enabled) {
          setIsMfaChallenge(true);
          setLoading(false);
          return;
        }
      } catch (mfaStatusErr) {
        console.warn("[Login] Could not check MFA status:", mfaStatusErr);
      }

      toast.success("Bem-vindo de volta!");
      setLocation("/dashboard");
    } catch {
      setApiError(
        "Email ou palavra-passe incorretos. Verifique os dados e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMfaError("");

    const cleanCode = mfaCode.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setMfaError("Introduza o código numérico de 6 dígitos.");
      return;
    }

    setMfaLoading(true);
    try {
      await mfaVerifyMutation.mutateAsync({ code: cleanCode });
      toast.success("Autenticação em dois passos validada com sucesso!");
      setLocation("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Código inválido ou expirado. Tente o código atual da sua aplicação.";
      setMfaError(message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCancelMfa = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    setIsMfaChallenge(false);
    setMfaCode("");
    setMfaError("");
    setPassword("");
  };

  return (
    <AuthShell
      mode="login"
      title={
        isMfaChallenge ? "Autenticação em Dois Passos" : "Entrar no PeloNaRoupa"
      }
      subtitle={
        isMfaChallenge
          ? "Esta conta tem 2FA ativo. Introduza o código de 6 dígitos gerado pela sua aplicação de autenticação."
          : "Aceda ao histórico, gravações e perfil dos seus animais com uma sessão segura."
      }
      showOAuth={!isMfaChallenge}
      footer={
        isMfaChallenge ? (
          <div className="space-y-3 text-center text-sm">
            <button
              type="button"
              onClick={handleCancelMfa}
              className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft size={14} />
              Voltar ao início de sessão
            </button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A sua conta está protegida por TOTP (RFC 6238).
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-center text-sm">
            <button
              type="button"
              onClick={() => setLocation("/forgot-password")}
              className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Esqueceu a palavra-passe?
            </button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ao continuar, mantém o mesmo acesso seguro usado em toda a app.
            </p>
          </div>
        )
      }
    >
      {isMfaChallenge ? (
        <form onSubmit={handleMfaSubmit} className="space-y-4" noValidate>
          <AuthInlineNote
            icon={ShieldCheck}
            tone="neutral"
            title="Verificação de Segurança (TOTP)"
            description={
              <span>
                Introduza o código gerado pelo Google Authenticator, 1Password,
                Authy ou pela sua app de autenticação para{" "}
                <strong>{normalizedEmail}</strong>.
              </span>
            }
          />

          <AuthTextField
            id="login-mfa-code"
            label="Código de Autenticação (6 dígitos)"
            icon={KeyRound}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={mfaCode}
            onChange={(event) => {
              const val = event.target.value.replace(/\D/g, "").slice(0, 6);
              setMfaCode(val);
              setMfaError("");
            }}
            autoComplete="one-time-code"
            autoFocus
            disabled={mfaLoading}
            error={mfaError}
            success={mfaCode.length === 6 ? "Código completo" : undefined}
          />

          <AuthSubmitButton
            loading={mfaLoading}
            loadingLabel="A verificar código..."
            disabled={mfaCode.length !== 6 || mfaLoading}
          >
            Verificar e Entrar
          </AuthSubmitButton>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthTextField
            id="login-email"
            label="Email"
            icon={authIcons.email}
            type="email"
            placeholder="alex@exemplo.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setApiError("");
            }}
            onBlur={() => setEmailBlurred(true)}
            autoComplete="username"
            inputMode="email"
            disabled={loading}
            error={emailError}
            success={isEmailValid ? "Válido" : undefined}
          />

          <AuthTextField
            id="login-password"
            label="Palavra-passe"
            icon={authIcons.password}
            type="password"
            placeholder="A sua palavra-passe"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setApiError("");
            }}
            onBlur={() => setPasswordBlurred(true)}
            autoComplete="current-password"
            disabled={loading}
            error={passwordError}
            success={isPasswordValid && !apiError ? "Preenchida" : undefined}
          />

          <AuthSubmitButton loading={loading} loadingLabel="A entrar...">
            Entrar
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
