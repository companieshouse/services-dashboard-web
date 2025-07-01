# services-dashboard-web

This service is the web component of the service's dashboard.
_(Please refer to the main documentation in [services-dashboard-api](https://github.com/companieshouse/services-dashboard-api/) for an overview)._

It is primarily designed to display information stored in Mongo that has been collected by other components of the dashboard.
The same information can be displayed in different tabs. In other words, the dashboard provides multiple views of the data,
depending on the user (currently developers or product owners, though it can be extended for other roles, (such as testers) or use cases).

## How to Run locally using docker

### 1. Create .env file
Add the below environment variables to the .env file and save under services-dashboard-web folder. Update with the appropriate values pointing to local or dev environment.

```txt
MONGO_USER=
MONGO_PASSWORD=
MONGO_HOSTANDPORT=
CDN_URL=
DEP_TRACK_SERVER=
SONAR_SERVER=
```

### 2. Build local docker image.
Run the following commands from the services-dashboard-web folder in the terminal.

```sh
npm install
npm run build
docker build -f Dockerfile.local -t local-services-dashboard .
```

### 3. Run docker image.
Run the following command from the terminal.
```sh
docker run --env-file .env -it --rm -p 3000:3000 local-services-dashboard
```
Access the service from  http://localhost:3000/dashboard in the browser.
