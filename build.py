"""Bundle the dashboard into one HTML file for publishing as a Claude artifact.

Usage: python3 build.py [output path]   (default: dist/trainer-desk.html)
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


html = read("index.html")
head = html[html.index("<head>") + 6 : html.index("</head>")]
body = html[html.index("<body>") + 6 : html.rindex("</body>")]

# The artifact adds its own doctype, charset and viewport, so keep only title and styles.
head = re.sub(r"\s*<meta[^>]*>", "", head)
head = re.sub(
    r'<link rel="stylesheet" href="(?!https?:)([^"]+)" />',
    lambda m: "<style>\n" + read(m.group(1)) + "</style>",
    head,
)
body = re.sub(
    r'<script src="([^"]+)"></script>',
    lambda m: "<script>\n" + read(m.group(1)).replace("</script", "<\\/script") + "</script>",
    body,
)

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "trainer-desk.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    f.write(head.strip() + "\n" + body.strip() + "\n")
print(out)
