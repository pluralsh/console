package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type VPC struct {
	extractor.UnlinkedResource

	ARN string `json:"arn"`
}

func (in VPC) ID() string {
	return in.ARN
}
