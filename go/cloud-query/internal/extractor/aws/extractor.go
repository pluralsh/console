package aws

import (
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
)

// resources define the mapping of AWS resources to their respective representations.
var resources = map[string]extractor.ResourceFactory{
	"aws_vpc":                    extractor.NewResource[VPC],
	"aws_vpc_subnet":             extractor.NewResource[VPCSubnet],
	"aws_vpc_peering_connection": extractor.NewResource[VPCPeeringConnection],
	"aws_eks_addon":              extractor.NewResource[EKSAddon],
	"aws_eks_cluster":            extractor.NewResource[EKSCluster],
	"aws_eks_node_group":         extractor.NewResource[EKSNodeGroup],
	"aws_ec2_instance":           extractor.NewResource[EC2Instance],
	"aws_s3_bucket":              extractor.NewResource[S3Bucket],
}

// NewAWSExtractor creates a new AWS extractor with the given sink.
func NewAWSExtractor(sink extractor.Sink) extractor.Extractor {
	return extractor.NewDefaultExtractor(sink, resources)
}
