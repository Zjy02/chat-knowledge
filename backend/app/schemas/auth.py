"""Authentication request/response schemas.

Password strength is validated at the boundary so route handlers can assume a
valid password format. bcrypt has a 72-byte input limit, enforced here too.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

PASSWORD_MIN = 8
PASSWORD_MAX = 72


def validate_password_strength(value: str) -> str:
    if len(value) < PASSWORD_MIN or len(value) > PASSWORD_MAX:
        raise ValueError(f"密码长度需在 {PASSWORD_MIN}-{PASSWORD_MAX} 位之间")
    if not any(ch.isalpha() for ch in value) or not any(ch.isdigit() for ch in value):
        raise ValueError("密码需同时包含字母和数字")
    return value


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = Field(min_length=1, max_length=50)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("昵称不能为空")
        return value

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
