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
        ec_area += (ec[i]) * (t[i] - t[i-1]).total_seconds()
        cur_area += np.abs(cur[i] * (t[i] - t[i-1]).total_seconds())

for i in range(0,len(t_tot)):
    int_tot.append(ec_tot[i]*(t_int[i]-t_tot[i]).total_seconds())

for i in range (0, len(ec_int)):
    rem.append((int_tot[i] - ec_int[i]))

Fc = 96485 #(C/mol)

Q_salt=[]
x=0.8*(10**-5)

for i in range(0,len(rem)) :
    Q_salt.append(vol[i]*(rem[i]/1000)*Fc*x) #vol in L ; rem in mg/L converted to g/L ; Fc in C/mol ; x suppos. mol/g >>> 10^-5 problem

eff=[]
for i in range(0,len(Q_salt)) :
    eff.append(Q_salt[i]/cur_int[i])

# Charge cur_int
plt.figure(figsize=(12, 6))
ax5 = plt.subplot(1, 1, 1)

# Tracé de 'cur_int' en tant que scatter plot en fonction de 't_int' sur le deuxième axe y (bleu)
ax5.scatter(t_int, cur_int, color='blue', s=20, label='Q (C)')
ax5.set_ylabel('Charge', color='blue')

ax5.scatter(t_int, Q_salt, color='orange', label='Q salt (C)')
ax5.set_ylabel('Salt removal charge', color='orange')

lines5, labels5 = ax5.get_legend_handles_labels()
ax5.legend(lines5,labels5, loc='upper left')

ax6 = ax5.twinx()
ax6.plot(t_int,eff,color='black', label='η efficiency')
ax6.set_ylabel('η efficiency', color='black')

# Afficher le titre du graphique
plt.title('Charge over Time')

# Afficher le graphique
plt.show()

print("Avg Q_salt per cycle : "+ str(float(statistics.mean(Q_salt))))
print("Avg Q per cycle : "+ str(float(statistics.mean(cur_int))))

print("Avg efficiency per cycle : " + str(float(statistics.mean(Q_salt))/float(statistics.mean(cur_int))))
