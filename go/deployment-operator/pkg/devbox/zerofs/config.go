package zerofs

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// PasswordEnv is the environment variable a writer's config takes its encryption password from, so the password
// is never written to disk.
const PasswordEnv = "ZEROFS_PASSWORD"

// CacheConfig sizes one writer's cache. Every staged volume gets its own, so these are per box.
type CacheConfig struct {
	DiskGB   float64
	MemoryGB float64
}

// writerConfig is the `zerofs run` config of one volume. Its servers listen on Unix sockets only: the NBD export
// for the block device, 9P to create the device file, and RPC for flushes and checkpoints.
type writerConfig struct {
	StorageURL string
	CacheDir   string
	Cache      CacheConfig
	NBDSocket  string
	NinePSock  string
	RPCSocket  string
	// Options go to the backend's section ([aws], [gcp] or [azure]). Client options such as allow_http only take
	// effect there: ZeroFS overrides the ones it read from the environment.
	Backend string
	Options map[string]string
}

// backendSection is the config section ZeroFS reads a storage scheme's object_store options from.
func backendSection(scheme string) string {
	switch scheme {
	case "gs":
		return "gcp"
	case "azure":
		return "azure"
	}
	return "aws"
}

func (c writerConfig) render() string {
	var b strings.Builder
	section := func(name string) { fmt.Fprintf(&b, "\n[%s]\n", name) }
	str := func(key, value string) { fmt.Fprintf(&b, "%s = %s\n", key, quoteTOML(value)) }
	num := func(key string, value float64) {
		fmt.Fprintf(&b, "%s = %s\n", key, strconv.FormatFloat(value, 'f', -1, 64))
	}

	b.WriteString("# Written by the devbox-zerofs node plugin; rewritten on every stage.\n")
	section("cache")
	str("dir", c.CacheDir)
	num("disk_size_gb", c.Cache.DiskGB)
	if c.Cache.MemoryGB > 0 {
		num("memory_size_gb", c.Cache.MemoryGB)
	}
	section("storage")
	str("url", c.StorageURL)
	str("encryption_password", "${"+PasswordEnv+"}")
	section("servers.nbd")
	str("unix_socket", c.NBDSocket)
	section("servers.ninep")
	str("unix_socket", c.NinePSock)
	section("servers.rpc")
	str("unix_socket", c.RPCSocket)
	section("telemetry")
	b.WriteString("enabled = false\n")
	if len(c.Options) > 0 {
		section(c.Backend)
		keys := make([]string, 0, len(c.Options))
		for k := range c.Options {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			fmt.Fprintf(&b, "%s = %s\n", quoteTOML(k), quoteTOML(c.Options[k]))
		}
	}
	return b.String()
}

// quoteTOML writes a TOML basic string. Inputs are paths and URLs built from validated ids.
func quoteTOML(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range s {
		switch {
		case r == '"' || r == '\\':
			b.WriteByte('\\')
			b.WriteRune(r)
		case r < 0x20 || r == 0x7f:
			fmt.Fprintf(&b, `\u%04X`, r)
		default:
			b.WriteRune(r)
		}
	}
	b.WriteByte('"')
	return b.String()
}
