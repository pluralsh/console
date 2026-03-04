package info

func (x *AgentDescriptor) SupportsServiceAndMethod(service, method string) bool {
	for _, s := range x.GetServices() {
		if s.Name != service {
			continue
		}
		// Service found, looking for method.
		for _, m := range s.Methods {
			if m.Name == method {
				return true
			}
		}
		break // service checked, no need to continue
	}
	return false
}
