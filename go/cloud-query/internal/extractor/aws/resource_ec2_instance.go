package aws

type EC2Instance struct {
	ARN        string `json:"arn"`
	InstanceID string `json:"instance_id"`
	SubnetID   string `json:"subnet_id"`
	VPCID      string `json:"vpc_id"`
}

func (in EC2Instance) ID() string {
	return in.ARN
}

func (in EC2Instance) ShortID() string {
	return in.InstanceID
}

func (in EC2Instance) Links(lookup map[string]string) []string {
	links := make([]string, 0, 2)
	if subnetID, ok := lookup[in.SubnetID]; ok {
		links = append(links, subnetID)
	}

	if vpcID, ok := lookup[in.VPCID]; ok {
		links = append(links, vpcID)
	}

	return links
}
