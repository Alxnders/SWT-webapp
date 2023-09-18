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

h, ec_int, ec_intf, fr = dict(), list(), list(), False
t, t_int, t_intf = list(), list(), list()
ec, p = list(), list()

f = open(args.data, 'r')
r = csv.reader(f, delimiter=args.delimiter)
for i, v in enumerate(next(r)):
    h[v] = i

for l in r:
    current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
    if start_date <= current_date <= end_date:
        t.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        p.append(l[h['phase']])
        ec.append(float(l[h['ec']]))

ec_int = []  # Initialisez une liste pour stocker les valeurs de ec_int
area=0

for i in range(1, len(t)):
	if p[i-1] == p[i] and p[i] == 'pr-deionize': # DI
		area += (ec[i]) * (t[i] - t[i-1]).total_seconds()
	if p[i-1] != p[i] and p[i-1] == 'pr-deionize' and fr: # DI end (after FR)
		t_intf.append(t[i])
		ec_intf.append(area)
		fr = False
	if p[i-1] != p[i] and p[i-1] == 'pr-deionize': # DI end
		t_int.append(t[i])
		ec_int.append(area)
		area = 0
	if p[i-1] != p[i] and p[i-1].startswith('fr'): # FR end
		fr = True

fig = pyplot.figure()
fig.set_size_inches(12, 9)
fig.subplots_adjust(left=0.1, bottom=0.1, right=0.95, top=0.95)
ax1 = fig.add_subplot(1, 1, 1)
ax2 = ax1.twinx()  # Deuxième axe y partageant le même axe x

ax1.plot(t, ec, color='orange', label='ec')
ax2.plot(t_int, ec_int, color='green', label='ec_int')
ax2.plot(t_intf,ec_intf,color='blue',label='ec_int after flush')

ax1.set_xlabel('Time')
ax1.set_ylabel('ec', color='orange')
ax2.set_ylabel('ec_int', color='green')
ax1.legend(loc='upper left')
ax2.legend(loc='upper right')
ax1.set_ylim(bottom=0)
ax2.set_ylim(bottom=0)
ax1.grid(axis='y')
ax1.yaxis.set_major_locator(ticker.MaxNLocator(20))

fig.autofmt_xdate()
img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(img_dir, exist_ok=True) 

img_path = os.path.join(img_dir, 'plot.png')

fig.savefig(img_path)

print('Plot image saved:', img_path)
