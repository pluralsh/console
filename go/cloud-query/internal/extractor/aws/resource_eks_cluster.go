package aws

type EKSCluster struct {
	ARN                string              `json:"arn"`
	Name               string              `json:"name"`
	ResourcesVPCConfig EKSClusterVPCConfig `json:"resources_vpc_config"`
}

type EKSClusterVPCConfig struct {
	SubnetIDs []string `json:"SubnetIds"`
	VPCID     string   `json:"VpcId"`
}

func (in EKSCluster) ID() string {
	return in.ARN
}

func (in EKSCluster) ShortID() string {
	return in.Name
}

func (in EKSCluster) Links(lookup map[string]string) []string {
	links := make([]string, 0, len(in.ResourcesVPCConfig.SubnetIDs)+1)

	if len(in.ResourcesVPCConfig.SubnetIDs) > 0 {
		for _, subnetID := range in.ResourcesVPCConfig.SubnetIDs {
			if id, ok := lookup[subnetID]; ok {
				links = append(links, id)
			}
		}
	}

	if vpcID, ok := lookup[in.ResourcesVPCConfig.VPCID]; ok {
		links = append(links, vpcID)
	}

	return links
}
