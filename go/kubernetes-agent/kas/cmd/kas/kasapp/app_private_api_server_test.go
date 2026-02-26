package kasapp

import (
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
)

var (
	_ grpc.ServiceRegistrar = (*privateApiServer)(nil)
)

func TestConstructOwnUrl(t *testing.T) {
	tests := []struct {
		name                                                              string
		ownUrl, ownCidr, ownScheme, ownPort, listenNetwork, listenAddress string
		ips                                                               []net.IP

		expectedErr string
		expectedUrl string
	}{
		{
			name:        "URL specified explicitly",
			ownUrl:      "grpc://127.0.0.1:900",
			expectedUrl: "grpc://127.0.0.1:900",
		},
		{
			name:        "CIDR specified, no port",
			ownCidr:     "10.0.0.0/8",
			ips:         []net.IP{net.IPv4(10, 0, 0, 1)},
			expectedErr: "cannot determine port for own URL. Specify OWN_PRIVATE_API_PORT",
		},
		{
			name:        "CIDR, port specified",
			ownCidr:     "10.0.0.0/8",
			ownPort:     "911",
			ips:         []net.IP{net.IPv4(10, 0, 0, 1)},
			expectedUrl: "grpc://10.0.0.1:911",
		},
		{
			name:        "CIDR, scheme, port specified",
			ownCidr:     "10.0.0.0/8",
			ownScheme:   "grpcs",
			ownPort:     "911",
			ips:         []net.IP{net.IPv4(10, 0, 0, 1)},
			expectedUrl: "grpcs://10.0.0.1:911",
		},
		{
			name:        "IPv6 CIDR, no port",
			ownCidr:     "2001:db8:8a2e:370::7334/64",
			ips:         []net.IP{{0x20, 0x01, 0x0d, 0xb8, 0x8a, 0x2e, 0x03, 0x70, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x11, 0x22}},
			expectedErr: "cannot determine port for own URL. Specify OWN_PRIVATE_API_PORT",
		},
		{
			name:        "IPv6 CIDR, port",
			ownCidr:     "2001:db8:8a2e:370::7334/64",
			ownPort:     "911",
			ips:         []net.IP{{0x20, 0x01, 0x0d, 0xb8, 0x8a, 0x2e, 0x03, 0x70, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x11, 0x22}},
			expectedUrl: "grpc://[2001:db8:8a2e:370:809:a0b:c0d:1122]:911",
		},
		{
			name:        "IPv6 CIDR doesn't match",
			ownCidr:     "2001:db8:8a2e:370::7334/64",
			ips:         []net.IP{{0xff, 0xff, 0x0d, 0xb8, 0x8a, 0x2e, 0x03, 0x70, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x11, 0x22}},
			expectedErr: "no IPs matched CIDR specified in the OWN_PRIVATE_API_CIDR environment variable",
		},
		{
			name:        "IPv6 doesn't match IPv4 CIDR",
			ownCidr:     "10.0.0.0/8",
			ips:         []net.IP{{0xff, 0xff, 0x0d, 0xb8, 0x8a, 0x2e, 0x03, 0x70, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x11, 0x22}},
			expectedErr: "no IPs matched CIDR specified in the OWN_PRIVATE_API_CIDR environment variable",
		},
		{
			name:        "IPv4 CIDR doesn't match IPv6",
			ownCidr:     "10.0.0.0/8",
			ips:         []net.IP{{0xff, 0xff, 0x0d, 0xb8, 0x8a, 0x2e, 0x03, 0x70, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x11, 0x22}},
			expectedErr: "no IPs matched CIDR specified in the OWN_PRIVATE_API_CIDR environment variable",
		},
		{
			name:          "no CIDR",
			listenNetwork: "tcp",
			listenAddress: "10.1.2.3:9090",
			expectedUrl:   "grpc://10.1.2.3:9090",
		},
		{
			name:          "no CIDR, port is ignored",
			ownPort:       "123",
			listenNetwork: "tcp",
			listenAddress: "10.1.2.3:9090",
			expectedUrl:   "grpc://10.1.2.3:9090",
		},
		{
			name:          "no CIDR, scheme, port is ignored",
			ownScheme:     "grpcs",
			ownPort:       "123",
			listenNetwork: "tcp",
			listenAddress: "10.1.2.3:9090",
			expectedUrl:   "grpcs://10.1.2.3:9090",
		},
		{
			name:        "URL and CIDR",
			ownUrl:      "grpc://127.0.0.1:900",
			ownCidr:     "10.0.0.0/8",
			expectedErr: "either OWN_PRIVATE_API_URL or OWN_PRIVATE_API_CIDR should be specified, not both",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ownUrl, err := constructOwnUrl(
				func() ([]net.Addr, error) {
					res := make([]net.Addr, 0, len(tc.ips))
					for _, ip := range tc.ips {
						res = append(res, &net.IPNet{
							IP: ip,
							// Mask: nil unused
						})
					}
					return res, nil
				},
				tc.ownUrl, tc.ownCidr, tc.ownScheme, tc.ownPort, tc.listenNetwork, tc.listenAddress,
			)
			if tc.expectedErr != "" {
				assert.EqualError(t, err, tc.expectedErr)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedUrl, ownUrl)
			}
		})
	}
}
