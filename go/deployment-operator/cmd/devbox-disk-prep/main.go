// Command devbox-disk-prep runs as a privileged DaemonSet on devbox nodes. It formats the node's data disks (RAID0
// when there are several) as one XFS filesystem mounted at /var/lib/ate, then lifts the node's startup taint so
// atelet only starts once Substrate's state lives on the data disk.
package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/klog/v2"
)

func main() {
	cfg := config{}
	flag.StringVar(&cfg.nodeName, "node-name", os.Getenv("NODE_NAME"), "the node this pod runs on")
	flag.StringVar(&cfg.hostRoot, "host-root", "/host", "where the host's / is mounted, with Bidirectional propagation")
	flag.StringVar(&cfg.mountPath, "mount-path", "/var/lib/ate", "the host path the data disk is mounted at")
	flag.StringVar(&cfg.label, "label", "ate-data", "the filesystem label of the data disk")
	flag.StringVar(&cfg.diskModel, "disk-model", os.Getenv("DISK_MODEL"), "regex the model of claimable disks must match, empty claims none")
	flag.StringVar(&cfg.startupTaint, "startup-taint", "plural.sh/devbox-disk", "the taint key removed once the disk is mounted")
	flag.StringVar(&cfg.readyLabel, "ready-label", "plural.sh/devbox-disk-ready", "the node label set to true once the disk is mounted")
	flag.StringVar(&cfg.readyFile, "ready-file", "/tmp/ready", "touched after the first successful pass, for the readiness probe")
	flag.DurationVar(&cfg.interval, "interval", time.Minute, "how often the mount, taint and label are re-checked")
	klog.InitFlags(nil)
	flag.Parse()

	if cfg.nodeName == "" {
		klog.Fatal("--node-name or NODE_NAME is required")
	}

	restConfig, err := rest.InClusterConfig()
	if err != nil {
		klog.Fatalf("loading in-cluster config: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		klog.Fatalf("creating kubernetes client: %v", err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	p := &prep{config: cfg, exec: osExec{}, nodes: clientset.CoreV1().Nodes(), mountinfo: "/proc/self/mountinfo"}
	p.loop(ctx)
}
