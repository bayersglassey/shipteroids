set -euo pipefail

. ip.sh
ssh shipteroids@$IP '
    set -euo pipefail
    set -x
    cd /srv/shipteroids

    git fetch
    git reset --hard origin/master
    git status

    mkdir -p www
    cp index.html *.js www/

    rm -f www/repo
    ln -s $PWD www/repo
'
