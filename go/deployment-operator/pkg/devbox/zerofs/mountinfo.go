package zerofs

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

type mountEntry struct {
	point  string
	fsType string
	source string
}

func readMountinfo(path string) ([]mountEntry, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return parseMountinfo(f)
}

// mountAt is the last mount listed at point, the one a path lookup sees.
func mountAt(mountinfo, point string) (mountEntry, bool, error) {
	entries, err := readMountinfo(mountinfo)
	if err != nil {
		return mountEntry{}, false, err
	}
	var found mountEntry
	ok := false
	for _, e := range entries {
		if e.point == point {
			found, ok = e, true
		}
	}
	return found, ok, nil
}

// parseMountinfo reads the format proc(5) documents:
//
//	36 35 98:0 /mnt1 /mnt2 rw,noatime master:1 - ext3 /dev/root rw,errors=continue
//
// where the fifth field is the mount point and the two after the "-" separator are the type and the source.
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
		e := mountEntry{point: unescapeOctal(fields[4]), fsType: fields[sep+1]}
		if sep+2 < len(fields) {
			e.source = unescapeOctal(fields[sep+2])
		}
		entries = append(entries, e)
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
