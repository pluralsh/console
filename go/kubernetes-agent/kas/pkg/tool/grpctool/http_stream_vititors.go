package grpctool

import (
	"google.golang.org/protobuf/reflect/protoreflect"
)

const (
	HttpRequestHeaderFieldNumber      protoreflect.FieldNumber = 1
	HttpRequestDataFieldNumber        protoreflect.FieldNumber = 2
	HttpRequestTrailerFieldNumber     protoreflect.FieldNumber = 3
	HttpRequestUpgradeDataFieldNumber protoreflect.FieldNumber = 4

	HttpResponseHeaderFieldNumber      protoreflect.FieldNumber = 1
	HttpResponseDataFieldNumber        protoreflect.FieldNumber = 2
	HttpResponseTrailerFieldNumber     protoreflect.FieldNumber = 3
	HttpResponseUpgradeDataFieldNumber protoreflect.FieldNumber = 4
)

var (
	HttpRequestStreamVisitor  = NewLazyStreamVisitor(&HttpRequest{})
	HttpResponseStreamVisitor = NewLazyStreamVisitor(&HttpResponse{})
)
