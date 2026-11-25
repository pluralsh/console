// Command microvm-assets stages the sandbox binaries of Agent Substrate's microvm class (cloud-hypervisor, virtiofsd,
// the Kata guest kernel and rootfs) into an object store, at microvm-assets/<arch>/<sha256>. It is the cloud-agnostic
// counterpart of `ate-setup deploy sandboxconfig`, which can only stage to GCS (via gcloud) or the Kind rustfs.
//
// The pinned digests come from the SandboxConfig rendered by the agent-substrate chart, so what gets staged is
// exactly what atelet will fetch and verify. Objects that already exist are skipped, which makes the command
// idempotent and safe to run on every chart upgrade.
package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"gocloud.dev/blob"
	_ "gocloud.dev/blob/azureblob"
	_ "gocloud.dev/blob/gcsblob"
	_ "gocloud.dev/blob/s3blob"
	"k8s.io/klog/v2"
)

func main() {
	var (
		bucketURL    string
		configPath   string
		arches       string
		workDir      string
		kataVersion  string
		chVersion    string
		releasesBase string
		timeout      time.Duration
	)
	flag.StringVar(&bucketURL, "bucket-url", os.Getenv("ASSET_BUCKET_URL"), "gocloud.dev blob URL of the asset bucket, e.g. s3://bucket?region=us-east-1, gs://bucket or azblob://container")
	flag.StringVar(&configPath, "sandboxconfig", "/config/microvm.yaml", "the microvm SandboxConfig whose pinned sha256 digests are staged")
	flag.StringVar(&arches, "arches", "amd64", "comma-separated architectures to stage (amd64, arm64)")
	flag.StringVar(&workDir, "work-dir", os.TempDir(), "scratch directory, needs room for the Kata release (~1GiB)")
	flag.StringVar(&kataVersion, "kata-version", defaultKataVersion, "Kata Containers release the guest kernel, rootfs and virtiofsd are taken from")
	flag.StringVar(&chVersion, "cloud-hypervisor-version", defaultCloudHypervisorVersion, "Cloud Hypervisor release")
	flag.StringVar(&releasesBase, "release-base-url", defaultReleaseBaseURL, "where the GitHub releases are downloaded from, for mirrors")
	flag.DurationVar(&timeout, "timeout", 30*time.Minute, "overall deadline")
	klog.InitFlags(nil)
	flag.Parse()

	if bucketURL == "" {
		klog.Fatal("--bucket-url or ASSET_BUCKET_URL is required")
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	ctx, cancelTimeout := context.WithTimeout(ctx, timeout)
	defer cancelTimeout()

	digests, err := loadDigests(configPath)
	if err != nil {
		klog.Fatalf("loading pinned digests: %v", err)
	}

	bucket, err := blob.OpenBucket(ctx, bucketURL)
	if err != nil {
		klog.Fatalf("opening %s: %v", redact(bucketURL), err)
	}
	defer bucket.Close()

	s := &stager{
		bucket:       bucket,
		workDir:      workDir,
		kataVersion:  kataVersion,
		chVersion:    chVersion,
		releasesBase: releasesBase,
	}
	for _, arch := range strings.Split(arches, ",") {
		arch = strings.TrimSpace(arch)
		if arch == "" {
			continue
		}
		if err := s.stage(ctx, arch, digests[arch]); err != nil {
			klog.Fatalf("staging %s assets: %v", arch, err)
		}
	}
	klog.Info("microvm assets are staged")
}

// redact drops the query, which can carry credentials for some drivers.
func redact(u string) string {
	base, _, _ := strings.Cut(u, "?")
	return base
}
