package insights

// Priority scores. A root failure is scored as criticality + severity and bucketed with the
// thresholds below. Criticality sits mid-bucket so that severity (a full outage adds up to
// SeverityMax) can lift a failure one bucket, but never two.
const (
	ScoreLow      = 10
	ScoreMedium   = 35
	ScoreHigh     = 60
	ScoreCritical = 85

	// ThresholdMedium, ThresholdHigh and ThresholdCritical are the lowest scores of their buckets.
	ThresholdMedium   = 25
	ThresholdHigh     = 50
	ThresholdCritical = 75

	// SeverityMax is the most the replica ratio can add to the criticality.
	SeverityMax = 20
)

// catalogEntry is a well-known cluster component whose failure has a cluster-wide blast radius.
type catalogEntry struct {
	name  string
	score int
	// keys are lowercase names without separators. A name matches when any contiguous run of its
	// tokens joined without separators equals a key.
	keys []string
}

var catalog = []catalogEntry{
	{name: "dns", score: ScoreCritical, keys: []string{"coredns", "kubedns"}},
	{name: "kube-proxy", score: ScoreCritical, keys: []string{"kubeproxy"}},
	{name: "cni", score: ScoreCritical, keys: []string{
		"awsnode", "amazonvpccni", "awscni", "cilium", "calico", "calicotypha", "flannel", "kubeflannel", "canal", "antrea", "weavenet",
	}},
	{name: "csi", score: ScoreCritical, keys: []string{
		"csinode", "csicontroller", "ebscsi", "efscsi", "gcepdcsi", "azurediskcsi", "azurefilecsi",
	}},
	{name: "service mesh", score: ScoreCritical, keys: []string{"istiod", "istio", "linkerd"}},
	{name: "cert-manager", score: ScoreCritical, keys: []string{"certmanager"}},
	{name: "ingress controller", score: ScoreCritical, keys: []string{
		"ingressnginx", "nginxingress", "traefik", "haproxyingress", "contour", "emissaryingress", "ambassador", "envoygateway",
	}},
	{name: "metrics-server", score: ScoreHigh, keys: []string{"metricsserver"}},
	{name: "node-exporter", score: ScoreHigh, keys: []string{"nodeexporter"}},
	{name: "autoscaler", score: ScoreHigh, keys: []string{"clusterautoscaler", "karpenter"}},
}

// namespaceTiers hold namespaces by their separator-less, lowercase token runs.
var namespaceTiers = map[string]int{
	"kubesystem":     ScoreHigh,
	"istiosystem":    ScoreCritical,
	"linkerd":        ScoreCritical,
	"certmanager":    ScoreCritical,
	"ingressnginx":   ScoreCritical,
	"traefik":        ScoreCritical,
	"calicosystem":   ScoreCritical,
	"tigeraoperator": ScoreCritical,
	"cilium":         ScoreCritical,
}

// kindScores are the criticality of a failing root when nothing more specific applies.
var kindScores = map[string]int{
	"StatefulSet":           ScoreHigh,
	"DaemonSet":             ScoreMedium,
	"Deployment":            ScoreLow,
	"Ingress":               ScoreCritical,
	"Certificate":           ScoreCritical,
	"Node":                  ScoreHigh,
	"PersistentVolumeClaim": ScoreMedium,
	"PersistentVolume":      ScoreMedium,
}

var catalogIndex map[string]catalogHit

type catalogHit struct {
	entry string
	score int
	key   string
}

func init() {
	catalogIndex = make(map[string]catalogHit)
	for _, e := range catalog {
		for _, k := range e.keys {
			catalogIndex[k] = catalogHit{entry: e.name, score: e.score, key: k}
		}
	}
}
