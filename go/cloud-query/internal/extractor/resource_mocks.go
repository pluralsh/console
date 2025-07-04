package extractor

// MockResource is a placeholder for a resource that can be used in tests.
type MockResource struct {
}

func (in MockResource) ID() string {
	return "mock-resource"
}

func (in MockResource) Links(_ map[string]string) []string {
	return []string{}
}

// UnlinkedResource is a placeholder for resources that do not have any links.
type UnlinkedResource struct {
}

func (in UnlinkedResource) Links(_ map[string]string) []string {
	return []string{}
}
