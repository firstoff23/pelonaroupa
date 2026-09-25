import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPrefixCache,
  isPasswordPwned,
  validatePasswordNotPwned,
} from "./check-password-pwned";

describe("isPasswordPwned", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    clearPrefixCache();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    clearPrefixCache();
  });

  it("devolve pwned=true e o count para password conhecida (password123)", async () => {
    // SHA-1 de "password123" = CBFDAC6008F9CAB4083784CBD1874F76618D2A97
    // Prefix: CBFDA, Suffix: C6008F9CAB4083784CBD1874F76618D2A97
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        "C6008F9CAB4083784CBD1874F76618D2A97:12345\r\nABCDE1234567890:1",
    });

    const result = await isPasswordPwned("password123");
    expect(result.pwned).toBe(true);
    expect(result.count).toBe(12345);
  });

  it("devolve pwned=false para password segura não listada", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\r\n",
    });

    const result = await isPasswordPwned("Xy9#mK2$pL8@qW4!");
    expect(result.pwned).toBe(false);
    expect(result.count).toBe(0);
  });

  it("ignora registos de padding com count 0 do Add-Padding (evita falsos positivos)", async () => {
    // SHA-1 de "password123" suffix: C6008F9CAB4083784CBD1874F76618D2A97
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "C6008F9CAB4083784CBD1874F76618D2A97:0\r\n",
    });

    const result = await isPasswordPwned("password123");
    expect(result.pwned).toBe(false);
    expect(result.count).toBe(0);
  });

  it("fail-open se a API do HIBP devolver status de erro (503)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    const result = await isPasswordPwned("password123");
    expect(result.pwned).toBe(false);
    expect(result.count).toBe(0);
  });

  it("fail-open se houver timeout ou erro de rede", async () => {
    mockFetch.mockRejectedValueOnce(new Error("AbortError"));

    const result = await isPasswordPwned("password123");
    expect(result.pwned).toBe(false);
    expect(result.count).toBe(0);
  });

  it("nunca envia a password completa para a API externa (k-anonymity)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "",
    });

    await isPasswordPwned("MinhaPassSuperSecreta!2026");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(
      /^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/,
    );
    expect(calledUrl).not.toContain("MinhaPassSuperSecreta!2026");
  });

  it("não faz chamada HTTP para passwords com menos de 8 caracteres", async () => {
    const result = await isPasswordPwned("curta");
    expect(result.pwned).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reutiliza a cache para o mesmo prefixo de hash SHA-1", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "C6008F9CAB4083784CBD1874F76618D2A97:12345",
    });

    const result1 = await isPasswordPwned("password123");
    const result2 = await isPasswordPwned("password123");

    expect(result1.pwned).toBe(true);
    expect(result2.pwned).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Apenas 1 chamada HTTP graças à cache
  });
});

describe("validatePasswordNotPwned", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    clearPrefixCache();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    clearPrefixCache();
  });

  it("devolve mensagem de alerta em PT se a password constar em fugas", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "C6008F9CAB4083784CBD1874F76618D2A97:12345",
    });

    const message = await validatePasswordNotPwned("password123");
    expect(message).not.toBeNull();
    expect(message).toContain("12");
    expect(message).toContain("fuga");
    expect(message).toContain("Por segurança, escolha outra");
  });

  it("devolve null se a password não constar em fugas conhecidas", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "",
    });

    const message = await validatePasswordNotPwned("MinhaSuperPass!2026");
    expect(message).toBeNull();
  });
});
