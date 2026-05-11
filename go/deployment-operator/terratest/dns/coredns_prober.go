package dns

import (
	"context"
	"fmt"
)

type corednsProber struct {
	defaultProber
}

func NewCoreDNSProber(opts ...ProberOption) (Prober, error) {
	return &corednsProber{
		defaultProber: newDefaultProber(opts...),
	}, nil
}

func (in *corednsProber) Probe(fqdn string, opts ...ProbeOption) error {
	if fqdn == "" {
		return fmt.Errorf("coredns fqdn must be set")
	}

	options, err := in.parseProbeOptions(opts...)
	if err != nil {
		return err
	}

	return in.runWithRetry(options, func() error {
		resolved, err := in.resolver.LookupHost(context.Background(), fqdn)
		if err != nil {
			return fmt.Errorf("failed to resolve %s: %w", fqdn, err)
		}
		if len(resolved) == 0 {
			return fmt.Errorf("no DNS records resolved for %s", fqdn)
		}
		return nil
	})
}
