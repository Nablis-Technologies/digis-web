# Runtime test API configuration

Status: ready-for-agent

The workspace's current Vite serve config forces /__digis_api, while older
Playwright route mocks and request observers match localhost:3000 only. The first
full run on 2026-10-26 produced 39 passes/18 failures with those mismatches; all
11 gift tests passed because they accept both routes. A process environment API
URL override is insufficient because Vite's define entry wins.

Make affected test mocks/observers understand the proxy as well as direct API
requests. Preserve runtime provenance checks and actual HTTP assertions; do not
weaken assertions or change production/API configuration to get green tests.
The temporary node_modules/.tmp/vite-gift-e2e.config.ts used for diagnosis is an
ignored local helper, not the intended permanent solution.
