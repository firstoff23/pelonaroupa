import logging
import os
from typing import Optional
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

security_bearer = HTTPBearer(auto_error=False)

_jwks_clients: dict = {}


def _get_jwks_client(supabase_url: str):
    if supabase_url not in _jwks_clients:
        try:
            from jwt import PyJWKClient

            jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            _jwks_clients[supabase_url] = PyJWKClient(
                jwks_url, cache_jwk_set=True, lifespan=3600
            )
        except Exception as exc:
            logger.warning(
                "Could not initialize PyJWKClient for %s: %s", supabase_url, exc
            )
            return None
    return _jwks_clients.get(supabase_url)


def verify_api_key(api_key: Optional[str]) -> bool:
    """Verifies X-API-Key header against API_KEY environment variable."""
    expected_key = os.environ.get("API_KEY")
    if not expected_key:
        return False
    return api_key == expected_key


def verify_jwt(token: str) -> Optional[dict]:
    """Verifies Supabase JWT token using SUPABASE_URL (JWKS for ES256) or SUPABASE_JWT_SECRET (HS256)."""
    supabase_url = os.environ.get("SUPABASE_URL")
    # 1. First attempt: Asymmetric ES256/RS256 verification using Supabase public JWKS
    if supabase_url:
        try:
            import jwt as pyjwt

            client = _get_jwks_client(supabase_url)
            if client:
                signing_key = client.get_signing_key_from_jwt(token)
                payload = pyjwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["ES256", "RS256", "HS256"],
                    audience="authenticated",
                )
                return payload
        except Exception as exc:
            logger.debug(
                "verify_jwt (JWKS): token verification failed or fallback needed: %s",
                exc,
            )

    # 2. Second attempt: Symmetric HS256 verification using SUPABASE_JWT_SECRET
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if jwt_secret:
        try:
            import jwt as pyjwt

            payload = pyjwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return payload
        except Exception:
            try:
                from jose import jwt as jose_jwt

                payload = jose_jwt.decode(token, jwt_secret, algorithms=["HS256"])
                return payload
            except Exception as exc:
                logger.warning("verify_jwt (secret): token validation failed: %s", exc)
                return None

    if not supabase_url and not jwt_secret:
        logger.warning(
            "verify_jwt: Neither SUPABASE_URL nor SUPABASE_JWT_SECRET is set; cannot verify token."
        )
    return None


async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Security(
        security_bearer
    ),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    """
    FastAPI dependency enforcing authentication on protected routes.
    Checks:
    1. If neither API_KEY, SUPABASE_JWT_SECRET, nor SUPABASE_URL is set, bypass (development mode).
    2. Validates X-API-Key header.
    3. Validates Authorization: Bearer <JWT> header.
    """
    api_key_env = os.environ.get("API_KEY")
    jwt_secret_env = os.environ.get("SUPABASE_JWT_SECRET")
    supabase_url_env = os.environ.get("SUPABASE_URL")

    # Bypass authentication only in explicit development mode
    if not api_key_env and not jwt_secret_env and not supabase_url_env:
        if os.environ.get("ENVIRONMENT", "production") == "development":
            return {"user": "anonymous_dev"}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: no authentication secrets configured. Set API_KEY, SUPABASE_JWT_SECRET, or SUPABASE_URL.",
        )

    # 1. Check API Key
    if x_api_key and verify_api_key(x_api_key):
        return {"user": "api_key_client"}

    # 2. Check Supabase JWT
    if auth_credentials and auth_credentials.credentials:
        payload = verify_jwt(auth_credentials.credentials)
        if payload:
            return payload

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais de autenticação inválidas ou ausentes. Forneça um JWT Token (Bearer) ou X-API-Key.",
        headers={"WWW-Authenticate": "Bearer"},
    )
