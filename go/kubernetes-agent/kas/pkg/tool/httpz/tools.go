package httpz

import (
	"mime"
	"net/http"
	"net/textproto"
	"strings"
)

// These headers must be in their canonical form. Only add headers used in production code, don't bother with tests.
const (
	ConnectionHeader                    = "Connection" // https://datatracker.ietf.org/doc/html/rfc9110#section-7.6.1
	ProxyConnectionHeader               = "Proxy-Connection"
	KeepAliveHeader                     = "Keep-Alive"
	HostHeader                          = "Host"
	ProxyAuthenticateHeader             = "Proxy-Authenticate"
	ProxyAuthorizationHeader            = "Proxy-Authorization"
	TeHeader                            = "Te"      // canonicalized version of "TE"
	TrailerHeader                       = "Trailer" // not Trailers as per rfc2616; See errata https://www.rfc-editor.org/errata_search.php?eid=4522
	TransferEncodingHeader              = "Transfer-Encoding"
	UpgradeHeader                       = "Upgrade" // https://datatracker.ietf.org/doc/html/rfc9110#section-7.8
	UserAgentHeader                     = "User-Agent"
	AuthorizationHeader                 = "Authorization" // https://datatracker.ietf.org/doc/html/rfc9110#section-11.6.2
	CookieHeader                        = "Cookie"        // https://datatracker.ietf.org/doc/html/rfc6265#section-5.4
	ContentTypeHeader                   = "Content-Type"  // https://datatracker.ietf.org/doc/html/rfc9110#section-8.3
	AcceptHeader                        = "Accept"        // https://datatracker.ietf.org/doc/html/rfc9110#section-12.5.1
	ServerHeader                        = "Server"        // https://datatracker.ietf.org/doc/html/rfc9110#section-10.2.4
	ViaHeader                           = "Via"           // https://datatracker.ietf.org/doc/html/rfc9110#section-7.6.3
	GitlabAgentIdHeader                 = "Gitlab-Agent-Id"
	GitlabAgentIdQueryParam             = "gitlab-agent-id"
	GitlabUnauthorizedHeader            = "Gitlab-Unauthorized"
	CsrfTokenHeader                     = "X-Csrf-Token"                     // nolint: gosec
	CsrfTokenQueryParam                 = "gitlab-csrf-token"                // nolint: gosec
	AccessControlAllowOriginHeader      = "Access-Control-Allow-Origin"      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
	AccessControlAllowHeadersHeader     = "Access-Control-Allow-Headers"     // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers
	AccessControlAllowCredentialsHeader = "Access-Control-Allow-Credentials" // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials
	AccessControlAllowMethodsHeader     = "Access-Control-Allow-Methods"     // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods
	AccessControlMaxAgeHeader           = "Access-Control-Max-Age"           // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
	AccessControlRequestHeadersHeader   = "Access-Control-Request-Headers"   // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Request-Headers
	VaryHeader                          = "Vary"                             // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
	OriginHeader                        = "Origin"                           // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin
	RequestIdHeader                     = "X-Request-Id"

	// TLSNextProtoH2 is the NPN/ALPN protocol negotiated during HTTP/2's TLS setup.
	TLSNextProtoH2 = "h2"
	TLSNextProtoH1 = "http/1.1"

	// H2ClientPreface is the string that must be sent by new
	// connections from clients.
	H2ClientPreface = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n"
)

// RemoveConnectionHeaders removes hop-by-hop headers listed in the "Connection" header of h.
// See https://datatracker.ietf.org/doc/html/rfc7230#section-6.1
func RemoveConnectionHeaders(h http.Header) {
	for _, f := range h[ConnectionHeader] {
		for _, sf := range strings.Split(f, ",") {
			if sf = textproto.TrimString(sf); sf != "" {
				// must use .Del() because connection options are case-insensitive and are likely in lower case, not in canonical case
				h.Del(sf)
			}
		}
	}
}

func IsContentType(actual string, expected ...string) bool {
	parsed, _, err := mime.ParseMediaType(actual)
	if err != nil {
		return false
	}
	for _, e := range expected {
		if e == parsed {
			return true
		}
	}
	return false
}
