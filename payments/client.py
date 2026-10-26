# payments/client.py
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class FinivexError(Exception):
    def __init__(self, message, error_code=None, http_status=None):
        super().__init__(message)
        self.error_code  = error_code
        self.http_status = http_status


class FinivexClient:
    def __init__(self, base_url=None, api_key=None, api_secret=None):
        self.base_url    = (base_url or settings.FINIVEX_BASE_URL).rstrip("/")
        self.api_key     = api_key     or settings.FINIVEX_API_KEY
        self.api_secret  = api_secret  or settings.FINIVEX_API_SECRET
        self.timeout     = 30

    # ---- low-level ---------------------------------------------------
    def _headers(self, bearer=None):
        h = {
            "Content-Type": "application/json",
            "X-API-Key":    self.api_key,
            "X-API-Secret": self.api_secret,
        }
        if bearer:
            h["Authorization"] = f"Bearer {bearer}"
        return h

    def _request(self, method, path, *, bearer=None, **kwargs):
        url = f"{self.base_url}{path}"
        # Merge: caller-supplied headers win
        headers = {**self._headers(bearer), **(kwargs.pop("headers", None) or {})}
        kwargs["headers"] = headers
        kwargs.setdefault("timeout", self.timeout)
        # print("sent request to Finivex:", method, url, kwargs)
        try:
            resp = requests.request(method, url, **kwargs)
        except requests.RequestException as exc:
            print("Finivex network error: %s", exc)
            raise FinivexError(f"Network error: {exc}") from exc

        try:
            payload = resp.json()
        except ValueError:
            payload = {}

        if resp.status_code >= 400 or not payload.get("success", False):
            raise FinivexError(
                payload.get("message") or payload.get("errorMessage") or "Gateway error",
                error_code=payload.get("errorCode"),
                http_status=resp.status_code,
            )
        return payload.get("data", payload)

    # ---- endpoints ---------------------------------------------------
    def create_widget_session(self, transaction_id, amount, currency):
        return self._request("POST", "/v1/payments/widget-session", json={
            "transactionId": transaction_id,
            "amount": float(amount),
            "currency": currency,
        })

    def direct_charge(self, *, session_token, reference, payment_method,
                      customer_phone, amount, currency,
                      description=None, callback_url=None):
        body = {
            "reference":     reference,
            "paymentMethod": payment_method,
            "customerPhone": customer_phone,
            "amount":        float(amount),
            "currency":      currency,
        }
        if description:  body["description"] = description
        if callback_url: body["callbackUrl"] = callback_url
        return self._request("POST", "/v1/charges", bearer=session_token, json=body)

    def get_charge_status(self, reference):
        return self._request("GET", f"/v1/charges/{reference}")

    def get_status(self, transaction_id):
        return self._request("GET", "/v1/payments/status",
                             params={"transactionId": transaction_id})