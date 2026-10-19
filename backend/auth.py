"""JWT + password hashing utilities."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

import db
import requests
from jose import jwk
from jose.utils import base64url_decode
from functools import lru_cache

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(p: str) -> str:
    return _pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    try:
        return _pwd.verify(p, h)
    except Exception:
        return False


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _refresh_secret() -> str:
    return os.environ.get("JWT_REFRESH_SECRET", os.environ["JWT_SECRET"] + "_r")


def create_access_token(user_id: str, role: str) -> str:
    minutes = int(os.environ.get("ACCESS_TOKEN_TTL_MINUTES", "120"))
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": exp, "type": "access"},
        _secret(),
        algorithm="HS256",
    )


def create_refresh_token(user_id: str, role: str) -> str:
    days = int(os.environ.get("REFRESH_TOKEN_TTL_DAYS", "14"))
    exp = datetime.now(timezone.utc) + timedelta(days=days)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": exp, "type": "refresh"},
        _refresh_secret(),
        algorithm="HS256",
    )


def decode_refresh(token: str) -> dict:
    return jwt.decode(token, _refresh_secret(), algorithms=["HS256"])


async def _user_from_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    # First try internal HS256 signed tokens
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        uid = payload.get("sub")
        if not uid:
            return None
        user = await db.users().find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        return user
    except JWTError:
        pass

    # Next, try Cognito (RS256) tokens if Cognito env is configured
    COGNITO_REGION = os.environ.get("COGNITO_REGION")
    COGNITO_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
    if not COGNITO_REGION or not COGNITO_POOL_ID:
        return None
    issuer = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}"

    try:
        # verify signature using JWKs
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        jwks_url = f"{issuer}/.well-known/jwks.json"
        jwks = _get_jwks(jwks_url)
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            return None
        public_key = jwk.construct(key)
        message, encoded_sig = token.rsplit('.', 1)
        decoded_sig = base64url_decode(encoded_sig.encode('utf-8'))
        if not public_key.verify(message.encode('utf-8'), decoded_sig):
            return None
        # decode claims without verifying signature (we already did)
        claims = jwt.get_unverified_claims(token)
        # basic claim checks
        if claims.get('iss') != issuer:
            return None
        if claims.get('exp') and int(claims.get('exp')) < int(__import__('time').time()):
            return None

        # Map Cognito subject to DB user (by email)
        email = claims.get("email")
        sub = claims.get("sub")
        groups = claims.get("cognito:groups") or []
        if not email:
            # try to fetch email_verified subject
            return None
        user = await db.users().find_one({"email": email}, {"_id": 0, "password_hash": 0})
        from models import new_id, now_iso

        role = "buyer"
        if isinstance(groups, list):
            if "admin" in groups:
                role = "admin"
            elif "seller" in groups:
                role = "seller"
        # Upsert user if missing
        if not user:
            user_doc = {
                "id": new_id(),
                "name": claims.get("name") or email.split("@")[0],
                "email": email,
                "phone": claims.get("phone_number") or "",
                "role": role,
                "is_active": True,
                "is_verified": True,
                "is_phone_verified": bool(claims.get("phone_number")),
                "saved_properties": [],
                "cognito_sub": sub,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.users().insert_one(user_doc)
            user = await db.users().find_one({"email": email}, {"_id": 0, "password_hash": 0})
        else:
            # ensure role and cognito_sub are set
            upd = {}
            if user.get("role") != role:
                upd["role"] = role
            if not user.get("cognito_sub"):
                upd["cognito_sub"] = sub
            if upd:
                upd["updated_at"] = now_iso()
                await db.users().update_one({"email": email}, {"$set": upd})
                user = await db.users().find_one({"email": email}, {"_id": 0, "password_hash": 0})
        return user
    except Exception:
        return None


@lru_cache()
def _get_jwks(jwks_url: str) -> dict:
    try:
        r = requests.get(jwks_url, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception:
        return {}


def _verify_cognito_id_token(token: str) -> dict | None:
    """Verify Cognito ID token and return claims or None."""
    COGNITO_REGION = os.environ.get("COGNITO_REGION")
    COGNITO_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
    if not COGNITO_REGION or not COGNITO_POOL_ID:
        return None
    issuer = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}"
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        jwks_url = f"{issuer}/.well-known/jwks.json"
        jwks = _get_jwks(jwks_url)
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            return None
        public_key = jwk.construct(key)
        message, encoded_sig = token.rsplit('.', 1)
        decoded_sig = base64url_decode(encoded_sig.encode('utf-8'))
        if not public_key.verify(message.encode('utf-8'), decoded_sig):
            return None
        claims = jwt.get_unverified_claims(token)
        if claims.get('iss') != issuer:
            return None
        if claims.get('exp') and int(claims.get('exp')) < int(__import__('time').time()):
            return None
        return claims
    except Exception:
        return None


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    user = await _user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    return user


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[dict]:
    return await _user_from_token(token)


def require_roles(*roles: str):
    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _checker
