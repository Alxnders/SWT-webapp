import os
import signal
import argparse
import csv
import datetime
import numpy as np
from matplotlib import pyplot as plt, ticker, dates

signal.signal(signal.SIGINT, signal.SIG_DFL)  # exit on ctrl-c testing purposes
os.environ['XDG_SESSION_TYPE'] = '' 

parser = argparse.ArgumentParser()
parser.add_argument('data', type=str)
parser.add_argument('start_date', type=str, help='Start date (MM-DD-YYYY)')
parser.add_argument('end_date', type=str, help='End date (MM-DD-YYYY)')
parser.add_argument('machine_name', type=str, help='Machine name')
parser.add_argument('xaxis', type=str, help='X-axis parameter name')
parser.add_argument('yaxis', type=str, help='Y-axis parameter name')
parser.add_argument('-t2', type=int, default=120)
parser.add_argument('-d', '--delimiter', type=str, default='\t')
parser.add_argument('--yaxis2', type=str, help='Second Y-axis parameter name', default=None)
args = parser.parse_args()

start_date = datetime.datetime.strptime(args.start_date, '%m-%d-%Y').date()
end_date = datetime.datetime.strptime(args.end_date, '%m-%d-%Y').date()

h, p, fr, t2 = dict(), list(), False, False
x, y = list(), list()

f = open(args.data, 'r')
r = csv.reader(f, delimiter='\t')

header = next(r)
for i, v in enumerate(header):
    h[v] = i

xaxis_name = args.xaxis
yaxis_name = args.yaxis

for l in r:
    current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
    if start_date <= current_date < end_date:
        if xaxis_name == 'time' :
            x.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        elif xaxis_name == 'phase' :
            x.append(l[h[xaxis_name]])
        else :
            x.append(float(l[h[xaxis_name]]))
        
        if yaxis_name == 'time' :
            y.append(datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S'))
        elif yaxis_name == 'phase' :
            y.append(l[h[yaxis_name]])
        else :
            y.append(float(l[h[yaxis_name]]))

machine_name = args.machine_name

# Parse data for the second y-axis if it's provided
if args.yaxis2:
    y2 = []  
    f.seek(0)  # Reset cursor to re-read file
    next(r)

    for l in r:
        current_date = datetime.datetime.strptime(l[h['time']], '%Y-%m-%d %H:%M:%S').date()
        if start_date <= current_date < end_date:
            try:
                y2.append(float(l[h[args.yaxis2]]))
            except ValueError:
                pass
else:
    y2 = []  # Reset y2 if args.yaxis2 is not provided weird bug sheeesh

if len(y) > 0:
    fig, ax = plt.subplots()
    fig.set_size_inches(12, 6)
    fig.subplots_adjust(left=0.1, bottom=0.1, right=0.95, top=0.9)

    ax.plot(x, y, color='blue', label=yaxis_name)

    # Plots the second graph with the second y-axis data (if available)
    if len(y2) > 0: 
        ax2 = ax.twinx()
        ax2.plot(x, y2, color='red', label=args.yaxis2) #add color changeability ?
        ax2.set_ylabel(args.yaxis2)

    ax.set_title('{0} over {1}\nMachine: {2}\nStart Date: {3} - End Date: {4}'.format(args.yaxis, args.xaxis, machine_name, args.start_date, args.end_date))

    ax.set_xlabel(xaxis_name)
    ax.set_ylabel(yaxis_name)

    min_y = min(y)
    ax.set_ylim(bottom=min(0, min_y+5*(min_y/100)))

    ax.grid(axis='y')
    ax.yaxis.set_major_locator(ticker.MaxNLocator(20))

    # Combine the legends from both plots (if available)
    if len(y2) > 0: 
        lines, labels = ax.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax2.legend(lines + lines2, labels + labels2)

    fig.autofmt_xdate()
    img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
    os.makedirs(img_dir, exist_ok=True)

    img_path = os.path.join(img_dir, 'plot.png')

    fig.savefig(img_path)

    print('Plot image saved:', img_path)
else:
    print('No data available for the specified date range.')
