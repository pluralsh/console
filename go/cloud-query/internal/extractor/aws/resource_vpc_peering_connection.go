package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type VPCPeeringConnection struct {
	extractor.UnlinkedResource

	ARN string `json:"id"`
}

func (in VPCPeeringConnection) ID() string {
	return in.ARN
}

func (in VPCPeeringConnection) ShortID() string {
	return in.ARN
}
