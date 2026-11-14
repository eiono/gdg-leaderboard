import csv, io, json, os, re, urllib.request

UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', re.I)
MAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
SUSPENDED = {'b18c1c53-3705-4085-a0aa-466186f9e4a4', 'd6ed0ea5-a4df-4df1-86ea-2832bafaaf48'}
ATUL = '32bf658b-70a9-4ccc-ac93-57f0906e19f3'
RAI = 'cd84fe06-c58f-44d4-a7c1-8e5b18004bdc'

def uid(url):
    m = UUID.search(url or '')
    return m.group(0).lower() if m else ''

def emails(env):
    raw = urllib.request.urlopen(os.environ[env]).read().decode('utf-8-sig')
    out = {}
    for row in csv.reader(io.StringIO(raw)):
        line = ' '.join(row)
        u, m = UUID.search(line), MAIL.search(line)
        if u and m:
            out[u.group(0).lower()] = m.group(0)
    return out

def load(path):
    d = json.load(open(path, encoding='utf-8'))['students']
    return sorted(d, key=lambda s: s['rank'])

mail = {**emails('DEV_SHEET_CSV_URL'), **emails('SHEET_CSV_URL')}

students = [s for s in load('web/public/data/leaderboard.json')
            if uid(s['profile_url']) not in SUSPENDED]
ri = next((i for i, s in enumerate(students) if uid(s['profile_url']) == RAI), None)
if ri is not None:
    rai = students.pop(ri)
    ai = next((i for i, s in enumerate(students) if uid(s['profile_url']) == ATUL), None)
    students.insert(ai + 1 if ai is not None else ri, rai)
students = students[:246]
faculty = load('web/public/data/developers.json')[:4]

rows = []
for track, lst in ((0, students), (1, faculty)):
    for pos, s in enumerate(lst, 1):
        done = (s.get('locked') or {}).get('completed_on') or \
               max((m['earned_on'] for m in s.get('matched', [])), default='9999-12-31')
        rows.append((done, track, pos, s['name'], mail.get(uid(s['profile_url']), ''),
                     s['profile_url']))

rows.sort(key=lambda r: (r[0], r[1], r[2]))

out = '../final_250.csv'
with open(out, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    w.writerow(['No', 'Name', 'Email', 'Completion Date', 'Skill Profile', 'List', 'List Position'])
    for i, (done, t, pos, name, em, url) in enumerate(rows, 1):
        w.writerow([i, name, em, done, url, 'Faculty' if t else 'Student', pos])

print('rows:', len(rows), '| missing email:', sum(1 for r in rows if not r[4]))
print('saved:', out)