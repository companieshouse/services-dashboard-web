 export MONGODB_PROTOCOL='mongodb+srv'
 export MONGODB_USER='rand_dev'
 export MONGODB_PASSWORD="${DT_MONGODB_PASSWORD}"
 export MONGODB_HOST_AND_PORT='ci-dev-pl-0.ueium.mongodb.net'
 export MONGODB_DBNAME='services_dashboard'

 export URL="${MONGODB_PROTOCOL}://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST_AND_PORT}/${MONGODB_DBNAME}"
