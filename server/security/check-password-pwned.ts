import { createHash } from "node:crypto";

interface PwnedResult {
  pwned: boolean;
  count: number;
}

// Cache em memória simples com TTL para evitar requisições redundantes ao HIBP
interface CacheEntry {
  expiresAt: number;
  lines: string[];
}

const PREFIX_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_CACHE_SIZE = 500;

function getCachedPrefix(prefix: string): string[] | null {
  const entry = PREFIX_CACHE.get(prefix);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    PREFIX_CACHE.delete(prefix);
    return null;
  }
  return entry.lines;
}

function setCachedPrefix(prefix: string, lines: string[]): void {
  if (PREFIX_CACHE.size >= MAX_CACHE_SIZE) {
    const oldestKey = PREFIX_CACHE.keys().next().value;
    if (oldestKey) PREFIX_CACHE.delete(oldestKey);
  }
  PREFIX_CACHE.set(prefix, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    lines,
  });
}

/**
 * Limpa a cache de prefixos (útil para testes unitários).
 */
export function clearPrefixCache(): void {
  PREFIX_CACHE.clear();
}

/**
 * Verifica se uma password aparece em fugas de dados conhecidas
 * usando a API pública do HaveIBeenPwned (modelo k-anonymity).
 *
 * A password NUNCA é enviada para fora do servidor. Apenas os
 * primeiros 5 caracteres do hash SHA-1 são enviados para o HIBP.
 * O servidor compara o sufixo restante localmente.
 *
 * @param password Palavra-passe a verificar
 * @returns { pwned: boolean, count: number }
 */
export async function isPasswordPwned(password: string): Promise<PwnedResult> {
  if (!password || password.length < 8) {
    return { pwned: false, count: 0 };
  }

  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  let lines = getCachedPrefix(prefix);

  if (!lines) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    try {
      const res = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        {
          headers: {
            "Add-Padding": "true", // Protege contra timing/payload size analysis
            "User-Agent": "PeloNaRoupa-PasswordChecker",
          },
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        // Fail-open por UX: se a API do HIBP falhar ou der 5xx/429, não bloqueia registos legítimos
        console.warn(`[HIBP] API respondeu com status ${res.status}. A ignorar verificação.`);
        return { pwned: false, count: 0 };
      }

      const body = await res.text();
      lines = body.split("\n");
      setCachedPrefix(prefix, lines);
    } catch (error) {
      // Fail-open: timeout ou erro de rede não impede o utilizador
      console.warn("[HIBP] Falha ao contactar a API pwnedpasswords:", error);
      return { pwned: false, count: 0 };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  for (const line of lines) {
    const [rawSuffix, rawCount] = line.split(":");
    if (!rawSuffix || !rawCount) continue;

    const hashSuffix = rawSuffix.trim().toUpperCase();
    const count = parseInt(rawCount.trim(), 10);

    // Com Add-Padding: true, registos fictícios vêm com count 0.
    // Apenas consideramos pwned se count > 0 e o sufixo bater certo.
    if (hashSuffix === suffix && !Number.isNaN(count) && count > 0) {
      return { pwned: true, count };
    }
  }

  return { pwned: false, count: 0 };
}

/**
 * Validador auxiliar que devolve uma mensagem de erro em português
 * se a password tiver sido comprometida, ou null se for segura.
 */
export async function validatePasswordNotPwned(
  password: string,
): Promise<string | null> {
  const { pwned, count } = await isPasswordPwned(password);

  if (!pwned) return null;

  return `Esta palavra-passe foi encontrada em ${count.toLocaleString("pt-PT")} fuga(s) de dados públicas conhecidas. Por segurança, escolha outra.`;
}
