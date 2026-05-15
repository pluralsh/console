package ping

import (
	"strings"

	console "github.com/pluralsh/console/go/client"
)

var (
	distroPriorities = map[console.ClusterDistro]int{
		console.ClusterDistroEks:       1,
		console.ClusterDistroAks:       2,
		console.ClusterDistroGke:       3,
		console.ClusterDistroRke:       4,
		console.ClusterDistroK3s:       5,
		console.ClusterDistroOpenshift: 6,
		console.ClusterDistroGeneric:   7,
	}
)

func findDistro(vals []string) console.ClusterDistro {
	currentDistro := console.ClusterDistroGeneric
	for _, v := range vals {
		if dist, ok := distro(v); ok {
			if distroPriorities[dist] <= distroPriorities[currentDistro] {
				currentDistro = dist
			}
		}
	}

	return currentDistro
}

func distro(val string) (console.ClusterDistro, bool) {
	if strings.Contains(val, "eks") {
		return console.ClusterDistroEks, true
	}

	if strings.Contains(val, "aks") || strings.Contains(val, "azure-cni") || strings.Contains(val, "azure-cns") {
		return console.ClusterDistroAks, true
	}

	if strings.Contains(val, "gke") {
		return console.ClusterDistroGke, true
	}

	if strings.Contains(val, "k3s") {
		return console.ClusterDistroK3s, true
	}

	if strings.Contains(val, "rke") {
		return console.ClusterDistroRke, true
	}

	return console.ClusterDistroGeneric, false
}
