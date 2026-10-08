#!/usr/bin/env python3
"""Open FOLGA locally; only reuse a server serving this specific project."""
import json
from pathlib import Path
import subprocess
import sys
import time
from urllib.request import urlopen
import webbrowser

ROOT = Path(__file__).resolve().parent

def is_game(url):
    try:
        with urlopen(url + '/project.json', timeout=0.4) as response:
            return json.load(response).get('id') == 'folga-calendar-game-v1'
    except Exception:
        return False

def main():
    for port in range(8781, 8791):
        url = f'http://127.0.0.1:{port}'
        if is_game(url):
            webbrowser.open(url)
            print(f'FOLGA aberto em {url}')
            return
        (ROOT / 'output').mkdir(exist_ok=True)
        with (ROOT / 'output' / 'server.log').open('ab') as log:
            proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(ROOT)],
                stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
        for _ in range(20):
            if proc.poll() is not None:
                break
            if is_game(url):
                webbrowser.open(url)
                print(f'FOLGA aberto em {url}')
                return
            time.sleep(0.1)
    print('Abra index.html diretamente no navegador para jogar sem servidor.', file=sys.stderr)
    sys.exit(1)

if __name__ == '__main__':
    main()
