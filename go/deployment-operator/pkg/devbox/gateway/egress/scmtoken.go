package egress

import (
	"encoding/base64"
	"fmt"
	"strings"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// SCM credential metadata console sets on every SCM InstanceCredential: {"scheme":"basic","username":...} or
// {"scheme":"bearer"}.
const (
	scmSchemeKey   = "scheme"
	SCMSchemeBasic = "basic"
)

// SCMScheme is an SCM credential's auth scheme ("basic" or "bearer"); "" when console didn't say.
func SCMScheme(cred *devboxv1.InstanceCredential) string {
	return strings.ToLower(cred.GetMetadata().GetFields()[scmSchemeKey].GetStringValue())
}

// RawSCMToken is the SCM token an API client authenticates with. For basic credentials console pre-encodes the
// token as base64("<user>:<token>") (header_format "Basic %s"), which egress injects as is; API clients need the
// part after the first ':'. Other credentials carry the raw token.
func RawSCMToken(cred *devboxv1.InstanceCredential) (string, error) {
	token := cred.GetToken()
	if SCMScheme(cred) != SCMSchemeBasic {
		return token, nil
	}
	decoded, err := base64.StdEncoding.DecodeString(token)
	if err != nil {
		return "", fmt.Errorf("basic SCM credential for %s is not base64: %w", cred.GetHost(), err)
	}
	_, raw, ok := strings.Cut(string(decoded), ":")
	if !ok {
		return "", fmt.Errorf("basic SCM credential for %s has no user:token pair", cred.GetHost())
	}
	return raw, nil
}
