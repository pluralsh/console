package aws

import (
	"strings"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

const (
	TableVPC                  extractor.Table = "aws_vpc"
	TableVPCSubnet            extractor.Table = "aws_vpc_subnet"
	TableVPCPeeringConnection extractor.Table = "aws_vpc_peering_connection"
	TableEKSAddon             extractor.Table = "aws_eks_addon"
	TableEKSCluster           extractor.Table = "aws_eks_cluster"
	TableEKSNodeGroup         extractor.Table = "aws_eks_node_group"
	TableEC2Instance          extractor.Table = "aws_ec2_instance"
	TableS3Bucket             extractor.Table = "aws_s3_bucket"
)

var (
	// resources define the mapping of AWS resources to their respective representations.
	resources = map[extractor.Table]extractor.ResourceFactory{
		TableVPC:                  extractor.NewResource[VPC],
		TableVPCSubnet:            extractor.NewResource[VPCSubnet],
		TableVPCPeeringConnection: extractor.NewResource[VPCPeeringConnection],
		TableEKSAddon:             extractor.NewResource[EKSAddon],
		TableEKSCluster:           extractor.NewResource[EKSCluster],
		TableEKSNodeGroup:         extractor.NewResource[EKSNodeGroup],
		TableEC2Instance:          extractor.NewResource[EC2Instance],
		TableS3Bucket:             extractor.NewResource[S3Bucket],
	}

	// processingOrder defines the order in which resources should be extracted.
	extractOrder = []extractor.Table{
		TableVPC,                  // Links: None
		TableVPCSubnet,            // Links: VPC
		TableVPCPeeringConnection, // Links: None,
		TableEKSCluster,           // Links: VPC, VPCSubnet
		TableEKSAddon,             // Links: EKSCluster
		TableEKSNodeGroup,         // Links: EKSCluster, VPCSubnet
		TableEC2Instance,          // Links: VPC, VPCSubnet
		TableS3Bucket,             // Links: None,
	}
)

func entries() []extractor.Entry {
	result := make([]extractor.Entry, 0, len(resources))
	for _, table := range extractOrder {
		factory, ok := resources[table]
		if !ok {
			klog.V(log.LogLevelDefault).InfoS("could not find resource factory for table", "table", table)
			continue
		}

		result = append(result, extractor.Entry{
			Table:   table,
			Factory: factory,
		})
	}

	return result
}

func arnToShortID(arn string) string {
	// AWS ARNs can be structured as:
	// - "arn:partition:service:region:account-id:resource-type/resource-id"
	// - "arn:partition:service:region:account-id:resource-type:resource-id"
	// - "arn:partition:service:region:account-id:resource-id"
	parts := lo.Ternary(strings.Contains(arn, "/"), strings.Split(arn, "/"), strings.Split(arn, ":"))
	if len(parts) < 2 {
		klog.V(log.LogLevelVerbose).ErrorS(nil, "invalid ARN format", "arn", arn)
		return ""
	}
	return parts[len(parts)-1]
}

// NewAWSExtractor creates a new AWS extractor with the given sink.
func NewAWSExtractor(sink extractor.Sink) extractor.Extractor {
	return extractor.NewDefaultExtractor(sink, entries())
}
