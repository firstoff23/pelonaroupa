from pathlib import Path
import csv
import json

root = Path('loadtests/results')
rows = []
for path in sorted(root.glob('*_stats.csv')):
    with path.open() as f:
        data = list(csv.DictReader(f))
    for row in data:
        if row.get('Name') == 'Aggregated':
            rows.append({
                'run': path.stem.replace('_stats', ''),
                'requests': int(float(row.get('Request Count') or 0)),
                'failures': int(float(row.get('Failure Count') or 0)),
                'avg_ms': float(row.get('Average Response Time') or 0),
                'min_ms': float(row.get('Min Response Time') or 0),
                'max_ms': float(row.get('Max Response Time') or 0),
                'median_ms': float(row.get('Median Response Time') or 0),
                'rps': float(row.get('Requests/s') or 0),
                'failures_per_s': float(row.get('Failures/s') or 0),
            })
report = {
    'environment': 'local mock backend, 127.0.0.1:8765',
    'fixture': 'loadtests/fixtures/test-dog-synthetic.jpg',
    'warning': 'These are preliminary harness/transport measurements, not model or production SLO results.',
    'runs': rows,
}
Path('loadtests/results/preliminary_report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
