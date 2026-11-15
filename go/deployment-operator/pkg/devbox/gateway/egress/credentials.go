package egress

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"golang.org/x/sync/singleflight"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

const (
	defaultRefreshAhead = 10 * time.Minute
	// defaultTTL applies when console returns a credential without expires_at.
	defaultTTL          = 10 * time.Minute
	defaultFetchTimeout = 15 * time.Second
	// activeWindow is how recently an entry must have been used for the sweeper to refresh it ahead of expiry.
	activeWindow = 30 * time.Minute
	// evictAfter drops expired entries nobody has used for this long.
	evictAfter = time.Hour
)

var kindToProto = map[string]devboxv1.CredentialKind{
	KindSCM:         devboxv1.CredentialKind_CREDENTIAL_KIND_SCM,
	KindAIProxy:     devboxv1.CredentialKind_CREDENTIAL_KIND_AI_PROXY,
	KindConsole:     devboxv1.CredentialKind_CREDENTIAL_KIND_CONSOLE,
	KindClaudeOAuth: devboxv1.CredentialKind_CREDENTIAL_KIND_CLAUDE_OAUTH,
	KindOIDC:        devboxv1.CredentialKind_CREDENTIAL_KIND_OIDC,
}

// credKey names one cached credential. selector is the SCM host for scm and the identity name for oidc.
type credKey struct {
	instanceID string
	kind       string
	selector   string
}

func (k credKey) String() string {
	return k.instanceID + "/" + k.kind + "/" + k.selector
}

type credEntry struct {
	cred         *devboxv1.InstanceCredential
	value        []byte
	expiresAt    time.Time
	refreshAfter time.Time
	lastUsed     time.Time
	// retryAt holds back background refreshes after one failed, so an outage doesn't turn every egress request
	// into a console call.
	retryAt time.Time
	// refreshing is set while a background refresh of this entry runs, so callers arriving after singleflight
	// finished it don't start another one for an entry that is about to be replaced.
	refreshing bool
	// static entries were handed to the gateway (SetStaticCredential) rather than minted by console for an
	// instance, so they are never fetched or refreshed.
	static bool
}

// startRefresh reports whether the caller should refresh e in the background, and claims the refresh if so.
// Call it with c.mu held.
func (e *credEntry) startRefresh(now time.Time) bool {
	if e.static || e.refreshing || now.Before(e.refreshAfter) || now.Before(e.retryAt) {
		return false
	}
	e.refreshing = true
	return true
}

const refreshRetryBackoff = 30 * time.Second

// credentialCache holds instance credentials minted by console (Ingest.GetInstanceCredentials) and refreshes them
// ahead of expiry (section 4.8):
//   - a fresh entry is served from memory;
//   - an entry past refresh_after is served while one background refresh runs;
//   - a missing or expired entry is fetched inline;
//   - concurrent fetches of one credential collapse into one Ingest call;
//   - if console is unreachable the cached entry is served until it expires, then callers get Unavailable.
type credentialCache struct {
	ingest       devboxv1.IngestClient
	log          logr.Logger
	now          func() time.Time
	refreshAhead time.Duration
	fetchTimeout time.Duration

	mu      sync.Mutex
	entries map[credKey]*credEntry
	// generations increase on Invalidate so a fetch already in flight can't repopulate a revoked instance.
	generations map[string]uint64
	group       singleflight.Group
}

func newCredentialCache(ingest devboxv1.IngestClient, log logr.Logger) *credentialCache {
	return &credentialCache{
		ingest:       ingest,
		log:          log,
		now:          time.Now,
		refreshAhead: defaultRefreshAhead,
		fetchTimeout: defaultFetchTimeout,
		entries:      map[credKey]*credEntry{},
		generations:  map[string]uint64{},
	}
}

// get returns a usable credential, fetching it if needed. Errors are gRPC statuses: NotFound when console has no
// such credential, Unavailable when it can't be fetched and nothing unexpired is cached.
func (c *credentialCache) get(ctx context.Context, key credKey) (*credEntry, error) {
	now := c.now()
	c.mu.Lock()
	e, ok := c.entries[key]
	if ok && now.Before(e.expiresAt) {
		e.lastUsed = now
		stale := e.startRefresh(now)
		c.mu.Unlock()
		if stale {
			c.refreshAsync(key)
		}
		return e, nil
	}
	if ok && e.static {
		c.mu.Unlock()
		return nil, status.Errorf(codes.Unavailable, "the %s credential of %s expired", key.kind, key.instanceID)
	}
	c.mu.Unlock()

	ch := c.group.DoChan(key.String(), func() (any, error) { return c.fetch(key) })
	select {
	case res := <-ch:
		if res.Err != nil {
			return nil, res.Err
		}
		return res.Val.(*credEntry), nil
	case <-ctx.Done():
		return nil, status.FromContextError(ctx.Err()).Err()
	}
}

func (c *credentialCache) refreshAsync(key credKey) {
	go func() {
		_, err, _ := c.group.Do(key.String(), func() (any, error) { return c.fetch(key) })
		if err != nil {
			c.mu.Lock()
			if e, ok := c.entries[key]; ok {
				e.retryAt = c.now().Add(refreshRetryBackoff)
				e.refreshing = false
			}
			c.mu.Unlock()
			c.log.V(1).Info("credential refresh failed; serving the cached credential until it expires", "credential", key.kind, "instance", key.instanceID, "error", err.Error())
		}
	}()
}

// fetch calls console and stores the result. It runs inside singleflight with its own timeout, so one caller
// giving up doesn't fail the others waiting on it.
func (c *credentialCache) fetch(key credKey) (*credEntry, error) {
	c.mu.Lock()
	gen := c.generations[key.instanceID]
	c.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), c.fetchTimeout)
	defer cancel()

	sel := &devboxv1.CredentialSelector{Kind: kindToProto[key.kind]}
	switch key.kind {
	case KindSCM:
		sel.Host = key.selector
	case KindOIDC:
		sel.Identity = key.selector
	}
	resp, err := c.ingest.GetInstanceCredentials(ctx, &devboxv1.GetInstanceCredentialsRequest{
		InstanceId:  key.instanceID,
		Credentials: []*devboxv1.CredentialSelector{sel},
	})
	if err != nil {
		return nil, mapIngestError(key, err)
	}

	cred := pickCredential(resp.GetCredentials(), key)
	if cred == nil {
		return nil, status.Errorf(codes.NotFound, "console returned no %s credential for instance %s", key.kind, key.instanceID)
	}
	value := headerValue(cred)
	if len(value) == 0 && key.kind != KindOIDC {
		return nil, status.Errorf(codes.Unavailable, "console returned an empty %s credential for instance %s", key.kind, key.instanceID)
	}

	now := c.now()
	expires := now.Add(defaultTTL)
	if ts := cred.GetExpiresAt(); ts != nil && ts.IsValid() {
		expires = ts.AsTime()
	}
	if !now.Before(expires) {
		return nil, status.Errorf(codes.Unavailable, "console returned an expired %s credential for instance %s", key.kind, key.instanceID)
	}
	refresh := expires.Add(-c.refreshAhead)
	if ts := cred.GetRefreshAfter(); ts != nil && ts.IsValid() {
		refresh = ts.AsTime()
	}
	if !refresh.After(now) || !refresh.Before(expires) {
		refresh = now.Add(expires.Sub(now) / 2)
	}

	e := &credEntry{cred: cred, value: value, expiresAt: expires, refreshAfter: refresh, lastUsed: now}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.generations[key.instanceID] != gen {
		return nil, status.Errorf(codes.NotFound, "instance %s was revoked", key.instanceID)
	}
	if old, ok := c.entries[key]; ok && old.lastUsed.After(e.lastUsed) {
		e.lastUsed = old.lastUsed
	}
	c.entries[key] = e
	return e, nil
}

func pickCredential(creds []*devboxv1.InstanceCredential, key credKey) *devboxv1.InstanceCredential {
	want := kindToProto[key.kind]
	var fallback *devboxv1.InstanceCredential
	for _, cred := range creds {
		if cred.GetKind() != want {
			continue
		}
		switch key.kind {
		case KindSCM:
			if key.selector == "" || canonicalSCMHost(cred.GetHost()) == key.selector {
				return cred
			}
			if cred.GetHost() == "" {
				fallback = cred
			}
		case KindOIDC:
			if key.selector == "" || cred.GetIdentity() == key.selector {
				return cred
			}
		default:
			return cred
		}
	}
	return fallback
}

// headerValue is the complete header value egress writes: console's header_format applied to the token, or
// "Bearer <token>" when console names no format. Policies carry no prefix for these credentials.
func headerValue(cred *devboxv1.InstanceCredential) []byte {
	token := cred.GetToken()
	if token == "" {
		return nil
	}
	format := cred.GetHeaderFormat()
	switch {
	case format == "":
		return []byte(bearerPrefix + token)
	case strings.Contains(format, "%s"):
		return []byte(fmt.Sprintf(format, token))
	default:
		return []byte(format + token)
	}
}

// mapIngestError turns a console failure into the status Substrate expects: NotFound (a 403 to the sandbox) when
// retrying can't help, Unavailable (a retryable 503) otherwise.
func mapIngestError(key credKey, err error) error {
	switch status.Code(err) {
	case codes.NotFound, codes.PermissionDenied, codes.FailedPrecondition, codes.InvalidArgument:
		return status.Errorf(codes.NotFound, "console has no %s credential for instance %s: %s", key.kind, key.instanceID, status.Convert(err).Message())
	default:
		return status.Errorf(codes.Unavailable, "credentials unavailable for instance %s: %s", key.instanceID, status.Convert(err).Message())
	}
}

// setStatic stores a credential console doesn't mint per instance; it's served until it expires.
func (c *credentialCache) setStatic(key credKey, cred *devboxv1.InstanceCredential, expiresAt time.Time) {
	now := c.now()
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = &credEntry{cred: cred, value: headerValue(cred), expiresAt: expiresAt, refreshAfter: expiresAt, lastUsed: now, static: true}
}

// invalidate drops an instance's credentials and fences fetches already in flight.
func (c *credentialCache) invalidate(instanceID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.generations[instanceID]++
	for k := range c.entries {
		if k.instanceID == instanceID {
			delete(c.entries, k)
		}
	}
}

// sweep refreshes recently used entries that are due, so active instances never wait on an inline refresh, and
// evicts entries that expired long ago.
func (c *credentialCache) sweep() {
	now := c.now()
	var due []credKey
	c.mu.Lock()
	for k, e := range c.entries {
		switch {
		case !now.Before(e.expiresAt) && now.Sub(e.lastUsed) > evictAfter:
			delete(c.entries, k)
		case now.Sub(e.lastUsed) < activeWindow && e.startRefresh(now):
			due = append(due, k)
		}
	}
	c.mu.Unlock()
	for _, k := range due {
		c.refreshAsync(k)
	}
}

func (c *credentialCache) runSweeper(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			c.sweep()
		}
	}
}
