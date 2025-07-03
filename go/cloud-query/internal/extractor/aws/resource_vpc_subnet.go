package aws

type VPCSubnet struct {
	ARN   string `json:"subnet_arn"`
	VPCID string `json:"vpc_id"`
}

func (in VPCSubnet) ID() string {
	return in.ARN
}

func (in VPCSubnet) Links() []string {
	return []string{in.VPCID}
}
