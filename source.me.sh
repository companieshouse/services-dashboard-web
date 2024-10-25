export MONGODB_PROTOCOL='mongodb+srv'
export MONGODB_USER='rand_dev'
export MONGODB_PASSWORD="${DT_MONGODB_PASSWORD}"
export MONGODB_HOST_AND_PORT='ci-dev-pl-0.ueium.mongodb.net'
export MONGODB_DBNAME='services_dashboard'

export URL="${MONGODB_PROTOCOL}://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST_AND_PORT}/${MONGODB_DBNAME}"

export CDN_URL='d3miau0r8stw5u.cloudfront.net'
export PORT=8080

export DEP_TRACK_SERVER='https://dependency-track.companieshouse.gov.uk'
export SONAR_SERVER='https://code-analysis.platform.aws.chdev.org'

