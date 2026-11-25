//go:build !linux

package terminal

// procCwd isn't read off Linux, leaving a terminal's cwd as the one it started in.
func procCwd(int) string { return "" }
