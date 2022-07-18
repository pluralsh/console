# console/assets

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

#### Environment variables
- BASE_URL - `optional` - used to override the default `https://console.kubeflow-aws.com` used for proxying the API requests. Configuration can be found in `src/setupProxy.js` file.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
The app is ready to be deployed!

### `yarn test`

Launches the test runner in the single run mode.

### `yarn lint`

Lints the app.

### `yarn fix`

Fixes linting issues that can be fixed automatically.

### E2E Tests

In order to run e2e tests use `yarn e2e:run` target. It will run a silent version of tests without the UI.

For the development use `yarn e2e:open` to open a cypress UI and be able to see and debug running tests.

#### Environment variables
- CYPRESS_EMAIL - `required` - used to log in
- CYPRESS_PASSWORD - `required` - used to log in
- CYPRESS_BASE_URL - `optional` - allows to override default url that should be used to access the application under test.

