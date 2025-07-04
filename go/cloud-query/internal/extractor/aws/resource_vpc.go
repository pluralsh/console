package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type VPC struct {
	extractor.UnlinkedResource

	ARN   string `json:"arn"`
	VPCID string `json:"vpc_id"`
}

func (in VPC) ID() string {
	return in.ARN
}

func (in VPC) ShortID() string {
	return in.VPCID
}
