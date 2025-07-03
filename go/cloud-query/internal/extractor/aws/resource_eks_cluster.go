package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type EKSCluster struct {
	extractor.UnlinkedResource

	ARN string `json:"arn"`
}

func (in EKSCluster) ID() string {
	return in.ARN
}
