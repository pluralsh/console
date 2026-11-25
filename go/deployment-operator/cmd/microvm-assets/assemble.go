// Derived from cmd/ate-setup/internal/steps/microvm.go in github.com/agent-substrate/substrate (v1.0.0),
// Copyright 2026 The Agent Substrate Authors, licensed under the Apache License, Version 2.0.
// The download and extraction are kept as upstream has them; only the staging target differs.

package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	iofs "io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/klauspost/compress/zstd"
	"github.com/pluralsh/console/go/polly/fs"
	"k8s.io/klog/v2"
)

const (
	// Keep at Kata 4.1.0 or later: earlier virtiofsd builds hang Cloud Hypervisor's snapshot restore.
	defaultKataVersion            = "4.3.1"
	defaultCloudHypervisorVersion = "v53.0"
	defaultReleaseBaseURL         = "https://github.com"

	kataSharePrefix      = "opt/kata/share/kata-containers/"
	kataKernelSymlink    = "opt/kata/share/kata-containers/vmlinux.container"
	kataRootfsSymlink    = "opt/kata/share/kata-containers/kata-containers.img"
	kataLibexecVirtiofsd = "opt/kata/libexec/virtiofsd"

	maxAssetBytes int64 = 8 << 30
)

func cloudHypervisorAssetName(arch string) (string, error) {
	switch arch {
	case "arm64":
		return "cloud-hypervisor-static-aarch64", nil
	case "amd64":
		return "cloud-hypervisor-static", nil
	default:
		return "", fmt.Errorf("unsupported arch %q", arch)
	}
}

// assemble downloads the Kata static release and Cloud Hypervisor for arch into outDir, leaving the four files of
// assetFiles there.
func assemble(ctx context.Context, releaseBaseURL, outDir, arch, kataVer, chVer string) error {
	chAsset, err := cloudHypervisorAssetName(arch)
	if err != nil {
		return err
	}
	workDir, err := os.MkdirTemp(outDir, ".assemble-*")
	if err != nil {
		return fmt.Errorf("creating temporary directory in %s: %w", outDir, err)
	}
	defer os.RemoveAll(workDir)

	baseURL := strings.TrimSuffix(releaseBaseURL, "/")
	kataURL := fmt.Sprintf("%s/kata-containers/kata-containers/releases/download/%s/kata-static-%s-%s.tar.zst",
		baseURL, kataVer, kataVer, arch)
	klog.Infof("downloading kata-static %s (%s)", kataVer, arch)
	if err := downloadAndExtractKataAssets(ctx, kataURL, workDir, outDir); err != nil {
		return err
	}

	chURL := fmt.Sprintf("%s/cloud-hypervisor/cloud-hypervisor/releases/download/%s/%s", baseURL, chVer, chAsset)
	klog.Infof("downloading cloud-hypervisor %s (%s)", chVer, chAsset)
	chTmp := filepath.Join(workDir, "cloud-hypervisor")
	if err := downloadToFile(ctx, chURL, chTmp, 0o755); err != nil {
		return err
	}
	if err := os.Rename(chTmp, filepath.Join(outDir, "cloud-hypervisor")); err != nil {
		return err
	}

	for _, f := range assetFiles {
		if fi, err := os.Stat(filepath.Join(outDir, f)); err != nil || !fi.Mode().IsRegular() {
			return fmt.Errorf("missing asset %s/%s", outDir, f)
		}
	}
	return nil
}

func downloadAndExtractKataAssets(ctx context.Context, kataURL, workDir, outDir string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, kataURL, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("downloading %s: %w", kataURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("downloading %s: unexpected HTTP status %s", kataURL, resp.Status)
	}

	zr, err := zstd.NewReader(bufio.NewReader(resp.Body))
	if err != nil {
		return fmt.Errorf("creating zstd reader: %w", err)
	}
	defer zr.Close()

	// Cap the decompressed size; a truncated tar fails extraction.
	err = fs.UntarStream(workDir, io.LimitReader(zr, maxAssetBytes),
		fs.WithTarSymlinks(),
		fs.WithTarFilter(func(name string) bool {
			return strings.HasPrefix(name, kataSharePrefix) || name == kataLibexecVirtiofsd
		}))
	if err != nil {
		return fmt.Errorf("extracting %s: %w", kataURL, err)
	}

	root, err := filepath.EvalSymlinks(workDir)
	if err != nil {
		return err
	}
	for _, item := range []struct {
		archivePath string
		outName     string
		mode        iofs.FileMode
	}{
		{archivePath: kataKernelSymlink, outName: "vmlinux", mode: 0o644},
		// rootfs.img is attached over virtio-pmem and mounted with DAX, so it must be a multiple of 2 MiB with a
		// page-aligned partition and filesystem block size. kata-containers.img is built for this.
		{archivePath: kataRootfsSymlink, outName: "rootfs.img", mode: 0o644},
		{archivePath: kataLibexecVirtiofsd, outName: "virtiofsd", mode: 0o755},
	} {
		src, err := filepath.EvalSymlinks(filepath.Join(workDir, filepath.FromSlash(item.archivePath)))
		if err != nil {
			return fmt.Errorf("resolving %s in kata archive: %w", item.archivePath, err)
		}
		if rel, err := filepath.Rel(root, src); err != nil || !filepath.IsLocal(rel) {
			return fmt.Errorf("resolving %s in kata archive: points outside the archive", item.archivePath)
		}
		if fi, err := os.Stat(src); err != nil || !fi.Mode().IsRegular() {
			return fmt.Errorf("resolving %s in kata archive: %s is not a regular file", item.archivePath, src)
		}
		if err := os.Chmod(src, item.mode); err != nil {
			return err
		}
		if err := os.Rename(src, filepath.Join(outDir, item.outName)); err != nil {
			return err
		}
	}
	return nil
}

func writeStreamToFile(dstPath string, mode iofs.FileMode, r io.Reader) error {
	if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
		return err
	}
	f, err := os.OpenFile(dstPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	n, err := io.Copy(f, io.LimitReader(r, maxAssetBytes+1))
	closeErr := f.Close()
	if err != nil {
		return err
	}
	if n > maxAssetBytes {
		return fmt.Errorf("extracted file exceeds %d-byte limit", maxAssetBytes)
	}
	return closeErr
}

func downloadToFile(ctx context.Context, url, dstPath string, mode iofs.FileMode) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("downloading %s: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("downloading %s: unexpected HTTP status %s", url, resp.Status)
	}
	return writeStreamToFile(dstPath, mode, resp.Body)
}
