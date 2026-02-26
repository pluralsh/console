package rpc

import (
	"google.golang.org/grpc/metadata"

	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
)

func (x *RequestInfo) Metadata() metadata.MD {
	return grpctool.ValuesMapToMeta(x.Meta)
}

func (x *Header) Metadata() metadata.MD {
	return grpctool.ValuesMapToMeta(x.Meta)
}

func (x *Trailer) Metadata() metadata.MD {
	return grpctool.ValuesMapToMeta(x.Meta)
}
