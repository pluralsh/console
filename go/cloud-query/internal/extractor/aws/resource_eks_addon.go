package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type EKSAddon struct {
	extractor.UnlinkedResource

	ARN string `json:"arn"`
}

func (in EKSAddon) ID() string {
	return in.ARN
}
