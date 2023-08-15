import os
import signal
import argparse
import csv
import datetime
import numpy as np
from scipy.ndimage import uniform_filter1d
from matplotlib import pyplot as plt, ticker, dates

signal.signal(signal.SIGINT, signal.SIG_DFL)  # exit on ctrl-c for testing purposes
os.environ['XDG_SESSION_TYPE'] = ''

parser = argparse.ArgumentParser()
parser.add_argument('data', type=str)
parser.add_argument('start_date', type=str, help='Start date (MM-DD-YYYY)')
parser.add_argument('end_date', type=str, help='End date (MM-DD-YYYY)')
parser.add_argument('machine_name', type=str, help='Machine name')
parser.add_argument('-t2', type=int, default=120)
parser.add_argument('-d', '--delimiter', type=str, default='\t')
args = parser.parse_args()

start_date = datetime.datetime.strptime(args.start_date, '%m-%d-%Y').date()
end_date = datetime.datetime.strptime(args.end_date, '%m-%d-%Y').date()

h, p, fr, t2 = dict(), list(), False, False
t, t_di0, t_di1, t_di1f, t_di2, t_rg1 = list(), list(), list(), list(), list(), list()
ec, ec_di0, ec_di1, ec_di2, ec_rg1 = list(), list(), list(), list(), list()
d, d2, df, d2f = list(), list(), list(), list()

f = open(args.data, 'r')
r = csv.reader(f, delimiter='\t')

header = next(r)
for i, v in enumerate(header):
    h[v] = i

for l in r:
    current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
    if start_date <= current_date <= end_date:
        t.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        p.append(l[h['phase']])
        ec.append(float(l[h['ec']]))

machine_name = args.machine_name

for i in range(1, len(t)):
    if p[i - 1] != p[i] and p[i] == 'pr-deionize':  # DI start
        t_di0.append(t[i])
        ec_di0.append(ec[i])
        t2 = True
    if (
        p[i - 1] == p[i]
        and p[i] == 'pr-deionize'
        and t2
        and (t[i] - t_di0[-1]).total_seconds() > args.t2
    ):  # DI at t2
        t_di2.append(t[i])
        ec_di2.append(ec[i])
        t2 = False
    if p[i - 1] != p[i] and p[i - 1] == 'pr-deionize':  # DI end
        t_di1.append(t[i])
        ec_di1.append(ec[i])
        d.append(ec_di0[-1] - ec_di1[-1])
        d2.append(ec_di2[-1] - ec_di1[-1])

    if p[i - 1] != p[i] and p[i - 1] == 'pr-deionize' and fr:  # DI end (after FR)
        t_di1f.append(t[i])
        df.append(ec_di0[-1] - ec_di1[-1])
        d2f.append(ec_di2[-1] - ec_di1[-1])
        fr = False

    if p[i - 1] != p[i] and p[i].startswith('pr-drain-rg'):  # RG end
        t_rg1.append(t[i])
        ec_rg1.append(ec[i])
    if p[i - 1] != p[i] and p[i - 1].startswith('fr'):  # FR end
        fr = True

#moving average smoothing

smoothed_ec_rg1 = uniform_filter1d(ec_rg1, 5)
smoothed_ec_di0 = uniform_filter1d(ec_di0, 5)
smoothed_ec_di1 = uniform_filter1d(ec_di1, 5)

if len(ec_di0) > 0 and len(ec_di1) > 0 and len(t_di1f) > 0 and len(df) > 0:
    fig = plt.figure()
    fig.set_size_inches(12, 12)
    fig.subplots_adjust(left=0.1, bottom=0.1, right=0.95, top=0.95)

    ax1 = fig.add_subplot(2, 1, 1)
    ax1.plot(t_rg1, smoothed_ec_rg1, color='red')
    ax1.plot(t_di0, smoothed_ec_di0, color='blue')
    ax1.plot(t_di1, smoothed_ec_di1, color='green')
    ax1.set_title('Envelope ({0} - {1})\nMachine: {2}'.format(args.start_date, args.end_date, machine_name))
    ax1.set_xlabel('Time')
    ax1.set_ylabel('EC (μS/cm)')
    ax1.legend(['RG end', f'DI start ({machine_name})', 'DI end'])
    ax1.set_ylim(bottom=0)
    ax1.grid(axis='y')
    ax1.yaxis.set_major_locator(ticker.MaxNLocator(20))

    n = dates.date2num(t_di1f)
    m, c = np.polyfit(n, df, 1)
    q = c + 45
    re = np.poly1d([m, q])
    re0 = -q / m

    #moving average smoothing
    smoothed_d = uniform_filter1d(d, 5)
    smoothed_df = uniform_filter1d(df, 5)

    ax2 = fig.add_subplot(2, 1, 2)
    ax2.plot(t_di1f, re(n), color='black')
    ax2.plot(t_di1, smoothed_d, color='green')
    ax2.plot(t_di1f, smoothed_df, color='blue')
    ax2.set_title('Drift ({0} - {1})'.format(args.start_date, args.end_date))
    ax2.set_xlabel('Time')
    ax2.set_ylabel('Drift (mm)')
    ax2.legend(['Regression', 'Total', 'After flush'])
    ax2.set_ylim(bottom=0)
    ax2.grid(axis='y')
    ax2.yaxis.set_major_locator(ticker.MaxNLocator(20))
    ax2.text(
        0,
        -0.15,
        'Degradation: {:.1f} μS/cm/day     Lifetime (total): {:.0f} days     Lifetime (remaining): {:.0f} days'.format(
            m, re0 - n[0], re0 - n[-1]
        ),
        transform=ax2.transAxes,
    )


    fig.autofmt_xdate()
    img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
    os.makedirs(img_dir, exist_ok=True) 

    img_path = os.path.join(img_dir, 'plot.png')

    fig.savefig(img_path)

    print('Plot image saved:', img_path)
else:
    print('No data available for the specified date range.')