# 0002 — Backend is frozen; the frontend adapts

The frontend developer does not change the `digis_backend` schema or API. Anything the backend does not support is mocked/deferred/disabled in the frontend and flagged to the backend dev. This keeps the frontend's contract stable and unblocks parallel work. Consequence: fields the backend does not serialize (venue name/city, organizer name, product prices, user ticket list) stay mocked until the backend dev adds them.
