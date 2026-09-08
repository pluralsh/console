/**
 * Authentication page content for REST API Reference.
 * "Edit on Github" is rendered in the shared footer (below the privacy line) when this page is active.
 */

import { AuthBody, AuthContent, AuthTitle } from './RestApiReference.styles'

export function AuthPageContent() {
  return (
    <AuthContent>
      <AuthTitle>Authentication</AuthTitle>
      <AuthBody>
        <p>To authenticate to the REST API, just do the following:</p>
        <ol>
          <li>
            Create an access token (simple way is{' '}
            <code>cmd + k → access tokens</code>)
          </li>
          <li>
            Add an <code>Authorization: Token {'<your-access-token>'}</code>{' '}
            header.
          </li>
        </ol>
        <p>
          In addition, we offer a number of typed clients here:{' '}
          <a
            href="https://github.com/pluralsh/rest-clients"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/pluralsh/rest-clients
          </a>
        </p>
      </AuthBody>
    </AuthContent>
  )
}
