export default () => {

  process.env.MONGO_PROTOCOL="mongodb+srv"
  process.env.MONGO_USER="rand_dev"
  process.env.MONGO_PASSWORD="somepassword"
  process.env.MONGO_HOSTANDPORT="ci-dev-pl-0.ueium.mongodb.net"
  process.env.MONGO_DBNAME="services_dashboard"
  process.env.CDN_URL="d3miau0r8stw5u.cloudfront.net"
  process.env.PORT="3000"
  process.env.DEP_TRACK_SERVER="https://dependency-track.companieshouse.gov.uk"
  process.env.SONAR_SERVER="https://code-analysis.platform.aws.chdev.org"
};
