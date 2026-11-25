package terminal

import (
	"fmt"
	"os"
)

func procCwd(pid int) string {
	dir, err := os.Readlink(fmt.Sprintf("/proc/%d/cwd", pid))
	if err != nil {
		return ""
	}
	return dir
}
