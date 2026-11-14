"""Vantage iMessage agent on Photon 2.0 (Beta). Owner: A.
Polls new iMessages on the project's line and replies with the same grounded answers as
/api/photon/chat. Run from backend/:  python photon_bot.py
Needs PHOTON_API_KEY (project:read + project:write) and PHOTON_PROJECT_ID (pho_prj_...) in .env.
"""
import sys
import time
from datetime import datetime, timedelta, timezone

from photon_api import ApiError, Photon
from photon_api.generated.models import SendMessageRequest, SendTextContent, TextContent, UserSnapshot
from photon_api.rpc_generated import ListMessagesInput, SendMessageHeader, SendMessageInput, SendMessagePath

from config import PHOTON_API_KEY, PHOTON_PROJECT_ID
import os
import httpx

API = os.getenv("VANTAGE_API_URL", "http://localhost:8000/api")

POLL_SECONDS = 3


def _iso(dt: datetime) -> str:
    return dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _as_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _incoming(item):
    """Returns (message, sender, agent, space) for a plain-text human DM to our agent, else None."""
    m = item.root.root
    if m.platform != "imessage" or m.status != "received":
        return None
    if not isinstance(m.receivedBy, UserSnapshot):
        return None
    sender, agent, space = m.sentBy.root, m.receivedBy.root, m.space.root
    if sender.kind != "human" or agent.kind != "agent" or sender.id == agent.id:
        return None
    if space.kind != "direct" or not isinstance(m.content, TextContent):
        return None
    return m, sender, agent, space


def main():
    if not PHOTON_API_KEY or not PHOTON_PROJECT_ID:
        sys.exit("Set PHOTON_API_KEY and PHOTON_PROJECT_ID in the .env file.")

    started = datetime.now(timezone.utc)
    since = started - timedelta(seconds=5)
    seen = set()

    with Photon(headers={"Authorization": f"Bearer {PHOTON_API_KEY}"}) as photon:
        print("Vantage iMessage agent ready. Text your Photon number.")
        while True:
            try:
                query = {"createdSince": _iso(since), "direction": "received", "order": "asc",
                         "pageSize": 100, "platform": "imessage"}
                while True:
                    page = photon.projects.list_messages(ListMessagesInput.model_validate(
                        {"path": {"id": PHOTON_PROJECT_ID}, "query": query}))
                    for item in page.items:
                        found = _incoming(item)
                        if not found:
                            continue
                        m, sender, agent, space = found
                        if m.id in seen:
                            continue
                        seen.add(m.id)
                        created = _as_datetime(m.createdAt)
                        if created < started:
                            continue

                        text = m.content.text
                        who = getattr(sender, "handle", None) or sender.id
                        print(f"[in]  {who}: {text}")
                        try:
                            r = httpx.post(f"{API}/photon/chat", json={"sender_id": who, "text": text}, timeout=90)
                            reply = r.json().get("reply") or "Sorry, something went wrong on my side."
                        except Exception as e:
                            print(f"[bot] backend unreachable: {str(e)[:120]}")
                            reply = "Sorry, I could not reach the documentary right now. Try again in a minute."

                        photon.projects.send_message(SendMessageInput(
                            path=SendMessagePath(id=PHOTON_PROJECT_ID),
                            headers=SendMessageHeader.model_validate(
                                {"idempotency-key": f"vantage-reply:{m.id}"}),
                            body=SendMessageRequest(
                                spaceId=space.id,
                                senderId=agent.id,
                                content=SendTextContent(type="text", format="plain", text=reply),
                            ),
                        ))
                        print(f"[out] {reply[:120]}")
                        since = max(since, created - timedelta(seconds=5))
                    token = page.nextPageToken
                    if not isinstance(token, str):
                        break
                    query["pageToken"] = token
            except ApiError as e:
                print(f"[photon] API error {e.status} (request {getattr(e, 'request_id', None)})")
                if e.status in (401, 403):
                    sys.exit("Check PHOTON_API_KEY permissions (project:read, project:write) and PHOTON_PROJECT_ID.")
                if e.status == 429:
                    time.sleep(15)
            except KeyboardInterrupt:
                print("Stopping.")
                return
            except Exception as e:
                print(f"[photon] error: {str(e)[:200]}")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
