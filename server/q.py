#!/usr/bin/python3

import os, signal, argparse, csv, datetime
from matplotlib import pyplot, ticker, dates
import numpy as np


signal.signal(signal.SIGINT, signal.SIG_DFL) # exit on ctrl-c
os.environ['XDG_SESSION_TYPE'] = '' # use X11 window system

parser = argparse.ArgumentParser()
parser.add_argument('data', type=str)
parser.add_argument('start_date', type=str, help='Start date (MM-DD-YYYY)')
parser.add_argument('end_date', type=str, help='End date (MM-DD-YYYY)')
parser.add_argument('-d', '--delimiter', type=str, default='\t')
args = parser.parse_args()

start_date = datetime.datetime.strptime(args.start_date, '%m-%d-%Y').date()
end_date = datetime.datetime.strptime(args.end_date, '%m-%d-%Y').date()

h, p, rp, q, fr = dict(), list(), list(), 0, False
t, t_di1, t_di1f = list(), list(), list()
c, q_di1, q_di1f  = list(), list(), list()

f = open(args.data, 'r')
r = csv.reader(f, delimiter=args.delimiter)
for i, v in enumerate(next(r)):
	h[v] = i

for l in r:
	current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
	if start_date <= current_date <= end_date:
		t.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
		p.append(l[h['phase']])
		rp.append(int(l[h['rp']]))
		c.append(float(l[h['cur']]))

for i in range(1, len(t)):
	if p[i-1] == p[i] and p[i] == 'pr-deionize': # DI
		q += (rp[i]*2-1) * c[i] * (t[i]-t[i-1]).total_seconds()
	if p[i-1] != p[i] and p[i-1] == 'pr-deionize' and fr: # DI end (after FR)
		t_di1f.append(t[i])
		q_di1f.append(q)
		fr = False
	if p[i-1] != p[i] and p[i-1] == 'pr-deionize': # DI end
		t_di1.append(t[i])
		q_di1.append(q)
		q = 0
	if p[i-1] != p[i] and p[i-1].startswith('fr'): # FR end
		fr = True

fig = pyplot.figure()
fig.set_size_inches(12, 9)
fig.subplots_adjust(left=0.1, bottom=0.1, right=0.95, top=0.95)
ax = fig.add_subplot(1, 1, 1)

ax.plot(t_di1, q_di1, color='orange')
ax.plot(t_di1f, q_di1f, color='red')

ax.set_title('Electric Charge')
ax.set_xlabel('Time')
ax.set_ylabel('Charge (C)')
ax.legend(['All', 'After flush'])
ax.set_ylim(bottom=0)
ax.grid(axis='y')
ax.yaxis.set_major_locator(ticker.MaxNLocator(20))

fig.autofmt_xdate()
img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(img_dir, exist_ok=True) 

img_path = os.path.join(img_dir, 'plot.png')

fig.savefig(img_path)

print('Plot image saved:', img_path)
