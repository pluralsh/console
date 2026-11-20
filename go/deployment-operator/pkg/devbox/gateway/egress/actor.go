package egress

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"
)

// ActorIDFromSPIFFEID turns a Substrate actor SPIFFE ID into an actor ID ("<atespace>/<name>"). It accepts both
// spiffe://<td>/actor/<atespace>/<name>, which the credential provider receives, and
// spiffe://<td>/worker-for-actor/<atespace>/<name>, which the egress ext_proc sees in filter state.
func ActorIDFromSPIFFEID(id string) (string, error) {
	u, err := url.Parse(id)
	if err != nil {
		return "", fmt.Errorf("invalid actor SPIFFE ID %q: %w", id, err)
	}
	if u.Scheme != "spiffe" || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", fmt.Errorf("%q is not an actor SPIFFE ID", id)
	}
	segments := strings.Split(strings.TrimPrefix(u.Path, "/"), "/")
	if len(segments) != 3 || (segments[0] != "actor" && segments[0] != "worker-for-actor") {
		return "", fmt.Errorf("%q is not an actor SPIFFE ID", id)
	}
	return actorID(segments[1], segments[2])
}

// ActorIDFromJWTSubject turns an actor JWT subject ("actor/<atespace>/<name>") into an actor ID. Tokens minted for
// a worker acting on the actor's behalf (worker-for-actor/...) are rejected.
func ActorIDFromJWTSubject(sub string) (string, error) {
	segments := strings.Split(sub, "/")
	if len(segments) != 3 || segments[0] != "actor" {
		return "", fmt.Errorf("subject %q is not an actor", sub)
	}
	return actorID(segments[1], segments[2])
}

func actorID(atespace, name string) (string, error) {
	if !validResourceName(atespace) || !validResourceName(name) {
		return "", fmt.Errorf("invalid actor %s/%s", atespace, name)
	}
	return atespace + "/" + name, nil
}

// validResourceName matches Kubernetes DNS-1123 labels, which Substrate uses for atespaces and actor names.
func validResourceName(s string) bool {
	if len(s) == 0 || len(s) > 63 {
		return false
	}
	for i, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
		case r == '-' && i > 0 && i < len(s)-1:
		default:
			return false
		}
	}
	return true
}

// actorCache caches ActorResolver answers, positive and negative, for a short TTL. FetchSecret and the ext_proc
// run on every egress request, so they can't call the core each time.
type actorCache struct {
	resolver ActorResolver
	ttl      time.Duration
	now      func() time.Time

	mu      sync.Mutex
	entries map[string]actorEntry
}

type actorEntry struct {
	info    *InstanceInfo
	expires time.Time
}

func newActorCache(resolver ActorResolver, ttl time.Duration) *actorCache {
	return &actorCache{resolver: resolver, ttl: ttl, now: time.Now, entries: map[string]actorEntry{}}
}

// resolve returns the actor's instance, or ErrUnknownActor.
func (c *actorCache) resolve(ctx context.Context, actorID string) (*InstanceInfo, error) {
	now := c.now()
	c.mu.Lock()
	if e, ok := c.entries[actorID]; ok && now.Before(e.expires) {
		c.mu.Unlock()
		if e.info == nil {
			return nil, ErrUnknownActor
		}
		return e.info, nil
	}
	c.mu.Unlock()

	if c.resolver == nil {
		return nil, ErrUnknownActor
	}
	info, err := c.resolver.ResolveActor(ctx, actorID)
	if err != nil && !errors.Is(err, ErrUnknownActor) {
		return nil, err
	}
	if errors.Is(err, ErrUnknownActor) {
		info = nil
	}

	c.mu.Lock()
	c.entries[actorID] = actorEntry{info: info, expires: now.Add(c.ttl)}
	c.mu.Unlock()
	if info == nil {
		return nil, ErrUnknownActor
	}
	return info, nil
}

func (c *actorCache) invalidate(instanceID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for id, e := range c.entries {
		// Negative entries go too: the actor may be an instance that is just starting.
		if e.info == nil || e.info.InstanceID == instanceID {
			delete(c.entries, id)
		}
	}
}
