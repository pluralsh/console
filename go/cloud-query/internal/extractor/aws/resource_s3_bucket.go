package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

type S3Bucket struct {
	extractor.UnlinkedResource

	ARN  string `json:"arn"`
	Name string `json:"name"`
}

func (in S3Bucket) ID() string {
	return in.ARN
}

func (in S3Bucket) ShortID() string {
	return in.Name
}
