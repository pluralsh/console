package controller

import (
	"fmt"
	"os"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/deployment-operator/pkg/common"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
)

const (
	podDefaultContainerAnnotation = "kubectl.kubernetes.io/default-container"
	defaultContainer              = "default"
	defaultTmpVolumeName          = "default-tmp"
	defaultTmpVolumePath          = "/tmp"
	sharedContextVolumeName       = "shared-context"
	sharedContextVolumePath       = "/plural/shared" // Keep in sync with controller.go
	nonRootUID                    = int64(65532)
	nonRootGID                    = nonRootUID

	dindContainerName            = "dind"
	defaultContainerDinDImage    = "docker"
	defaultContainerDinDImageTag = "29.4.1-dind-rootless"
	dockerCertsVolumeName        = "docker-certs"
	dockerGraphVolumeName        = "docker-graph"
	tunDeviceVolumeName          = "tun-device"
	tunDevicePath                = "/dev/net/tun"
	dockerCertsPath              = "/certs"
	dockerDaemonPort             = 2376 // TLS port used by the entrypoint when DOCKER_TLS_CERTDIR is set
	dindRootlessUID              = int64(1000)
	dindRootlesskitNetEnvName    = "DOCKERD_ROOTLESS_ROOTLESSKIT_NET"
	dindRootlesskitNetValue      = "slirp4netns"
	dindTLSCertDirEnvName        = "DOCKER_TLS_CERTDIR"

	browserContainerName              = "browser"
	defaultContainerBrowser           = v1alpha1.BrowserChrome
	defaultContainerBrowserServerPort = 3000

	bootstrapScriptVolumeName   = "bootstrap-script"
	bootstrapScriptMountPath    = "/bootstrap/bootstrap.sh"
	bootstrapScriptConfigMapKey = "bootstrap.sh"

	gitSigningKeyVolumeName = "git-signing-key"
	gitSigningKeyMountPath  = common.GitSigningKeyMountPath
	gitSigningKeySecretKey  = "git-signing.key"
)

var dindClientEnvs = []corev1.EnvVar{
	{Name: "DOCKER_HOST", Value: fmt.Sprintf("tcp://localhost:%d", dockerDaemonPort)},
	{Name: "DOCKER_TLS_VERIFY", Value: "1"},
	{Name: "DOCKER_CERT_PATH", Value: dockerCertsPath + "/client"},
}

var (
	defaultTmpVolume = corev1.Volume{
		Name: defaultTmpVolumeName,
		VolumeSource: corev1.VolumeSource{
			EmptyDir: &corev1.EmptyDirVolumeSource{},
		},
	}

	defaultTmpContainerVolumeMount = corev1.VolumeMount{
		Name:      defaultTmpVolumeName,
		MountPath: defaultTmpVolumePath,
	}

	defaultContainerImage    = "ghcr.io/pluralsh/agent-harness"
	defaultContainerImageTag = "0.6.18"

	// Check .github/workflows/publish-agent-harness.yaml to see images being published.
	defaultContainerVersions = map[console.AgentRuntimeType]string{
		console.AgentRuntimeTypeClaude:   "%s-claude-2.1.72",
		console.AgentRuntimeTypeGemini:   "%s-gemini-0.6.1",
		console.AgentRuntimeTypeOpencode: "%s-opencode-1.2.24",
		console.AgentRuntimeTypeCodex:    "%s-codex-0.104.0",
	}

	languages = map[console.AgentRunLanguage]string{
		console.AgentRunLanguageGo:         "golang",
		console.AgentRunLanguageJava:       "java",
		console.AgentRunLanguageJavascript: "node",
		console.AgentRunLanguagePython:     "python",
	}

	defaultVersions = map[console.AgentRunLanguage]string{
		console.AgentRunLanguageGo:         "1.24",
		console.AgentRunLanguageJava:       "25",
		console.AgentRunLanguageJavascript: "24",
		console.AgentRunLanguagePython:     "3.14",
	}

	defaultBrowserImages = map[v1alpha1.Browser]string{
		v1alpha1.BrowserChrome:           "ghcr.io/browserless/chrome:v2.38.4",
		v1alpha1.BrowserChromium:         "ghcr.io/browserless/chromium:v2.38.4",
		v1alpha1.BrowserFirefox:          "ghcr.io/browserless/firefox:v2.38.4",
		v1alpha1.BrowserSeleniumChrome:   "selenium/standalone-chrome:144.0",
		v1alpha1.BrowserSeleniumChromium: "selenium/standalone-chromium:144.0",
		v1alpha1.BrowserSeleniumFirefox:  "selenium/standalone-firefox:147.0",
		v1alpha1.BrowserSeleniumEdge:     "selenium/standalone-edge:144.0",
		v1alpha1.BrowserPuppeteer:        "ghcr.io/browserless/chromium:v2.38.4",
	}
)

func init() {
	if os.Getenv("IMAGE_TAG") != "" {
		defaultContainerImageTag = os.Getenv("IMAGE_TAG")
	}
}

func buildAgentRunPod(run *v1alpha1.AgentRun, runtime *v1alpha1.AgentRuntime) *corev1.Pod {
	if runtime.Spec.Template == nil {
		runtime.Spec.Template = &corev1.PodTemplateSpec{}
	}
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:        run.Name,
			Namespace:   run.Namespace,
			Labels:      ensureDefaultLabels(runtime.Spec.Template.Labels, run),
			Annotations: ensureAnnotations(runtime.Spec.Template.Annotations),
		},
		Spec: runtime.Spec.Template.Spec,
	}

	pod.Spec.Containers = ensureDefaultContainer(pod.Spec.Containers, run, runtime)
	pod.Spec.RestartPolicy = corev1.RestartPolicyNever
	pod.Spec.Volumes = ensureDefaultVolumes(pod.Spec.Volumes)

	// Ensure automountServiceAccountToken is disabled by default for security
	if pod.Spec.AutomountServiceAccountToken == nil {
		pod.Spec.AutomountServiceAccountToken = lo.ToPtr(false)
	}

	if runtime.Spec.Dind != nil && *runtime.Spec.Dind {
		pod.Spec.SecurityContext = ensureDefaultPodSecurityContextWithDind(pod.Spec.SecurityContext)
		enableDind(pod)
	} else {
		pod.Spec.SecurityContext = ensureDefaultPodSecurityContext(pod.Spec.SecurityContext)
	}

	if runtime.Spec.Browser.IsEnabled() {
		enableBrowser(runtime.Spec.Browser, pod)
	}

	if runtime.Spec.BootstrapScript != nil && len(*runtime.Spec.BootstrapScript) > 0 {
		enableBootstrapScript(run.Name+"-bootstrap", pod)
	}

	if runtime.Spec.Git != nil && runtime.Spec.Git.SigningKeyRef != nil {
		enableGitSigningKey(run.Name, pod)
	}

	return pod
}

func ensureDefaultLabels(labels map[string]string, run *v1alpha1.AgentRun) map[string]string {
	if labels == nil {
		labels = map[string]string{}
	}

	// Add standard labels for agent runs
	labels["app.kubernetes.io/name"] = "agent-harness"
	labels["app.kubernetes.io/component"] = "agent-run"
	labels[v1alpha1.AgentRunIDLabel] = run.Status.GetID()

	return labels
}

func ensureAnnotations(annotations map[string]string) map[string]string {
	if annotations == nil {
		annotations = map[string]string{}
	}

	annotations[podDefaultContainerAnnotation] = defaultContainer

	return annotations
}

func ensureDefaultContainer(containers []corev1.Container, run *v1alpha1.AgentRun, runtime *v1alpha1.AgentRuntime) []corev1.Container {
	if index := algorithms.Index(containers, func(container corev1.Container) bool {
		return container.Name == defaultContainer
	}); index == -1 {
		containers = append(containers, getDefaultContainer(run, runtime))
	} else {
		if containers[index].Image == "" {
			containers[index].Image = getDefaultContainerImage(containers[index].Image, runtime.Spec.Type, run.Spec.Language, run.Spec.LanguageVersion)
		}

		containers[index].SecurityContext = ensureDefaultContainerSecurityContext(containers[index].SecurityContext)
		containers[index].EnvFrom = getDefaultContainerEnvFrom(run.Name)
		containers[index].VolumeMounts = ensureDefaultVolumeMounts(containers[index].VolumeMounts)
		containers[index].Env = ensureDefaultEnvVars(containers[index].Env, runtime)

		// Do not allow command to be overridden. Only args can be overridden.
		containers[index].Command = nil
	}

	return containers
}

func ensureDefaultVolumeMounts(mounts []corev1.VolumeMount) []corev1.VolumeMount {
	return append(
		algorithms.Filter(mounts, func(v corev1.VolumeMount) bool {
			return v.Name != defaultTmpVolumeName
		}),
		defaultTmpContainerVolumeMount,
		corev1.VolumeMount{
			Name:      sharedContextVolumeName,
			MountPath: sharedContextVolumePath,
		},
	)
}

func ensureDefaultVolumes(volumes []corev1.Volume) []corev1.Volume {
	return append(
		algorithms.Filter(volumes, func(v corev1.Volume) bool {
			return v.Name != defaultTmpVolumeName
		}),
		defaultTmpVolume,
		corev1.Volume{
			Name: sharedContextVolumeName,
			VolumeSource: corev1.VolumeSource{
				EmptyDir: &corev1.EmptyDirVolumeSource{},
			},
		},
	)
}

func ensureDefaultPodSecurityContext(psc *corev1.PodSecurityContext) *corev1.PodSecurityContext {
	if psc != nil {
		if psc.FSGroup == nil {
			psc.FSGroup = lo.ToPtr(nonRootGID)
		}
		return psc
	}

	return &corev1.PodSecurityContext{
		RunAsNonRoot: lo.ToPtr(true),
		RunAsUser:    lo.ToPtr(nonRootUID),
		RunAsGroup:   lo.ToPtr(nonRootGID),
		FSGroup:      lo.ToPtr(nonRootGID),
	}
}

func getDefaultContainer(run *v1alpha1.AgentRun, runtime *v1alpha1.AgentRuntime) corev1.Container {
	return corev1.Container{
		Name:            defaultContainer,
		Image:           getDefaultContainerImage("", runtime.Spec.Type, run.Spec.Language, run.Spec.LanguageVersion),
		VolumeMounts:    []corev1.VolumeMount{defaultTmpContainerVolumeMount},
		SecurityContext: ensureDefaultContainerSecurityContext(nil),
		EnvFrom:         getDefaultContainerEnvFrom(run.Name),
		Env:             getDefaultEnvVars(runtime),
	}
}

func getDefaultContainerImage(image string, agentRuntimeType console.AgentRuntimeType, language *console.AgentRunLanguage, version *string) string {
	if image != "" {
		return image
	}

	tag := fmt.Sprintf(defaultContainerVersions[agentRuntimeType], defaultContainerImageTag)

	// If the language name is recognized, append it to the tag along with the version (or default version).
	if lang, ok := languages[lo.FromPtr(language)]; ok {
		tag = fmt.Sprintf("%s-%s-%s", tag, lang,
			lo.Ternary(lo.IsEmpty(version), defaultVersions[lo.FromPtr(language)], lo.FromPtr(version)))
	}

	return fmt.Sprintf("%s:%s", common.GetConfigurationManager().SwapBaseRegistry(defaultContainerImage), tag)
}

func getDefaultContainerEnvFrom(secretName string) []corev1.EnvFromSource {
	return []corev1.EnvFromSource{{
		SecretRef: &corev1.SecretEnvSource{LocalObjectReference: corev1.LocalObjectReference{Name: secretName}},
	}}
}

func getDefaultEnvVars(runtime *v1alpha1.AgentRuntime) []corev1.EnvVar {
	envVars := []corev1.EnvVar{
		{Name: EnvDindEnabled, Value: fmt.Sprintf("%t", runtime.Spec.Dind != nil && *runtime.Spec.Dind)},
		{Name: EnvBrowserEnabled, Value: fmt.Sprintf("%t", runtime.Spec.Browser.IsEnabled())},
	}

	if runtime.Spec.Git != nil && runtime.Spec.Git.Proxy != nil {
		envVars = append(envVars, corev1.EnvVar{Name: EnvGitProxy, Value: *runtime.Spec.Git.Proxy})
	}

	return envVars
}

func ensureDefaultEnvVars(existing []corev1.EnvVar, runtime *v1alpha1.AgentRuntime) []corev1.EnvVar {
	defaultEnvs := getDefaultEnvVars(runtime)

	// Add default env vars if they don't already exist
	for _, defaultEnv := range defaultEnvs {
		found := false
		for _, existingEnv := range existing {
			if existingEnv.Name == defaultEnv.Name {
				found = true
				break
			}
		}
		if !found {
			existing = append(existing, defaultEnv)
		}
	}

	return existing
}

func ensureDefaultContainerSecurityContext(sc *corev1.SecurityContext) *corev1.SecurityContext {
	if sc != nil {
		return sc
	}

	return &corev1.SecurityContext{
		AllowPrivilegeEscalation: lo.ToPtr(false),
		ReadOnlyRootFilesystem:   lo.ToPtr(false),
		RunAsNonRoot:             lo.ToPtr(true),
		RunAsUser:                lo.ToPtr(nonRootUID),
		RunAsGroup:               lo.ToPtr(nonRootGID),
	}
}

func ensureDefaultPodSecurityContextWithDind(psc *corev1.PodSecurityContext) *corev1.PodSecurityContext {
	if psc != nil {
		if psc.FSGroup == nil {
			psc.FSGroup = lo.ToPtr(dindRootlessUID)
		}
		return psc
	}

	// Rootless dind runs as uid 1000; FSGroup ensures EmptyDir volumes (certs, graph)
	// are group-writable by that user for TLS cert generation.
	return &corev1.PodSecurityContext{
		FSGroup: lo.ToPtr(dindRootlessUID),
	}
}

func enableDind(pod *corev1.Pod) {
	pod.Spec.Volumes = append(pod.Spec.Volumes,
		corev1.Volume{
			Name: dockerGraphVolumeName,
			VolumeSource: corev1.VolumeSource{
				EmptyDir: &corev1.EmptyDirVolumeSource{},
			},
		},
		corev1.Volume{
			Name: tunDeviceVolumeName,
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: tunDevicePath,
					Type: lo.ToPtr(corev1.HostPathCharDev),
				},
			},
		},
		corev1.Volume{
			Name: dockerCertsVolumeName,
			VolumeSource: corev1.VolumeSource{
				EmptyDir: &corev1.EmptyDirVolumeSource{},
			},
		},
	)

	// Add as an init container with restart policy set to always to keep the container running until all regular containers finish
	pod.Spec.InitContainers = append(pod.Spec.InitContainers, corev1.Container{
		Name:  dindContainerName,
		Image: fmt.Sprintf("%s:%s", common.GetConfigurationManager().SwapBaseRegistry(defaultContainerDinDImage), defaultContainerDinDImageTag),
		SecurityContext: &corev1.SecurityContext{
			Privileged: new(true),
		},
		Env: []corev1.EnvVar{
			// Use slirp4netns for user-space networking; /dev/net/tun must be mounted
			// from the host so rootlesskit can create the tap interface.
			{Name: dindRootlesskitNetEnvName, Value: dindRootlesskitNetValue},
			// Entrypoint generates TLS certs in DOCKER_TLS_CERTDIR and automatically
			// adds --host=tcp://0.0.0.0:2376 --tlsverify plus the rootlesskit port-forward rule.
			{Name: dindTLSCertDirEnvName, Value: dockerCertsPath},
		},
		Ports: []corev1.ContainerPort{
			{
				Name:          "docker",
				ContainerPort: dockerDaemonPort,
			},
		},
		VolumeMounts: []corev1.VolumeMount{
			{Name: dockerGraphVolumeName, MountPath: "/var/lib/docker"},
			{Name: tunDeviceVolumeName, MountPath: tunDevicePath},
			{Name: dockerCertsVolumeName, MountPath: dockerCertsPath},
			// Share /tmp with the default container so bind mounts work
			{Name: defaultTmpVolumeName, MountPath: defaultTmpVolumePath},
			{Name: sharedContextVolumeName, MountPath: sharedContextVolumePath},
		},
		RestartPolicy: lo.ToPtr(corev1.ContainerRestartPolicyAlways),
	})

	// Wire agent container with dind client env vars and the read-only certs mount
	for i := range pod.Spec.Containers {
		if pod.Spec.Containers[i].Name == defaultContainer {
			pod.Spec.Containers[i].Env = append(pod.Spec.Containers[i].Env, dindClientEnvs...)
			pod.Spec.Containers[i].VolumeMounts = append(pod.Spec.Containers[i].VolumeMounts, corev1.VolumeMount{
				Name:      dockerCertsVolumeName,
				MountPath: dockerCertsPath,
				ReadOnly:  true,
			})
		}
	}
}

func enableBrowser(browserConfig *v1alpha1.BrowserConfig, pod *corev1.Pod) {
	if browserConfig == nil {
		browserConfig = &v1alpha1.BrowserConfig{}
	}

	browser := defaultContainerBrowser
	if browserConfig.Browser != nil {
		browser = *browserConfig.Browser
	}

	container := corev1.Container{
		Name:          browserContainerName,
		RestartPolicy: lo.ToPtr(corev1.ContainerRestartPolicyAlways),
		Env: []corev1.EnvVar{
			{Name: "PORT", Value: fmt.Sprintf("%d", defaultContainerBrowserServerPort)},
			// Required by selenium-based browsers
			{Name: "SE_OPTS", Value: fmt.Sprintf("--port %d", defaultContainerBrowserServerPort)},
		},
	}

	image, exists := defaultBrowserImages[browser]
	switch {
	case exists:
		container.Image = common.GetConfigurationManager().SwapBaseRegistry(image)
	case browser == v1alpha1.BrowserCustom && browserConfig.Container != nil:
		container = *browserConfig.Container
		container.Name = browserContainerName
	}

	if browser != v1alpha1.BrowserCustom && browserConfig.Container != nil {
		// partial merge of overridable entries
		container.Env = append(container.Env, browserConfig.Container.Env...)
		container.Resources = browserConfig.Container.Resources
		container.ImagePullPolicy = browserConfig.Container.ImagePullPolicy
	}

	pod.Spec.InitContainers = append(pod.Spec.InitContainers, container)
}

// enableBootstrapScript mounts a ConfigMap containing the bootstrap script as an
// executable file at bootstrapScriptMountPath inside the default container.
func enableBootstrapScript(configMapName string, pod *corev1.Pod) {
	pod.Spec.Volumes = append(pod.Spec.Volumes, corev1.Volume{
		Name: bootstrapScriptVolumeName,
		VolumeSource: corev1.VolumeSource{
			ConfigMap: &corev1.ConfigMapVolumeSource{
				LocalObjectReference: corev1.LocalObjectReference{Name: configMapName},
				DefaultMode:          lo.ToPtr(int32(0755)),
			},
		},
	})

	for i := range pod.Spec.Containers {
		if pod.Spec.Containers[i].Name == defaultContainer {
			pod.Spec.Containers[i].VolumeMounts = append(
				pod.Spec.Containers[i].VolumeMounts,
				corev1.VolumeMount{
					Name:      bootstrapScriptVolumeName,
					MountPath: bootstrapScriptMountPath,
					SubPath:   bootstrapScriptConfigMapKey,
				},
			)
			break
		}
	}
}

// enableGitSigningKey mounts the signing key secret as a directory inside the default container.
// The volume is mounted without SubPath so that fsGroup ownership applies correctly,
// making the key readable by the non-root container process.
func enableGitSigningKey(podSecretName string, pod *corev1.Pod) {
	pod.Spec.Volumes = append(pod.Spec.Volumes, corev1.Volume{
		Name: gitSigningKeyVolumeName,
		VolumeSource: corev1.VolumeSource{
			Secret: &corev1.SecretVolumeSource{
				SecretName:  podSecretName,
				DefaultMode: lo.ToPtr(int32(0440)),
				Items: []corev1.KeyToPath{
					{Key: gitSigningKeySecretKey, Path: gitSigningKeySecretKey},
				},
			},
		},
	})

	for i := range pod.Spec.Containers {
		if pod.Spec.Containers[i].Name == defaultContainer {
			pod.Spec.Containers[i].VolumeMounts = append(
				pod.Spec.Containers[i].VolumeMounts,
				corev1.VolumeMount{
					Name:      gitSigningKeyVolumeName,
					MountPath: "/plural/git", // mount as directory; fsGroup chown applies to the whole dir
					ReadOnly:  true,
				},
			)
			break
		}
	}
}
