package args

import (
	"flag"
	"net"

	"github.com/spf13/pflag"
	"k8s.io/klog/v2"
)

var (
	argAddress = pflag.IP("address", net.IPv4(0, 0, 0, 0), "address on which to serve the port")
	argPort    = pflag.Int("port", 8000, "port to listen to for incoming requests")
	argToken   = pflag.String("token", "", "auth token")
)

func init() {
	fs := flag.NewFlagSet("", flag.PanicOnError)
	klog.InitFlags(fs)
	_ = fs.Set("v", "1")
	pflag.CommandLine.AddGoFlagSet(fs)
	pflag.Parse()
}

func Port() int {
	return *argPort
}

func Address() net.IP {
	return *argAddress
}

func Token() string {
	return *argToken
}
