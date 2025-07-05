package aws

type VPCSubnet struct {
	ARN      string `json:"subnet_arn"`
	VPCID    string `json:"vpc_id"`
	SubnetID string `json:"subnet_id"`
}

func (in VPCSubnet) ID() string {
	return in.ARN
}

func (in VPCSubnet) ShortID() string {
	return in.SubnetID
}

func (in VPCSubnet) Links(lookup map[string]string) []string {
	links := make([]string, 0, 1)
	if vpcID, ok := lookup[in.VPCID]; ok {
		links = append(links, vpcID)
	}

	return links
}
