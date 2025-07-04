package aws

type EKSNodeGroup struct {
	ARN         string   `json:"arn"`
	ClusterName string   `json:"cluster_name"`
	SubnetIDs   []string `json:"subnets"`
}

func (in EKSNodeGroup) ID() string {
	return in.ARN
}

func (in EKSNodeGroup) ShortID() string {
	return arnToShortID(in.ARN)
}

func (in EKSNodeGroup) Links(lookup map[string]string) []string {
	links := make([]string, 0, len(in.SubnetIDs)+1)
	for _, subnetID := range in.SubnetIDs {
		if id, ok := lookup[subnetID]; ok {
			links = append(links, id)
		}
	}

	if cluster, ok := lookup[in.ClusterName]; ok {
		links = append(links, cluster)
	}

	return links
}
