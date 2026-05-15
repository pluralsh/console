package metadata

import (
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func ExtractImagesFromResource(resource *unstructured.Unstructured) []string {
	if resource == nil {
		return nil
	}

	kind := strings.ToLower(resource.GetKind())
	var out []string

	switch kind {
	case "deployment", "statefulset", "daemonset", "replicaset":
		if found, imgs, err := extractImagesFromPath(resource, "spec", "template", "spec", "containers"); err == nil && found {
			out = append(out, imgs...)
		}

		if found, imgs, err := extractImagesFromPath(resource, "spec", "template", "spec", "initContainers"); err == nil && found {
			out = append(out, imgs...)
		}

	case "pod":
		if found, imgs, err := extractImagesFromPath(resource, "spec", "containers"); err == nil && found {
			out = append(out, imgs...)
		}

		if found, imgs, err := extractImagesFromPath(resource, "spec", "initContainers"); err == nil && found {
			out = append(out, imgs...)
		}
	}

	return out
}

func ExtractFqdnsFromResource(resource *unstructured.Unstructured) []string {
	if resource == nil {
		return nil
	}

	fqdns := newFQDNSet()

	switch strings.ToLower(resource.GetKind()) {
	case "ingress":
		extractIngressFQDNs(resource, fqdns.add)
	case "httproute", "grpcroute":
		extractHTTPRouteFQDNs(resource, fqdns.add)
	case "gateway":
		extractGatewayFQDNs(resource, fqdns.add)
	}

	return fqdns.result()
}

func extractImagesFromPath(resource *unstructured.Unstructured, path ...string) (found bool, images []string, err error) {
	slice, found, err := unstructured.NestedSlice(resource.Object, path...)
	if err != nil || !found {
		return found, nil, err
	}

	imgs := make([]string, 0, len(slice))
	for _, c := range slice {
		if m, ok := c.(map[string]interface{}); ok {
			if s, ok := m["image"].(string); ok && s != "" {
				imgs = append(imgs, s)
			}
		}
	}
	return true, imgs, nil
}

type fqdnSet struct {
	added map[string]struct{}
	out   []string
}

func newFQDNSet() *fqdnSet {
	return &fqdnSet{
		added: make(map[string]struct{}),
		out:   make([]string, 0),
	}
}

func (f *fqdnSet) add(s string) {
	if s == "" {
		return
	}
	if _, seen := f.added[s]; !seen {
		f.added[s] = struct{}{}
		f.out = append(f.out, s)
	}
}

func (f *fqdnSet) result() []string {
	return f.out
}

func extractIngressFQDNs(u *unstructured.Unstructured, add func(string)) {
	if rules, found, err := unstructured.NestedSlice(u.Object, "spec", "rules"); err == nil && found {
		for _, r := range rules {
			if m, ok := r.(map[string]interface{}); ok {
				if host, ok := m["host"].(string); ok {
					add(host)
				}
			}
		}
	}

	if tls, found, err := unstructured.NestedSlice(u.Object, "spec", "tls"); err == nil && found {
		for _, t := range tls {
			m, ok := t.(map[string]interface{})
			if !ok {
				continue
			}
			if hosts, ok := m["hosts"].([]interface{}); ok {
				for _, h := range hosts {
					if s, ok := h.(string); ok {
						add(s)
					}
				}
			}
		}
	}
}

func extractHTTPRouteFQDNs(u *unstructured.Unstructured, add func(string)) {
	if hn, found, err := unstructured.NestedSlice(u.Object, "spec", "hostnames"); err == nil && found {
		for _, h := range hn {
			if s, ok := h.(string); ok {
				add(s)
			}
		}
	}
}

func extractGatewayFQDNs(u *unstructured.Unstructured, add func(string)) {
	if listeners, found, err := unstructured.NestedSlice(u.Object, "spec", "listeners"); err == nil && found {
		for _, l := range listeners {
			if m, ok := l.(map[string]interface{}); ok {
				if s, ok := m["hostname"].(string); ok {
					add(s)
				}
			}
		}
	}
}
