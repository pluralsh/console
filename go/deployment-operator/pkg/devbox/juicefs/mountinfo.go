package juicefs

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

// FSType is the type JuiceFS mounts show in /proc/self/mountinfo.
const FSType = "fuse.juicefs"

type mountEntry struct {
	point  string
	fsType string
}

func readMountinfo(path string) ([]mountEntry, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return parseMountinfo(f)
}

// parseMountinfo reads the format proc(5) documents:
//
//	36 35 98:0 /mnt1 /mnt2 rw,noatime master:1 - ext3 /dev/root rw,errors=continue
//
// where the fifth field is the mount point and the field after the "-" separator is the filesystem type.
func parseMountinfo(r io.Reader) ([]mountEntry, error) {
	var entries []mountEntry
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		sep := -1
		for i := 6; i < len(fields); i++ {
			if fields[i] == "-" {
				sep = i
				break
			}
		}
		if len(fields) < 5 || sep < 0 || sep+1 >= len(fields) {
			return nil, fmt.Errorf("malformed mountinfo line %q", scanner.Text())
		}
		entries = append(entries, mountEntry{point: unescapeOctal(fields[4]), fsType: fields[sep+1]})
	}
	return entries, scanner.Err()
}

// unescapeOctal undoes the \ooo escaping the kernel applies to spaces, tabs, newlines and backslashes.
func unescapeOctal(s string) string {
	if !strings.Contains(s, `\`) {
		return s
	}
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] == '\\' && i+4 <= len(s) {
			if n, err := strconv.ParseUint(s[i+1:i+4], 8, 8); err == nil {
				b.WriteByte(byte(n))
				i += 3
				continue
			}
		}
		b.WriteByte(s[i])
	}
	return b.String()
}
