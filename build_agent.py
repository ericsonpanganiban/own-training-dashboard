"""Build the standalone agent page: login by work email, then the agent's own scorecard.

The page holds only locked records (see agentview/crypto.js), so it can be published without a Claude seat.

Usage: python3 build_agent.py BUNDLE.json [output path]
  BUNDLE.json is the document agent_bundle/current from the dashboard's database ({v, generated_at, count, records}).
  Default output: dist/agent-scorecard.html
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


if len(sys.argv) < 2:
    sys.exit(__doc__)
with open(sys.argv[1], encoding="utf-8") as f:
    bundle = json.load(f)
# Only what the page needs: no names, no emails, only the locked records.
bundle = {"v": bundle.get("v", 1), "generated_at": bundle.get("generated_at", ""), "records": bundle.get("records", [])}
payload = json.dumps(bundle, separators=(",", ":")).replace("</", "<\\/")

page = read("agentview/page.html")
page = page.replace("/*__SCORECARD_CSS__*/", read("agentview/scorecard.css"))
page = page.replace("/*__RENDER_JS__*/", read("agentview/render.js").replace("</script", "<\\/script"))
page = page.replace("/*__CRYPTO_JS__*/", read("agentview/crypto.js").replace("</script", "<\\/script"))
page = page.replace("/*__BUNDLE__*/", payload)

out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "dist", "agent-scorecard.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    f.write(page)
print(out, len(page) // 1024, "KB,", len(bundle["records"]), "records")
