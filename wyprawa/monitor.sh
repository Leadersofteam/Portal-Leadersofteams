#!/bin/bash
# Druga strona lustra: co Portal NAPRAWDĘ zapisał, gdy wyprawa klikała.
# Wzorzec: audyt/harness/monitor.sh z repo App.
# Użycie: bash wyprawa/monitor.sh [minuty=10]
MIN="${1:-10}"
echo "== Zapisy w logach portal-prod-api (ostatnie ${MIN} min, nie-GET, bez healthz) =="
docker logs portal-prod-api-1 --since "${MIN}m" 2>&1 \
  | grep -oE '"method":"(POST|PUT|PATCH|DELETE)","url":"[^"]*"' \
  | grep -v healthz | sort | uniq -c | sort -rn
echo
echo "== Stan kont wyprawy w bazie =="
docker exec portal-prod-mysql-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" portal -e "
SELECT u.email, ls.level, ls.totalPoints, ls.marketplacePoints, ls.communityPoints
FROM users u LEFT JOIN ladder_states ls ON ls.userId=u.id
WHERE u.email LIKE \"%jaworowski%\" OR u.email LIKE \"%kwiatkowscy%\" OR u.email LIKE \"%stalmet%\" OR u.email LIKE \"%brandpoint%\" OR u.email LIKE \"%interim-managers%\";
SELECT pe.type, pe.points, pe.status, pe.createdAt FROM point_events pe JOIN users u ON u.id=pe.userId
WHERE u.email LIKE \"%jaworowski%\" ORDER BY pe.createdAt DESC LIMIT 15;
SELECT COUNT(*) AS sprawy_moderacyjne_otwarte FROM moderation_cases WHERE status=\"OPEN\";"' 2>&1 | grep -v Warning
