"""Build index.html from src.html: python3 build.py sample.ai pdfium.wasm"""
import base64, gzip, sys
sample, wasm = sys.argv[1], sys.argv[2]
s = open('src.html').read()
s = s.replace('__SAMPLE_B64__', base64.b64encode(open(sample, 'rb').read()).decode())
s = s.replace('__PDFIUM_GZ_B64__', base64.b64encode(gzip.compress(open(wasm, 'rb').read(), 9)).decode())
open('index.html', 'w').write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body style="margin:0">\n' + s + '\n</body>\n</html>\n')
