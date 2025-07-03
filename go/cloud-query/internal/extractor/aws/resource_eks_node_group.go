package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type EKSNodeGroup struct {
	extractor.UnlinkedResource

	ARN string `json:"arn"`
}

func (in EKSNodeGroup) ID() string {
	return in.ARN
}
