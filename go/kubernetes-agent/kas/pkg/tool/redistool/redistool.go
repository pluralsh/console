package redistool

import (
	"crypto/tls"
	"net"

	"github.com/redis/rueidis"
)

func MultiErrors(resp []rueidis.RedisResult) []error {
	var errs []error
	for _, r := range resp {
		if err := r.Error(); err != nil {
			errs = append(errs, err)
		}
	}
	return errs
}

// UnixDialer can be used as DialFn in rueidis.ClientOption.
func UnixDialer(addr string, dialer *net.Dialer, tlsConfig *tls.Config) (net.Conn, error) {
	return net.DialUnix("unix", nil, &net.UnixAddr{
		Name: addr,
		Net:  "unix",
	})
}
