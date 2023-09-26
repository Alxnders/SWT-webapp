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

change_points_phase = []  # Liste pour les points de changement de phase
change_points_cycle = []  # Liste pour les points de changement de cycle

for l in r:
    current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
    if start_date <= current_date < end_date:
        t.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        ec.append(float(l[h['ec']]))
        p.append(l[h['phase']])
        cycle.append(int(l[h['cycle']]))
        vol_di.append(float(l[h['vol_di']]))
        cur.append(float(l[h['cur']]))

ec_area = 0
cur_area = 0

vol_d=[]
vol=[]

# Créer le tracé
plt.figure(figsize=(12, 9))
plt.subplots_adjust(left=0.1, bottom=0.1, right=0.95, top=0.95)
ax1 = plt.subplot(1, 1, 1)

# Tracé principal avec l'axe x pour t
ax1.plot(t, ec, color='orange', label='ec (µS/cm)')
ax1.set_xlabel('Time (s)')
ax1.set_ylabel('ec', color='orange')

# Initialisation des listes pour les segments
segment_t = []  # Liste pour stocker les horodatages des segments
segment_ec = []  # Liste pour stocker les valeurs de ec des segments

# Parcourir les données pour créer des segments
for i in range(1, len(t)):
    if p[i-1] != p[i] == 'pr-deionize' :
        ec_tot.append(ec[i])
        t_tot.append(t[i])
        vol_d.append(vol_di[i])

    if i+1 < len(t) and p[i+1] != p[i] == 'pr-deionize':
        t_int.append(t[i])
        ec_int.append(ec_area)
        cur_int.append(cur_area)
        ec_area = 0
        cur_area = 0
        vol.append(statistics.mean(vol_d))
        vol_d=[]
    if p[i] == 'pr-deionize':
        # Si nous sommes dans une phase "pr-deionize," ajoutez les données au segment actuel
        segment_t.append(t[i])
        segment_ec.append(ec[i])
        ec_area += (ec[i]) * (t[i] - t[i-1]).total_seconds()
        cur_area += np.abs(cur[i]) * (t[i] - t[i-1]).total_seconds()
    else:
        # Si nous ne sommes pas dans une phase "pr-deionize," tracez le segment actuel s'il y a des données
        if segment_t:
            ax1.plot(segment_t, segment_ec, color='green')  
            segment_t = []  # Réinitialisez la liste pour le prochain segment
            segment_ec = []

for i in range(0,len(t_tot)):
    int_tot.append(ec_tot[i]*(t_int[i]-t_tot[i]).total_seconds())

for i in range (0, len(ec_int)):
    rem.append(int_tot[i] - ec_int[i])

# Créez un deuxième axe y partageant le même axe x que pour le premier axe
ax2 = ax1.twinx()

# Tracer ec_int en fonction de t_int sur le deuxième axe y sous forme de points
ax2.scatter(t_int, ec_int, color='blue', s=20, label='salts')  # Ajoutez le label
ax2.scatter(t_int,int_tot, color='purple', s=20, label='total salts')
ax2.scatter(t_int,rem, color='red', s=20, label='removed salts')

ax2.set_ylabel('ec_int', color='blue')

# Ajouter une seule entrée "ec_2" dans la légende (pour l'axe y de gauche)
ax1.plot([], [], color='green', label='ec_2', alpha=0.7)  # Ajoutez une ligne vide pour "ec_2" dans la légende

# Fusionnez les légendes des deux axes
lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

ax1.grid(axis='y')
ax1.yaxis.set_major_locator(ticker.MaxNLocator(20))

plt.title("Avg. removed salts (mg/L) : " + str(statistics.mean(rem)/1000)+ "g/L")

# Afficher le tracé
plt.show()
