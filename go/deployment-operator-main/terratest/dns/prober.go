package dns

import (
	"context"
	"fmt"
	"log"
	"net"
	"time"

	"github.com/pluralsh/console/go/polly/containers"
)

type Prober interface {
	Probe(fqdn string, opts ...ProbeOption) error
}

type ProbeOption func(*ProbeOptions) (*ProbeOptions, error)

func WithDelay(delay *string) ProbeOption {
	return func(opts *ProbeOptions) (*ProbeOptions, error) {
		opts.Delay = time.Duration(0)
		if delay == nil {
			return opts, nil
		}

		parsed, err := time.ParseDuration(*delay)
		if err != nil {
			return opts, fmt.Errorf("invalid dns probe delay %q: %w", *delay, err)
		}

		if parsed < 0 {
			return opts, fmt.Errorf("dns probe delay must be non-negative")
		}

		opts.Delay = parsed
		return opts, nil
	}
}

func WithRetries(retries *int64) ProbeOption {
	return func(opts *ProbeOptions) (*ProbeOptions, error) {
		opts.Retries = 0
		if retries == nil {
			return opts, nil
		}

		if *retries < 0 {
			return opts, fmt.Errorf("dns probe retries must be non-negative")
		}

		opts.Retries = *retries
		return opts, nil
	}
}

type ProbeOptions struct {
	Delay   time.Duration
	Retries int64
}

type Resolver interface {
	LookupHost(ctx context.Context, host string) ([]string, error)
}

type defaultProber struct {
	resolver Resolver
}

func (in *defaultProber) Probe(_ string, _ ...ProbeOption) error {
	return fmt.Errorf("not implemented")
}

func (in *defaultProber) lookup(expected containers.Set[string], fqdn string) error {
	resolved, err := in.resolver.LookupHost(context.Background(), fqdn)
	if err != nil {
		return fmt.Errorf("failed to resolve %s: %w", fqdn, err)
	}

	if len(resolved) == 0 {
		return fmt.Errorf("no DNS records resolved for %s", fqdn)
	}

	if !in.hasAddress(resolved, expected) {
		return fmt.Errorf("resolved addresses %v do not match load balancer ingress addresses %v", resolved, expected)
	}

	return nil
}

func (in *defaultProber) hasAddress(resolved []string, expected containers.Set[string]) bool {
	for _, addr := range resolved {
		if expected.Has(addr) {
			return true
		}
	}

	return false
}

func (in *defaultProber) runWithRetry(opts ProbeOptions, fn func() error) (err error) {
	minTimeToResolve := 2 * time.Minute
	minDelay := 5 * time.Second
	minRetries := int64(24)

	retries := opts.Retries
	delay := opts.Delay

	timeToResolve := time.Duration(retries) * delay
	if timeToResolve < minTimeToResolve {
		log.Printf("dns probe time to resolve is less than %s, updating retries and delay", minTimeToResolve)
		delay = minDelay
		retries = minRetries
	}

	timer := time.NewTimer(delay)
	defer timer.Stop()

	var lastErr error
	for attempt := int64(0); attempt <= retries; attempt++ {
		lastErr = fn()
		if lastErr == nil {
			return nil
		}

		log.Printf("probe attempt %d failed with error: %v", attempt+1, lastErr)

		// if no more attempts, exit
		if attempt >= retries {
			return lastErr
		}

		<-timer.C
		if attempt+1 < retries {
			timer.Reset(delay)
		}
	}

	return lastErr
}

func (in *defaultProber) resolveWithRetry(fqdn string, timeout time.Duration) ([]string, error) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	for {
		select {
		case <-timer.C:
			return nil, fmt.Errorf("failed to resolve %s within %s", fqdn, timeout)
		case <-ticker.C:
			addrs, err := in.resolver.LookupHost(context.Background(), fqdn)
			if err == nil {
				return addrs, nil
			}
		}
	}
}

func (in *defaultProber) parseProbeOptions(opts ...ProbeOption) (_ ProbeOptions, err error) {
	options := new(ProbeOptions)
	for _, opt := range opts {
		options, err = opt(options)
		if err != nil {
			return ProbeOptions{}, err
		}
	}

	return *options, err
}

type ProberOption func(Prober)

func WithResolver(resolver Resolver) ProberOption {
	return func(p Prober) {
		p.(*defaultProber).resolver = resolver
	}
}

func newDefaultProber(opts ...ProberOption) defaultProber {
	result := defaultProber{resolver: net.DefaultResolver}

	for _, opt := range opts {
		opt(&result)
	}

	return result
}
