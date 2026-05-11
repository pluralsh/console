package dns

import (
	"fmt"
	"log"
	"time"

	"github.com/pluralsh/console/go/polly/containers"
	corev1 "k8s.io/api/core/v1"
)

type loadBalancerProber struct {
	defaultProber

	svc corev1.Service
}

func NewLoadBalancerProber(svc corev1.Service, opts ...ProberOption) (Prober, error) {
	return &loadBalancerProber{
		defaultProber: newDefaultProber(opts...),
		svc:           svc,
	}, nil
}

func (in *loadBalancerProber) Probe(fqdn string, opts ...ProbeOption) (err error) {
	options, err := in.parseProbeOptions(opts...)
	if err != nil {
		return err
	}

	log.Printf("Probing load balancer for %s with options: %+v", fqdn, options)

	addresses, err := in.getAddresses()
	if err != nil {
		return err
	}
	if addresses.Len() == 0 {
		return fmt.Errorf("no load balancer ingress addresses found for %s", in.svc.Name)
	}

	log.Printf("Resolved load balancer ingress addresses: %+v", addresses)

	return in.runWithRetry(options, func() error {
		return in.lookup(addresses, fqdn)
	})
}

func (in *loadBalancerProber) getAddresses() (containers.Set[string], error) {
	result := containers.NewSet[string]()
	for _, ingress := range in.svc.Status.LoadBalancer.Ingress {
		if len(ingress.IP) > 0 {
			result.Add(ingress.IP)
		}

		if len(ingress.Hostname) > 0 {
			addrs, err := in.resolveWithRetry(ingress.Hostname, 5*time.Minute)
			if err != nil {
				return nil, err
			}

			for _, addr := range addrs {
				result.Add(addr)
			}
		}
	}

	return result, nil
}
