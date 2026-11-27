package daemon

import (
	"context"
	"strings"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

const toolPriorityInterval = 5 * time.Second

// toolPriorityLoop gives the tool commands agents run the workload priority. Agents start those themselves, so
// unlike terminals and the browser the daemon can't lower them as it spawns them.
func (d *Daemon) toolPriorityLoop(ctx context.Context) {
	t := d.cfg.Clock.NewTicker(toolPriorityInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C():
			var agents []int
			for _, p := range d.sup.List() {
				if strings.HasPrefix(p.Name, "agent-") && p.Pid > 0 {
					agents = append(agents, p.Pid)
				}
			}
			if len(agents) > 0 {
				proc.DeprioritizeTools(agents)
			}
		}
	}
}
