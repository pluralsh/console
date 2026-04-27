# console/assets

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn prototype:start`

Runs a UI-only prototype environment with mocked data and no backend dependencies.<br />
Use this mode for quick mockups and UX flow iteration while still using the design system.

#### Environment variables

- BASE_URL - `optional` - used to override the default `https://console.kubeflow-aws.com` used for proxying the API requests. Configuration can be found in `src/setupProxy.js` file.
- VITE_UI_PROTOTYPE - `optional` - when set to `true`, boots the lightweight prototype app instead of the full console app.

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
