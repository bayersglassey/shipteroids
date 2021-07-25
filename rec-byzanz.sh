
set -euo pipefail

outfile="${1:-out.gif}"

w=700
h=700
x=439
y=142
delay=3

echo "Recording to file $outfile in $delay seconds..." >&2

byzanz-record -v -x "$x" -y "$y" -w "$w" -h "$h" --delay "$delay" "$outfile"

echo "...done!" >&2
