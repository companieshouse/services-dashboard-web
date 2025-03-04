export default () => {

  process.env.MONGO.PROTOCOL="mongodb+srv"
  process.env.MONGO.USER="rand_dev"
  process.env.MONGO.PASSWORD="somepassword"
  process.env.MONGO.HOSTANDPORT="ci-dev-pl-0.ueium.mongodb.net"
  process.env.MONGO.DBNAME="services_dashboard"
  process.env.CDN_URL="d3miau0r8stw5u.cloudfront.net"
  process.env.PORT="3000"
  process.env.DEP_TRACK_SERVER="https://dependency-track.companieshouse.gov.uk"
  process.env.SONAR_SERVER="https://code-analysis.platform.aws.chdev.org"
};
