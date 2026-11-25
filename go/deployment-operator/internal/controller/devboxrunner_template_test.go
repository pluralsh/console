package controller

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
)

const (
	testEnvImage = "ghcr.io/acme/env@sha256:1111"
	testRuntimeA = "ghcr.io/pluralsh/devbox-runtime-core@sha256:aaaa"
	testRuntimeB = "ghcr.io/pluralsh/devbox-runtime-core@sha256:bbbb"
)

func templateRunner() *v1alpha1.DevboxRunner {
	return &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "platform", UID: types.UID("0a1b2c3d-0000")}}
}

func TestDevboxActorTemplateContainers(t *testing.T) {
	g := NewWithT(t)
	r := &DevboxRunnerReconciler{}

	tmpl, _, err := r.buildActorTemplate(templateRunner(), "space", testEnvImage, testRuntimeA)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(tmpl.Containers).To(HaveLen(2))

	// Order is load-bearing: gVisor files the home volume's checkpoint under the first container mounting it.
	devbox, runtime := tmpl.Containers[0], tmpl.Containers[1]
	g.Expect(devbox.Name).To(Equal("devbox"))
	g.Expect(devbox.Image).To(Equal(testEnvImage))
	id := runtimemanifest.InstallID("sha256:aaaa", nil, false)
	g.Expect(devbox.Command).To(Equal([]string{"/bin/sh", "-c", devboxWaitAndExec, "devbox-runtime", id, "/home/dev/.plural-runtime", runtimemanifest.InstallDirName(id)}))
	g.Expect(devbox.Args).To(BeEmpty())
	g.Expect(devbox.WakeupProbe).NotTo(BeNil())
	g.Expect(devbox.VolumeMounts[0].Name).To(Equal("home"))
	g.Expect(devbox.VolumeMounts[0].MountPath).To(Equal("/home/dev"))

	g.Expect(runtime.Name).To(Equal("plural-runtime"))
	g.Expect(runtime.Image).To(Equal(testRuntimeA))
	g.Expect(runtime.Command).To(BeEmpty(), "the image's installer entrypoint runs")
	g.Expect(runtime.Args).To(Equal([]string{"--digest", "sha256:aaaa", "--dst", "/mnt/home/.plural-runtime", "--agents", ""}))
	g.Expect(runtime.WakeupProbe).To(BeNil())
	g.Expect(runtime.VolumeMounts).To(HaveLen(1))
	g.Expect(runtime.VolumeMounts[0].Name).To(Equal("home"))
	g.Expect(runtime.VolumeMounts[0].MountPath).To(Equal("/mnt/home"))
	g.Expect(runtime.SecurityContext.Capabilities.Add).To(ConsistOf("DAC_OVERRIDE", "FOWNER"))

	// The runner's agents and browser pick what the sidecar installs.
	runner := templateRunner()
	runner.Spec.Agents = []v1alpha1.DevboxAgent{{Type: v1alpha1.DevboxAgentClaude, Default: lo.ToPtr(true)}, {Type: v1alpha1.DevboxAgentPi}}
	runner.Spec.Browser = &v1alpha1.DevboxBrowser{Enabled: true}
	withAgents, hashAgents, err := r.buildActorTemplate(runner, "space", testEnvImage, testRuntimeA)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(withAgents.Containers[1].Args).To(Equal([]string{"--digest", "sha256:aaaa", "--dst", "/mnt/home/.plural-runtime", "--agents", "claude,pi", "--browser"}))
	// The devbox container waits for the install of exactly these agents, which the sidecar names the same way.
	g.Expect(withAgents.Containers[0].Command[4]).To(Equal(runtimemanifest.InstallID("sha256:aaaa", []string{"claude", "pi"}, true)))
	_, hashNone, err := r.buildActorTemplate(templateRunner(), "space", testEnvImage, testRuntimeA)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(hashAgents).NotTo(Equal(hashNone), "other agents are another revision")

	runner = templateRunner()
	runner.Spec.Runtime = &v1alpha1.DevboxRuntime{Shell: lo.ToPtr("/busybox/sh")}
	tmpl, _, err = r.buildActorTemplate(runner, "space", testEnvImage, testRuntimeA)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(tmpl.Containers[0].Command[0]).To(Equal("/busybox/sh"))

	_, _, err = r.buildActorTemplate(templateRunner(), "space", testEnvImage, "ghcr.io/pluralsh/devbox-runtime-core:0.12.0")
	g.Expect(err).To(MatchError(ContainSubstring("not pinned by digest")))
}

// Substrate only repoints an actor to a template with the same volumes and the same mounts on the containers
// it already has, so a new daemon may change nothing but images, commands and arguments.
func TestDevboxActorTemplateAcrossRuntimes(t *testing.T) {
	g := NewWithT(t)
	r := &DevboxRunnerReconciler{}

	a, hashA, err := r.buildActorTemplate(templateRunner(), "space", testEnvImage, testRuntimeA)
	g.Expect(err).NotTo(HaveOccurred())
	again, hashAgain, err := r.buildActorTemplate(templateRunner(), "space", testEnvImage, testRuntimeA)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(hashAgain).To(Equal(hashA), "the same digests are the same revision")
	g.Expect(again.Containers[0].Command).To(Equal(a.Containers[0].Command))

	b, hashB, err := r.buildActorTemplate(templateRunner(), "space", testEnvImage, testRuntimeB)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(hashB).NotTo(Equal(hashA), "a new runtime digest is a new revision")

	_, hashEnv, err := r.buildActorTemplate(templateRunner(), "space", "ghcr.io/acme/env@sha256:2222", testRuntimeA)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(hashEnv).NotTo(Equal(hashA), "a new environment digest is a new revision")

	g.Expect(b.Volumes).To(Equal(a.Volumes))
	g.Expect(b.Containers).To(HaveLen(len(a.Containers)))
	for i := range a.Containers {
		g.Expect(b.Containers[i].Name).To(Equal(a.Containers[i].Name))
		g.Expect(b.Containers[i].VolumeMounts).To(Equal(a.Containers[i].VolumeMounts))
	}
}

// The devbox container's command, run by a real POSIX shell against a fake home volume.
func TestDevboxWaitAndExec(t *testing.T) {
	sh, err := exec.LookPath("sh")
	if err != nil {
		t.Skip("no sh on PATH")
	}
	digest := runtimemanifest.InstallID("sha256:aaaa", []string{"claude"}, false)

	setup := func(t *testing.T) (root string, run func() *exec.Cmd) {
		root = filepath.Join(t.TempDir(), ".plural-runtime")
		bin := filepath.Join(root, runtimemanifest.InstallDirName(digest), "bin")
		NewWithT(t).Expect(os.MkdirAll(bin, 0o755)).To(Succeed())
		NewWithT(t).Expect(os.WriteFile(filepath.Join(bin, "devbox-daemon"), []byte("#!/bin/sh\necho daemon started as $0 in $DEVBOX_RUNTIME_DIR\n"), 0o755)).To(Succeed())
		return root, func() *exec.Cmd {
			return exec.Command(sh, "-c", devboxWaitAndExec, "devbox-runtime", digest, root, runtimemanifest.InstallDirName(digest))
		}
	}

	t.Run("execs the daemon once the marker names the digest", func(t *testing.T) {
		g := NewWithT(t)
		root, run := setup(t)
		g.Expect(os.WriteFile(filepath.Join(root, "ready"), []byte(digest+"\n"), 0o644)).To(Succeed())
		out, err := run().CombinedOutput()
		g.Expect(err).NotTo(HaveOccurred(), string(out))
		g.Expect(string(out)).To(ContainSubstring("daemon started as " + filepath.Join(root, runtimemanifest.InstallDirName(digest), "bin", "devbox-daemon") +
			" in " + filepath.Join(root, runtimemanifest.InstallDirName(digest))))
	})

	// After an update the home volume still holds the previous runtime's marker until the sidecar replaces it.
	t.Run("waits while the marker is missing or names another runtime", func(t *testing.T) {
		g := NewWithT(t)
		root, run := setup(t)
		g.Expect(os.WriteFile(filepath.Join(root, "ready"), []byte("sha256:old\n"), 0o644)).To(Succeed())
		cmd := run()
		var out strings.Builder
		cmd.Stdout, cmd.Stderr = &out, &out
		g.Expect(cmd.Start()).To(Succeed())
		done := make(chan error, 1)
		go func() { done <- cmd.Wait() }()

		select {
		case err := <-done:
			t.Fatalf("exited before the marker matched: %v: %s", err, out.String())
		case <-time.After(700 * time.Millisecond):
		}
		g.Expect(os.Remove(filepath.Join(root, "ready"))).To(Succeed())
		select {
		case err := <-done:
			t.Fatalf("exited without a marker: %v: %s", err, out.String())
		case <-time.After(500 * time.Millisecond):
		}

		tmp := filepath.Join(root, "ready.tmp")
		g.Expect(os.WriteFile(tmp, []byte(digest+"\n"), 0o644)).To(Succeed())
		g.Expect(os.Rename(tmp, filepath.Join(root, "ready"))).To(Succeed())
		select {
		case err := <-done:
			g.Expect(err).NotTo(HaveOccurred(), out.String())
			g.Expect(out.String()).To(ContainSubstring("daemon started"))
		case <-time.After(10 * time.Second):
			_ = cmd.Process.Kill()
			t.Fatal("did not exec the daemon after the marker matched")
		}
	})
}

func TestGoldenFailureHint(t *testing.T) {
	g := NewWithT(t)
	runner := templateRunner()
	g.Expect(goldenFailureHint(runner, `exec: "/bin/sh": stat /bin/sh: no such file or directory`)).To(ContainSubstring("spec.runtime.shell"))
	// What Substrate v1.0.0 with gVisor actually reports for a missing shell (kind e2e, 2026-11-24).
	g.Expect(goldenFailureHint(runner, "GoldenActorCrashed: golden actor crashed before its snapshot was taken: resume failed: atelet Run: while calling worker RunWorkload: rpc error: code = Internal desc = while starting \"devbox\" application container: while running `runsc start`: exit status 128")).
		To(ContainSubstring("no POSIX shell at /bin/sh"))
	g.Expect(goldenFailureHint(runner, "exited with code 1: plural runtime sha256:aaaa was not installed in /home/dev/.plural-runtime")).To(ContainSubstring("plural-runtime container"))
	g.Expect(goldenFailureHint(runner, "exited with code 137")).To(BeEmpty())
}
