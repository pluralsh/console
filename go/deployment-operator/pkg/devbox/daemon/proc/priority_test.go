package proc

import (
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
)

func TestDeprioritizeLowersAProcess(t *testing.T) {
	if _, err := os.Stat("/proc/self/stat"); err != nil {
		t.Skip("no procfs")
	}
	cmd := exec.Command("sleep", "30")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = cmd.Process.Kill(); _ = cmd.Wait() })
	pid := cmd.Process.Pid
	if err := Deprioritize(pid); err != nil {
		t.Fatal(err)
	}
	if st := readProcs("/proc")[pid]; st.nice != WorkloadNice {
		t.Fatalf("nice = %d", st.nice)
	}
	adj, err := os.ReadFile(filepath.Join("/proc", strconv.Itoa(pid), "oom_score_adj"))
	if err != nil || strings.TrimSpace(string(adj)) != strconv.Itoa(WorkloadOOMScoreAdj) {
		t.Fatalf("oom_score_adj = %q, %v", adj, err)
	}
	if st := readProcs("/proc")[os.Getpid()]; st.nice == WorkloadNice {
		t.Fatal("lowered the caller too")
	}
}

func TestParseStat(t *testing.T) {
	st, ok := parseStat("4242 (node (worker) x) S 17 4242 4242 0 -1 4194560 1 0 0 0 0 0 0 0 20 5 1 0 100 0 0")
	if !ok {
		t.Fatal("not parsed")
	}
	if st.comm != "node (worker) x" || st.ppid != 17 || st.session != 4242 || st.nice != 5 {
		t.Fatalf("parsed %+v", st)
	}
	if _, ok := parseStat("4242 (truncated"); ok {
		t.Fatal("parsed a truncated stat")
	}
}

func TestToolPidsStartAtTheFirstShellUnderAnAgent(t *testing.T) {
	procs := map[int]procStat{
		1:  {comm: "devbox-daemon", ppid: 0},
		10: {comm: "claude-code-acp", ppid: 1}, // agent root
		11: {comm: "claude", ppid: 10},         // the CLI the adapter drives
		12: {comm: "node", ppid: 11},           // an MCP server: not a tool
		13: {comm: "bash", ppid: 11},           // a tool command
		14: {comm: "cargo", ppid: 13},
		15: {comm: "rustc", ppid: 14},
		16: {comm: "bash", ppid: 11, nice: WorkloadNice}, // already lowered
		17: {comm: "sleep", ppid: 16, nice: WorkloadNice},
		20: {comm: "bash", ppid: 1}, // a terminal: lowered at spawn, not here
		21: {comm: "make", ppid: 20},
	}
	got := toolPids(procs, []int{10})
	slices.Sort(got)
	if want := []int{13, 14, 15}; !slices.Equal(got, want) {
		t.Fatalf("tool pids = %v, want %v", got, want)
	}
}
