import logging
import os
from typing import Optional
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

security_bearer = HTTPBearer(auto_error=False)


def verify_api_key(api_key: Optional[str]) -> bool:
    """Verifies X-API-Key header against API_KEY environment variable."""
    expected_key = os.environ.get("API_KEY")
    if not expected_key:
        return False
    return api_key == expected_key


def verify_jwt(token: str) -> Optional[dict]:
    """Verifies Supabase JWT token using SUPABASE_JWT_SECRET environment variable."""
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        logger.warning("verify_jwt: SUPABASE_JWT_SECRET is not set; cannot verify token.")
        return None
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return payload
    except ImportError:
        # python-jose not available; fall through to PyJWT
        logger.debug("python-jose not installed; trying PyJWT.")
    except Exception as exc:
        logger.warning("verify_jwt (jose): token validation failed: %s", exc)
        return None
    try:
        import jwt as pyjwt
        from jwt import PyJWTError
        payload = pyjwt.decode(token, jwt_secret, algorithms=["HS256"])
        return payload
    except Exception as exc:
        logger.warning("verify_jwt (PyJWT): token validation failed: %s", exc)
        return None


async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    """
    FastAPI dependency enforcing authentication on protected routes.
    Checks:
    1. If neither API_KEY nor SUPABASE_JWT_SECRET is set, bypass (development mode).
    2. Validates X-API-Key header.
    3. Validates Authorization: Bearer <JWT> header.
    """
    api_key_env = os.environ.get("API_KEY")
    jwt_secret_env = os.environ.get("SUPABASE_JWT_SECRET")

    # Bypass authentication only in explicit development mode
    if not api_key_env and not jwt_secret_env:
        if os.environ.get("ENVIRONMENT", "production") == "development":
            return {"user": "anonymous_dev"}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: no authentication secrets configured. Set API_KEY or SUPABASE_JWT_SECRET.",
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
