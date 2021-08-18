
set -euo pipefail

outfile=out.gif

players="${1:-1}"
echo "Setting up for $players players..."

w=700
h=700
x=439
y=142

if test "$players" = 2
then
    w=1275
    h=600
    x=100
    y=182
fi

delay=3

echo "Recording to file $outfile in $delay seconds..." >&2

byzanz-record -v -x "$x" -y "$y" -w "$w" -h "$h" --delay "$delay" "$outfile"

echo "...done!" >&2
