package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type S3Bucket struct {
	extractor.UnlinkedResource

	ARN string `json:"arn"`
}

func (in S3Bucket) ID() string {
	return in.ARN
}
