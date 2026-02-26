package rpc

func (x *ImpersonationConfig) IsEmpty() bool {
	if x == nil {
		return true
	}
	return x.Username == "" && len(x.Groups) == 0 && x.Uid == ""
}
