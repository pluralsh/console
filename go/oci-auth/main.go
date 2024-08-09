package main

import (
	"fmt"

	"github.com/pluralsh/console/go/oci-auth/internal/args"
	"github.com/pluralsh/console/go/oci-auth/internal/router"
	"k8s.io/klog/v2"

	// Importing route packages forces route registration
	_ "github.com/pluralsh/console/go/oci-auth/internal/handlers/auth"
)

func main() {
	klog.Info("Starting OCI authentication sidecar")

	err := router.Router().Run(fmt.Sprintf("%s:%d", args.Address(), args.Port()))
	if err != nil {
		return
	}
}
