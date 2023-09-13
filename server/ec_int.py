#!/usr/bin/python3

import os, signal, argparse, csv, datetime
from matplotlib import pyplot, ticker
import numpy as np
from scipy.integrate import simps

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

h, ec_int = dict(), list()
t = list()
ec = list()


f = open(args.data, 'r')
r = csv.reader(f, delimiter=args.delimiter)
for i, v in enumerate(next(r)):
    h[v] = i

for l in r:
    current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
    if start_date <= current_date <= end_date:
        t.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        ec.append(float(l[h['ec']]))

# Calculate the integral of ec
ec_integral = np.zeros_like(ec)
for i in range(1, len(ec)):
    ec_integral[i] = simps(ec[:i], dx=(t[i] - t[i-1]).total_seconds())

fig = pyplot.figure()
fig.set_size_inches(12, 9)
fig.subplots_adjust(left=0.1, bottom=0.1, right=0.95, top=0.95)
ax1 = fig.add_subplot(1, 1, 1)

color = 'tab:orange'
ax1.set_xlabel('Time')
ax1.set_ylabel('ec', color=color)
ax1.plot(t, ec, color=color)
ax1.tick_params(axis='y', labelcolor=color)

ax2 = ax1.twinx()  # instantiate a second axes that shares the same x-axis

color = 'tab:green'
ax2.set_ylabel('ec_integral', color=color)  # we already handled the x-label with ax1
ax2.plot(t, ec_integral, color=color)
ax2.tick_params(axis='y', labelcolor=color)

fig.tight_layout()  # otherwise the right y-label is slightly clipped
fig.autofmt_xdate()

img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(img_dir, exist_ok=True) 

img_path = os.path.join(img_dir, 'plot.png')

fig.savefig(img_path)

print('Plot image saved:', img_path)
