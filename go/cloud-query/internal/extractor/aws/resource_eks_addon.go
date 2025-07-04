package aws

type EKSAddon struct {
	ARN         string `json:"arn"`
	ClusterName string `json:"cluster_name"`
}

func (in EKSAddon) ID() string {
	return in.ARN
}

func (in EKSAddon) ShortID() string {
	return arnToShortID(in.ARN)
}

func (in EKSAddon) Links(lookup map[string]string) []string {
	links := make([]string, 0, 1)
	if cluster, ok := lookup[in.ClusterName]; ok {
		links = append(links, cluster)
	}

	return links
}
