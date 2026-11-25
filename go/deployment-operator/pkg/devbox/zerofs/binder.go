package zerofs

// HostBinder bind-mounts staged volumes into actors on this node.
type HostBinder struct {
	Mountinfo string
}

func (b HostBinder) Bind(source, target string, readOnly bool) error {
	return bindMount(source, target, readOnly)
}

// Unmount is idempotent: a target that isn't mounted is already done.
func (b HostBinder) Unmount(target string) error {
	if ok, err := b.Mounted(target); err != nil || !ok {
		return err
	}
	return unmount(target)
}

func (b HostBinder) Mounted(path string) (bool, error) {
	_, ok, err := mountAt(b.Mountinfo, path)
	return ok, err
}
