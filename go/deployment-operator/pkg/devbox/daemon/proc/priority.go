package proc

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

// Workloads (terminals, agents' tool commands, the browser) run at a lower CPU priority and a higher OOM score
// than the daemon and the agents, so a box a job saturates still answers and keeps its agents alive. The daemon
// is unprivileged: it can lower other processes but never raise itself. Sandboxes that don't schedule by
// niceness (gVisor) accept and ignore it.
const (
	WorkloadNice        = 10
	WorkloadOOMScoreAdj = 500
)

const procRoot = "/proc"

// shells start the tool commands agents run; everything from one down is a workload, the agent above it isn't.
var shells = map[string]bool{"sh": true, "bash": true, "dash": true, "zsh": true, "fish": true, "ash": true, "ksh": true}

// Deprioritize gives pid and its threads the workload CPU priority and OOM score.
func Deprioritize(pid int) error {
	return deprioritize(procRoot, pid)
}

func deprioritize(root string, pid int) error {
	var errs []error
	// Niceness is per thread on Linux, and threads started before this keep theirs.
	tids := []int{pid}
	if entries, err := os.ReadDir(filepath.Join(root, strconv.Itoa(pid), "task")); err == nil {
		tids = tids[:0]
		for _, e := range entries {
			if tid, err := strconv.Atoi(e.Name()); err == nil {
				tids = append(tids, tid)
			}
		}
	}
	for _, tid := range tids {
		if err := syscall.Setpriority(syscall.PRIO_PROCESS, tid, WorkloadNice); err != nil && !errors.Is(err, syscall.ESRCH) {
			errs = append(errs, fmt.Errorf("setpriority %d: %w", tid, err))
		}
	}
	if err := os.WriteFile(filepath.Join(root, strconv.Itoa(pid), "oom_score_adj"), []byte(strconv.Itoa(WorkloadOOMScoreAdj)), 0); err != nil && !errors.Is(err, os.ErrNotExist) {
		errs = append(errs, fmt.Errorf("oom_score_adj %d: %w", pid, err))
	}
	// A process in its own session has its own autogroup, and autogroups share the CPU by their own niceness,
	// whatever their processes' is. The daemon's session is left alone: lowering it would lower the daemon.
	own, ok1 := readStat(filepath.Join(root, "self"))
	st, ok2 := readStat(filepath.Join(root, strconv.Itoa(pid)))
	if ok1 && ok2 && st.session != own.session {
		// Absent without CONFIG_SCHED_AUTOGROUP.
		_ = os.WriteFile(filepath.Join(root, strconv.Itoa(pid), "autogroup"), []byte(strconv.Itoa(WorkloadNice)), 0)
	}
	return errors.Join(errs...)
}

type procStat struct {
	comm    string
	ppid    int
	session int
	nice    int
}

// DeprioritizeTools gives the tool commands under each root (an agent process) the workload priority: the first
// shell on each branch and everything below it. It returns how many processes it changed.
func DeprioritizeTools(roots []int) int {
	return deprioritizeTools(procRoot, roots)
}

func deprioritizeTools(root string, roots []int) int {
	n := 0
	for _, pid := range toolPids(readProcs(root), roots) {
		if deprioritize(root, pid) == nil {
			n++
		}
	}
	return n
}

// toolPids returns the processes below roots, from each branch's first shell down, not yet at the workload nice.
func toolPids(procs map[int]procStat, roots []int) []int {
	children := map[int][]int{}
	for pid, st := range procs {
		children[st.ppid] = append(children[st.ppid], pid)
	}
	var out []int
	var walk func(pid int, tool bool)
	walk = func(pid int, tool bool) {
		for _, c := range children[pid] {
			st := procs[c]
			isTool := tool || shells[st.comm]
			if isTool && st.nice < WorkloadNice {
				out = append(out, c)
			}
			walk(c, isTool)
		}
	}
	for _, r := range roots {
		walk(r, false)
	}
	return out
}

func readProcs(root string) map[int]procStat {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil
	}
	procs := map[int]procStat{}
	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue
		}
		if st, ok := readStat(filepath.Join(root, e.Name())); ok {
			procs[pid] = st
		}
	}
	return procs
}

func readStat(dir string) (procStat, bool) {
	data, err := os.ReadFile(filepath.Join(dir, "stat"))
	if err != nil {
		return procStat{}, false
	}
	return parseStat(string(data))
}

// parseStat reads comm, ppid and nice from /proc/<pid>/stat. comm is parenthesized and may hold spaces and
// parentheses itself, so the fields after it are found from the last ')'.
func parseStat(s string) (procStat, bool) {
	open, end := strings.IndexByte(s, '('), strings.LastIndexByte(s, ')')
	if open < 0 || end < open {
		return procStat{}, false
	}
	// From field 3 (state): ppid is field 4, session field 6, nice field 19.
	f := strings.Fields(s[end+1:])
	if len(f) < 17 {
		return procStat{}, false
	}
	ppid, err1 := strconv.Atoi(f[1])
	session, err2 := strconv.Atoi(f[3])
	nice, err3 := strconv.Atoi(f[16])
	if err1 != nil || err2 != nil || err3 != nil {
		return procStat{}, false
	}
	return procStat{comm: s[open+1 : end], ppid: ppid, session: session, nice: nice}, true
}
