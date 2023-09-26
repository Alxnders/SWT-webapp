#!/usr/bin/python3

import os, signal, argparse, csv, datetime
from matplotlib import pyplot as plt, ticker, dates
import numpy as np
import statistics

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

h = dict()
t, t2, ec, p, cycle = list(), list(), list(), list(), list()
ec_int, ec_2, t_int, int_tot, ec_tot, t_tot, rem = list(), list(), list(), list(), list(), list(), list()
cur, vol_di = list(), list()
cur_int = list()


f = open(args.data, 'r')
r = csv.reader(f, delimiter=args.delimiter)
for i, v in enumerate(next(r)):
    h[v] = i

for l in r:
    current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
    if start_date <= current_date < end_date:
        t.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        ec.append(float(l[h['ec']]))
        p.append(l[h['phase']])
        cycle.append(int(l[h['cycle']]))
        vol_di.append(float(l[h['vol_di']]))
        cur.append(float(l[h['cur']]))

cur_area = 0


# Parcourir les données pour créer des segments
for i in range(1, len(t)):
    if i+1 < len(t) and p[i+1] != p[i] == 'pr-deionize':
        t_int.append(t[i])
        cur_int.append(cur_area)
        cur_area = 0

    if p[i] == 'pr-deionize':
        cur_area += np.abs(cur[i] * (t[i] - t[i-1]).total_seconds())

# Créer le tracé pour 'cur' et 'cur_int' avec deux axes y
plt.figure(figsize=(12, 6))
ax3 = plt.subplot(1, 1, 1)

# Tracé de 'cur' en fonction du temps sur le premier axe y (vert)
ax3.plot(t, cur, color='green', label='cur (A)')
ax3.set_xlabel('Time (s)')
ax3.set_ylabel('cur', color='green')

# Créer un deuxième axe y partageant le même axe x que le premier axe
ax4 = ax3.twinx()

# Tracé de 'cur_int' en tant que scatter plot en fonction de 't_int' sur le deuxième axe y (bleu)
ax4.scatter(t_int, cur_int, color='blue', s=20, label='Q (C)')
ax4.set_ylabel('cur_int', color='blue')

# Fusionner les légendes des deux axes
lines3, labels3 = ax3.get_legend_handles_labels()
lines4, labels4 = ax4.get_legend_handles_labels()
ax3.legend(lines3 + lines4, labels3 + labels4, loc='upper left')

# Afficher le titre du graphique
plt.title('cur and charge over Time')

# Afficher le graphique
plt.show()

