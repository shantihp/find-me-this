import os
import httpx
import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()

RECAPTCHA_SECRET = os.getenv("RECAPTCHA_SECRET_KEY", "")
CONTACT_EMAIL    = os.getenv("CONTACT_EMAIL", "")
REGION           = os.getenv("AWS_REGION", "us-east-1")


class ContactRequest(BaseModel):
    name:          str
    email:         str
    subject:       str
    message:       str
    captcha_token: str


@router.post("/contact")
async def submit_contact(req: ContactRequest):
    # 1. Verify reCAPTCHA token with Google
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": RECAPTCHA_SECRET, "response": req.captcha_token},
            timeout=10,
        )
    if not resp.json().get("success"):
        raise HTTPException(400, "CAPTCHA verification failed — please try again")

    # 2. Send email via SES
    # NOTE: CONTACT_EMAIL (the From / To address) must be verified in AWS SES.
    # In SES sandbox mode both source and destination must be verified.
    # Request production access at: AWS Console → SES → Account dashboard.
    if not CONTACT_EMAIL:
        raise HTTPException(500, "Contact email not configured")

    body = (
        f"New contact form submission\n"
        f"{'─' * 40}\n"
        f"Name:    {req.name}\n"
        f"Email:   {req.email}\n"
        f"Subject: {req.subject}\n"
        f"{'─' * 40}\n\n"
        f"{req.message}"
    )

    try:
        boto3.client("ses", region_name=REGION).send_email(
            Source=f"FindThisForMe <{CONTACT_EMAIL}>",
            Destination={"ToAddresses": [CONTACT_EMAIL]},
            Message={
                "Subject": {"Data": f"[FindThisForMe] {req.subject}"},
                "Body":    {"Text": {"Data": body}},
            },
            ReplyToAddresses=[req.email],
        )
    except Exception as exc:
        raise HTTPException(500, f"Failed to send message: {exc}")

    return {"ok": True}
