# 0003 — No user-tickets list; My Tickets stays mock/deferred

There is no `GET /tickets` (or equivalent) endpoint on the backend. The My Tickets screen and `ticketsService` keep their in-memory mock and are NOT wired to any API until the backend dev adds a ticket-list endpoint. A future architecture review should not re-suggest wiring them.
