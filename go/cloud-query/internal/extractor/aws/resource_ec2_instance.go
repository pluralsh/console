package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type EC2Instance struct {
	extractor.UnlinkedResource

	ARN string `json:"arn"`
}

func (in EC2Instance) ID() string {
	return in.ARN
}
