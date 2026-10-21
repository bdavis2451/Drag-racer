"""Bundles the game into one self-contained HTML file (CSS, JS and fonts inlined).
Usage: python3 tools/bundle_web.py OUTPUT.html [--fragment]
--fragment leaves out the <!doctype>/<html>/<head>/<body> wrapper."""
import base64, re, sys, os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'www')
out = sys.argv[1]
fragment = '--fragment' in sys.argv

html = open(os.path.join(ROOT, 'index.html')).read()
css = open(os.path.join(ROOT, 'css', 'style.css')).read()

def font_uri(m):
    data = open(os.path.join(ROOT, 'css', m.group(1)), 'rb').read()
    return "url('data:font/woff2;base64," + base64.b64encode(data).decode() + "')"
css = re.sub(r"url\('(\.\./fonts/[^']+)'\)", font_uri, css)
css = ':root { color-scheme: dark; }\n' + css

scripts = re.findall(r'<script src="([^"]+)"></script>', html)
js = '\n'.join(open(os.path.join(ROOT, s)).read() for s in scripts)
body = re.search(r'<body>(.*?)<script', html, re.S).group(1).strip()

if fragment:
    page = '<title>Pixel Drag</title>\n<style>\n' + css + '\n</style>\n' + body + '\n<script>\n' + js + '\n</script>\n'
else:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    head = re.sub(r'\s*<link rel="(stylesheet|manifest|icon)"[^>]*>', '', head)
    page = '<!doctype html>\n<html lang="en">\n<head>' + head + '<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body + '\n<script>\n' + js + '\n</script>\n</body>\n</html>\n'
open(out, 'w').write(page)
print('wrote', out, len(page) // 1024, 'KB')
