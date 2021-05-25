. ip.sh
ssh shipteroids@$IP '
    set euo -pipefail
    cd /srv/shipteroids

    git fetch
    git reset --hard origin/master
    git status

    mkdir -p www
    cp index.html www/

    rm -f www/repo
    ln -s $PWD www/repo
'
