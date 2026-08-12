import os
import time
import jwt
from fastapi import Header, HTTPException

JWT_SECRET = os.environ.get("JWT_SECRET", "ghostchain-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 8 * 60 * 60  # 8 hours


def create_token(role: str) -> str:
    now = int(time.time())
    payload = {"role": role, "iat": now, "exp": now + TOKEN_TTL_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid token")


def get_bearer_token(authorization) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    return authorization.split(" ", 1)[1]


def get_current_role(authorization: str = Header(default=None)) -> str:
    token = get_bearer_token(authorization)
    payload = decode_token(token)
    return payload.get("role")


def require_role(expected_role: str):
    def dependency(authorization: str = Header(default=None)):
        token = get_bearer_token(authorization)
        payload = decode_token(token)
        if payload.get("role") != expected_role:
            raise HTTPException(status_code=403, detail=f"requires role={expected_role}")
        return payload
    return dependency
