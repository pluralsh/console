package idle

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// clockTicks is USER_HZ, 100 on every Linux the sandbox runs.
const clockTicks = 100

// ProcSampler samples /proc/<pid>/stat CPU times for every process outside the daemon.
type ProcSampler struct {
	Root string
	// Exclude reports processes that don't count (the daemon, browser helpers); called with pid and pgid.
	Exclude func(pid, pgid int) bool

	prev     map[int]uint64
	prevTime time.Time
}

type procStat struct {
	pid, pgid int
	ticks     uint64
}

func readStat(path string) (procStat, bool) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return procStat{}, false
	}
	s := string(raw)
	// comm may contain spaces and parens; fields resume after the last ')'.
	end := strings.LastIndexByte(s, ')')
	if end < 0 {
		return procStat{}, false
	}
	open := strings.IndexByte(s, '(')
	pid, err := strconv.Atoi(strings.TrimSpace(s[:open]))
	if err != nil {
		return procStat{}, false
	}
	f := strings.Fields(s[end+1:])
	// f[0]=state f[1]=ppid f[2]=pgrp ... f[11]=utime f[12]=stime
	if len(f) < 13 {
		return procStat{}, false
	}
	pgid, _ := strconv.Atoi(f[2])
	ut, _ := strconv.ParseUint(f[11], 10, 64)
	st, _ := strconv.ParseUint(f[12], 10, 64)
	return procStat{pid: pid, pgid: pgid, ticks: ut + st}, true
}

// Sample implements CPUSampler. The first sample establishes a baseline and reports zero.
func (s *ProcSampler) Sample(now time.Time) (float64, map[int]float64) {
	root := s.Root
	if root == "" {
		root = "/proc"
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return 0, nil
	}
	self := os.Getpid()
	cur := make(map[int]uint64, len(entries))
	pgids := map[int]int{}
	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue
		}
		ps, ok := readStat(filepath.Join(root, e.Name(), "stat"))
		if !ok || pid == self {
			continue
		}
		if s.Exclude != nil && s.Exclude(ps.pid, ps.pgid) {
			continue
		}
		cur[pid] = ps.ticks
		pgids[pid] = ps.pgid
	}
	elapsed := now.Sub(s.prevTime).Seconds()
	first := s.prev == nil
	prev := s.prev
	s.prev, s.prevTime = cur, now
	if first || elapsed <= 0 {
		return 0, map[int]float64{}
	}
	var total float64
	by := map[int]float64{}
	for pid, t := range cur {
		base, ok := prev[pid]
		if !ok || t < base {
			// New processes count from zero; their whole lifetime fell inside the interval at most.
			base = 0
			if !ok && t > uint64(elapsed*clockTicks) {
				base = t - uint64(elapsed*clockTicks)
			}
		}
		pct := float64(t-base) / clockTicks / elapsed * 100
		total += pct
		by[pgids[pid]] += pct
	}
	return total, by
}
