package insights

// Priority scores. A root failure is scored as criticality + severity and bucketed with the
// thresholds below.
//
// There are two classes of objects. Core components of the cluster start at ScoreCore, which is
// HIGH: a partial failure stays HIGH and only a failure that takes most of the component down
// (SeverityMax lifts it past ThresholdCritical) is CRITICAL. Everything else is an app, it starts
// at ScoreLow or ScoreMedium and is capped below ThresholdHigh, so a third-party workload can
// never be more than MEDIUM on its own. Users raise their own apps with the priority annotation
// or a CustomInsightPriority script, which do not go through that cap.
const (
	ScoreLow    = 10
	ScoreMedium = 35
	ScoreCore   = 60

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
	{name: "dns", score: ScoreCore, keys: []string{"coredns", "kubedns"}},
	{name: "kube-proxy", score: ScoreCore, keys: []string{"kubeproxy"}},
	{name: "cni", score: ScoreCore, keys: []string{
		"awsnode", "amazonvpccni", "awscni", "cilium", "calico", "calicotypha", "flannel", "kubeflannel", "canal", "antrea", "weavenet",
	}},
	{name: "csi", score: ScoreCore, keys: []string{
		"csinode", "csicontroller", "ebscsi", "efscsi", "gcepdcsi", "azurediskcsi", "azurefilecsi",
	}},
	{name: "service mesh", score: ScoreCore, keys: []string{"istiod", "istio", "linkerd"}},
	{name: "cert-manager", score: ScoreCore, keys: []string{"certmanager"}},
	{name: "ingress controller", score: ScoreCore, keys: []string{
		"ingressnginx", "nginxingress", "traefik", "haproxyingress", "contour", "emissaryingress", "ambassador", "envoygateway",
	}},
	{name: "metrics-server", score: ScoreCore, keys: []string{"metricsserver"}},
	{name: "autoscaler", score: ScoreCore, keys: []string{"clusterautoscaler", "karpenter"}},
}

// namespaceTiers hold the namespaces of core components by their separator-less, lowercase token runs.
var namespaceTiers = map[string]int{
	"kubesystem":     ScoreCore,
	"istiosystem":    ScoreCore,
	"linkerd":        ScoreCore,
	"certmanager":    ScoreCore,
	"ingressnginx":   ScoreCore,
	"traefik":        ScoreCore,
	"calicosystem":   ScoreCore,
	"tigeraoperator": ScoreCore,
	"cilium":         ScoreCore,

	// Plural itself: the Console and the agent that reports every cluster
	"plrlconsole":        ScoreCore,
	"plrldeployoperator": ScoreCore,
}

// kindScores are the criticality of a failing root when nothing more specific applies. Only a node
// is core by kind, every workload and its Ingress or Certificate is an app unless it is classified
// as core by name, namespace or priority class.
var kindScores = map[string]int{
	kindStatefulSet:         ScoreLow,
	kindDaemonSet:           ScoreLow,
	kindDeployment:          ScoreLow,
	"Ingress":               ScoreMedium,
	"Certificate":           ScoreMedium,
	"Node":                  ScoreCore,
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
