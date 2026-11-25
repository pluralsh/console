package egress

import (
	"crypto/tls"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/podcert"
)

// egressServerTLS is the mTLS config shared by the credential provider and the ext_proc. Like Substrate's
// reference provider, it requires a client certificate that chains to the pod-identity trust bundle and carries one
// of the allowed URI SANs.
func egressServerTLS(cfg Config) (*tls.Config, error) {
	sans := cfg.AllowedClientSANs
	if len(sans) == 0 {
		sans = []string{DefaultEgressSPIFFEID}
	}
	return podcert.ServerTLS(podcert.ServerConfig{
		Bundle:         cfg.ServerBundleFile,
		CertFile:       cfg.ServerCertFile,
		KeyFile:        cfg.ServerKeyFile,
		ClientCA:       cfg.ClientCAFile,
		AllowedURISANs: sans,
	})
}
