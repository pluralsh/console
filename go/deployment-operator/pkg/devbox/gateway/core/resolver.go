package core

import (
	"context"
	"slices"
	"strings"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
)

// ResolveActor implements egress.ActorResolver: it maps "<atespace>/<actor>" to the instance's egress view.
func (g *Gateway) ResolveActor(ctx context.Context, actorID string) (*egress.InstanceInfo, error) {
	inst := g.byActorID(actorID)
	if inst == nil || terminal(inst.status()) {
		return nil, egress.ErrUnknownActor
	}
	return g.instanceInfo(ctx, inst)
}

// instanceInfo builds what egress needs to know about an instance from its request, its runner and the daemon's
// latest aggregate.
func (g *Gateway) instanceInfo(ctx context.Context, inst *Instance) (*egress.InstanceInfo, error) {
	inst.mu.Lock()
	runner := inst.runner
	rec := inst.rec
	inst.mu.Unlock()
	if runner == nil {
		r, err := g.deps.Runners.Get(ctx, rec.Runner)
		if err != nil {
			return nil, err
		}
		inst.mu.Lock()
		inst.runner = r
		inst.mu.Unlock()
		runner = r
	}

	inst.mu.Lock()
	req := inst.req
	info := &egress.InstanceInfo{
		InstanceID:          rec.InstanceID,
		BoxID:               rec.DevboxID,
		WorkbenchID:         rec.WorkbenchID,
		UserID:              rec.OwnerID,
		ClusterID:           g.cluster(),
		AllowedRepositories: slices.Clone(req.GetAllowedRepositories()),
		HTTPAllowlist:       slices.Clone(runner.HTTPAllowlist),
		ConsoleHost:         hostOf(g.cfg.ConsoleURL),
		AgentBilling:        map[string]string{},
		CloudIdentityHosts:  slices.Clone(runner.CloudIdentityHosts),
		Checkouts:           inst.aggregate.GetCheckouts(),
	}
	for _, a := range req.GetAgents() {
		info.AgentBilling[a.GetAgent().String()] = a.GetBilling().String()
	}
	repos := slices.Clone(req.GetAllowedRepositories())
	for _, r := range req.GetRepositories() {
		repos = append(repos, r.GetUrl())
	}
	for _, c := range info.Checkouts {
		repos = append(repos, c.GetRemoteUrl())
	}
	inst.mu.Unlock()

	if len(info.AllowedRepositories) == 0 {
		info.AllowedRepositories = slices.Clone(runner.AllowedRepositories)
		repos = append(repos, runner.AllowedRepositories...)
	}
	if h := hostOf(g.cfg.AIProxyURL); h != info.ConsoleHost {
		info.AIProxyHost = h
	}
	seen := map[string]bool{}
	addHost := func(h string) {
		if h != "" && !seen[h] {
			seen[h] = true
			info.SCMHosts = append(info.SCMHosts, h)
		}
	}
	for _, h := range g.boxSCMHosts(ctx, inst, false) {
		addHost(h)
	}
	for _, r := range repos {
		addHost(repoHost(r))
	}
	return info, nil
}

// boxSCMHosts returns the hosts of the box's SCM connections (DevboxRunner.spec.scmConnections, or console's
// default connection), which egress must allow and inject for even before a repository on them is named. Console
// resolves connection names to hosts: GetInstanceCredentials with an SCM selector and no host answers one
// credential per connection, each carrying its host. The answer is cached on the instance; refresh refetches it
// (when the egress policy is re-applied). On failure the cached hosts, if any, are kept.
func (g *Gateway) boxSCMHosts(ctx context.Context, inst *Instance, refresh bool) []string {
	inst.mu.Lock()
	cached := inst.scmHosts
	inst.mu.Unlock()
	if cached != nil && !refresh {
		return cached
	}

	fctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	resp, err := g.deps.Ingest.GetInstanceCredentials(fctx, &devboxv1.GetInstanceCredentialsRequest{
		InstanceId:  inst.ID,
		Credentials: []*devboxv1.CredentialSelector{{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_SCM}},
	})
	if err != nil {
		g.log.Info("unable to resolve the box's SCM connection hosts; using repository hosts only", "instance", inst.ID, "error", err.Error())
		return cached
	}
	hosts := []string{}
	for _, c := range resp.GetCredentials() {
		if c.GetKind() != devboxv1.CredentialKind_CREDENTIAL_KIND_SCM {
			continue
		}
		if h := strings.ToLower(hostOf(c.GetHost())); h != "" && !slices.Contains(hosts, h) {
			hosts = append(hosts, h)
		}
	}
	inst.mu.Lock()
	inst.scmHosts = hosts
	inst.mu.Unlock()
	return hosts
}

// repoHost extracts the host from a repository URL in any form Git.normalize_url accepts.
func repoHost(repo string) string {
	repo = strings.TrimSpace(repo)
	if repo == "" || strings.Contains(repo, "*") && !strings.Contains(repo, "/") {
		return ""
	}
	if !strings.Contains(repo, "://") {
		// git@host:owner/repo
		if at := strings.Index(repo, "@"); at >= 0 {
			if colon := strings.Index(repo[at:], ":"); colon > 0 {
				return strings.ToLower(repo[at+1 : at+colon])
			}
		}
		repo = "https://" + repo
	}
	return strings.ToLower(hostOf(repo))
}
