#!/usr/bin/python3

import os, signal, argparse, csv, datetime
from matplotlib import pyplot as plt, ticker, dates
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

h = dict()
t, ec, p, cycle = list(), list(), list(), list()
ec_int, ec_tint, t_int= list(), list(), list()

f = open(args.data, 'r')
r = csv.reader(f, delimiter=args.delimiter)
for i, v in enumerate(next(r)):
    h[v] = i

change_points_phase = []  # Liste pour les points de changement de phase
change_points_cycle = []  # Liste pour les points de changement de cycle

for l in r:
    current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
    if start_date <= current_date < end_date:
        t.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        ec.append(float(l[h['ec']]))
        phase = l[h['phase']]
        p.append(phase)
        cycle.append(int(l[h['cycle']]))

area = 0
t_area = 0

r_h = []
r_h2=[]

for i in range(1, len(t)):
    if p[i] == 'id-halt' or p[i] == 'id-ready':
        if not p[i-1] == p[i]:
            r_h.append(t[i])
        if i+1 < len(t) and not p[i] == p[i+1]:
            r_h2.append(t[i])
        pass
    else :
        if p[i-1] != p[i]:
            # Nouvelle phase, ajouter le point à la liste de changement de phases et le tracer sur le graphe
            change_points_phase.append((t[i], ec[i]))

        if p[i-1] != p[i] and p[i] == 'pr-fill-rg-di': # DI
            # Nouveau cycle, ajouter le point à la liste de changement de cycles et le tracer sur le graphe
            change_points_cycle.append((t[i], ec[i]))
            t_int.append(t[i])
            ec_int.append(area)
            area=0
        else:
            area += (ec[i]) * (t[i] - t[i-1]).total_seconds()
            t_area += t_area

# Créer le tracé
plt.figure(figsize=(12, 9))
plt.subplots_adjust(left=0.1, bottom=0.1, right=0.95, top=0.95)
ax1 = plt.subplot(1, 1, 1)
ax2 = ax1.twinx()  # Deuxième axe y partageant le même axe x

# Tracé principal avec l'axe x pour t
ax1.plot(t, ec, color='orange', label='ec')
ax1.scatter(*zip(*change_points_phase), c='red', marker='o', label='Phase change')
ax1.scatter(*zip(*change_points_cycle), c='blue', marker='x', label='New Cycle')
ax1.set_xlabel('Time')
ax1.set_ylabel('ec', color='orange')
ax1.legend(loc='upper left')
ax1.set_ylim(bottom=0)
ax1.grid(axis='y')
ax1.yaxis.set_major_locator(ticker.MaxNLocator(20))

for point in r_h:
    ax1.axvline(x=point, color='purple', linestyle='--', linewidth=1)
    ax1.annotate('ready/halt begin', xy=(point, 0), xytext=(5, 5), textcoords='offset points', rotation=90, color='purple')

for point in r_h2:
    ax1.axvline(x=point, color='purple', linestyle='-', linewidth=1)
    ax1.annotate('ready/halt end', xy=(point, 0), xytext=(5, 5), textcoords='offset points', rotation=90, color='purple')

# Créer un axe y supplémentaire pour ec_int
ax2.plot(t_int, ec_int, color='green', label='ec_int')
ax2.set_ylabel('ec_int', color='black')
ax2.legend(loc='upper right')
ax2.set_ylim(bottom=0)

plt.title('ec and ec_int')

# Enregistrer l'image
img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(img_dir, exist_ok=True)
img_path = os.path.join(img_dir, 'plot.png')
plt.savefig(img_path)
plt.show()

print('Plot image saved:', img_path)
