package grpctool

// IsRequestWithoutBody returns if the request the header belongs to is expected to have no body
func (x *HttpRequest_Header) IsRequestWithoutBody() bool {
	return x != nil && x.ContentLength != nil && *x.ContentLength == 0
}
