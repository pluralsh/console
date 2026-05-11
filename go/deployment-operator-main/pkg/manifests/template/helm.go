package template

import (
	"bytes"
	"fmt"
	iofs "io/fs"
	"log"
	"os"
	"path"
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"sync"

	"github.com/pluralsh/console/go/polly/luautils"
	lua "github.com/yuin/gopher-lua"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/pkg/errors"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/console/go/polly/fs"
	"github.com/samber/lo"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/chartutil"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/downloader"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/repo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/util/homedir"
	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"

	"github.com/pluralsh/deployment-operator/cmd/agent/args"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	loglevel "github.com/pluralsh/deployment-operator/pkg/log"
)

var repoFileMutex sync.Mutex

const (
	appNameLabel                   = "app.kubernetes.io/name"
	appInstanceLabel               = "app.kubernetes.io/instance"
	appManagedByLabel              = "app.kubernetes.io/managed-by"
	appManagedByHelm               = "Helm"
	helmChartLabel                 = "helm.sh/chart"
	helmReleaseNameAnnotation      = "meta.helm.sh/release-name"
	helmReleaseNamespaceAnnotation = "meta.helm.sh/release-namespace"
)

// newEnvSettings creates a fresh EnvSettings for each render to avoid races
func newEnvSettings() (*cli.EnvSettings, error) {
	dir, err := os.MkdirTemp("", "repositories")
	if err != nil {
		return nil, err
	}

	settings := cli.New()
	settings.RepositoryCache = dir
	settings.RepositoryConfig = path.Join(dir, "repositories.yaml")
	settings.KubeInsecureSkipTLSVerify = true

	return settings, nil
}

func debug(format string, v ...interface{}) {
	format = fmt.Sprintf("INFO: %s\n", format)
	err := log.Output(2, fmt.Sprintf(format, v...))
	if err != nil {
		log.Panic(err)
	}
}

type helm struct {
	dir string
}

func (h *helm) Render(svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	luaValues, luaValuesFiles, err := h.luaValues(svc)
	if err != nil {
		var apiErr *lua.ApiError
		if errors.As(err, &apiErr) {
			return nil, fmt.Errorf("lua script error: %s", apiErr.Object.String())
		}
		return nil, err
	}

	values, err := h.values(svc, lo.ToSlicePtr(luaValuesFiles))
	if err != nil {
		return nil, err
	}
	values = algorithms.Merge(values, luaValues)

	settings, err := newEnvSettings()
	if err != nil {
		return nil, err
	}
	config, err := GetActionConfig(svc.Namespace, settings)
	if err != nil {
		return nil, err
	}
	c, err := chartutil.LoadChartfile(path.Join(h.dir, ChartFileName))
	if err != nil {
		return nil, err
	}

	klog.V(loglevel.LogLevelExtended).InfoS("render helm templates:", "enable dependency update", args.EnableHelmDependencyUpdate(), "dependencies", len(c.Dependencies))
	if len(c.Dependencies) > 0 && args.EnableHelmDependencyUpdate() {
		if err := h.dependencyUpdate(config, c.Dependencies, settings); err != nil {
			return nil, err
		}
	}

	release := svc.Name
	if svc.Helm != nil && svc.Helm.Release != nil {
		release = *svc.Helm.Release
	}

	includeCRDs := true
	if svc.Helm != nil && svc.Helm.IgnoreCrds != nil {
		includeCRDs = !*svc.Helm.IgnoreCrds
	}

	rel, err := h.templateHelm(config, release, svc.Namespace, values, includeCRDs)
	if err != nil {
		return nil, err
	}

	var buffer bytes.Buffer
	_, err = fmt.Fprintln(&buffer, strings.TrimSpace(rel.Manifest))
	if err != nil {
		return nil, err
	}

	if svc.Helm != nil && !lo.FromPtr(svc.Helm.IgnoreHooks) {
		for _, h := range rel.Hooks {
			_, err = fmt.Fprintln(&buffer, "---")
			if err != nil {
				return nil, err
			}
			_, err = fmt.Fprintln(&buffer, strings.TrimSpace(h.Manifest))
			if err != nil {
				return nil, err
			}
		}
	}

	r := bytes.NewReader(buffer.Bytes())
	manifests, err := streamManifests(r, mapper, "helm", svc.Namespace)
	if err != nil {
		return nil, err
	}

	h.stitchManifests(manifests, rel)

	return manifests, nil
}

func (h *helm) stitchManifests(manifests []unstructured.Unstructured, rel *release.Release) {
	for _, manifest := range manifests {
		// Set recommended Helm labels. See: https://helm.sh/docs/chart_best_practices/labels/.
		labels := manifest.GetLabels()
		if labels == nil {
			labels = make(map[string]string)
		}
		labels[appManagedByLabel] = appManagedByHelm
		if _, ok := labels[appInstanceLabel]; !ok {
			labels[appInstanceLabel] = rel.Name
		}
		if _, ok := labels[appNameLabel]; !ok {
			labels[appNameLabel] = rel.Chart.Name()
		}
		if _, ok := labels[helmChartLabel]; !ok && rel.Chart.Metadata != nil {
			labels[helmChartLabel] = rel.Chart.Name() + "-" + strings.ReplaceAll(rel.Chart.Metadata.Version, "+", "_")
		}
		manifest.SetLabels(labels)

		// Set the same annotations that would be set by Helm to add release tracking metadata to all resources.
		annotations := manifest.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}
		annotations[helmReleaseNameAnnotation] = rel.Name
		annotations[helmReleaseNamespaceAnnotation] = rel.Namespace
		manifest.SetAnnotations(annotations)
	}
}

func (h *helm) luaValues(svc *console.ServiceDeploymentForAgent) (map[string]interface{}, []string, error) {
	// Initialize empty results
	newValues := make(map[string]interface{})
	var valuesFiles []string

	if svc == nil {
		return nil, valuesFiles, fmt.Errorf("no service found")
	}

	if svc.Helm == nil || (svc.Helm.LuaScript == nil && svc.Helm.LuaFile == nil && svc.Helm.LuaFolder == nil) {
		return newValues, valuesFiles, nil
	}

	L := luautils.NewLuaState(h.dir)
	defer L.Close()

	// Register global values and valuesFiles in Lua
	valuesTable := L.NewTable()
	L.SetGlobal("values", valuesTable)

	valuesFilesTable := L.NewTable()
	L.SetGlobal("valuesFiles", valuesFilesTable)

	for name, binding := range bindings(svc) {
		L.SetGlobal(name, luautils.GoValueToLuaValue(L, binding))
	}

	var luaString string
	switch {
	case svc.Helm.LuaScript != nil && len(*svc.Helm.LuaScript) > 0:
		luaString = *svc.Helm.LuaScript
	case svc.Helm.LuaFile != nil:
		luaContents, err := os.ReadFile(filepath.Join(h.dir, *svc.Helm.LuaFile))
		if err != nil {
			return nil, valuesFiles, fmt.Errorf("failed to read lua file %s: %w", *svc.Helm.LuaFile, err)
		}
		luaString = string(luaContents)
	}

	if svc.Helm.LuaFolder != nil && len(*svc.Helm.LuaFolder) > 0 {
		luaFolder, err := h.luaFolder(svc, *svc.Helm.LuaFolder)
		if err != nil {
			return nil, valuesFiles, err
		}
		luaString = luaFolder + "\n\n" + luaString
	}

	if luaString == "" {
		return nil, valuesFiles, fmt.Errorf("no lua script, file, or folder provided")
	}

	// Execute the Lua script
	err := L.DoString(luaString)
	if err != nil {
		return nil, valuesFiles, err
	}

	if err := luautils.MapLua(L.GetGlobal("values").(*lua.LTable), &newValues); err != nil {
		return nil, valuesFiles, err
	}

	if err := luautils.MapLua(L.GetGlobal("valuesFiles").(*lua.LTable), &valuesFiles); err != nil {
		return nil, valuesFiles, err
	}

	finalValues := make(map[string]interface{}, len(newValues))
	for k, v := range newValues {
		finalValues[k] = luautils.SanitizeValue(v)
	}

	return finalValues, valuesFiles, nil
}

func (h *helm) values(svc *console.ServiceDeploymentForAgent, additionalValues []*string) (map[string]interface{}, error) {
	currentMap, err := h.valuesFile(svc, "values.yaml.liquid")
	if err != nil {
		return currentMap, err
	}
	if svc.Helm != nil {
		allValues := slices.Concat(svc.Helm.ValuesFiles, additionalValues)
		for _, f := range allValues {
			nextMap, err := h.valuesFile(svc, lo.FromPtr(f))
			if err != nil {
				return currentMap, err
			}
			currentMap = algorithms.Merge(currentMap, nextMap)
		}

		if svc.Helm.Values != nil {
			valuesMap := map[string]interface{}{}
			if err := yaml.Unmarshal([]byte(*svc.Helm.Values), &valuesMap); err != nil {
				return nil, err
			}
			currentMap = algorithms.Merge(currentMap, valuesMap)
		}
	}

	overrides, err := h.valuesFile(svc, "values.yaml.static")
	if err != nil {
		return currentMap, nil
	}

	return algorithms.Merge(currentMap, overrides), nil
}

func (h *helm) luaFolder(svc *console.ServiceDeploymentForAgent, folder string) (string, error) {
	luaFiles := make([]string, 0)
	if err := filepath.WalkDir(filepath.Join(h.dir, folder), func(path string, info iofs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		if strings.HasSuffix(info.Name(), ".lua") {
			luaPath, err := filepath.Rel(h.dir, path)
			if err != nil {
				return err
			}
			luaFiles = append(luaFiles, luaPath)
		}

		return nil
	}); err != nil {
		return "", fmt.Errorf("failed to walk lua folder %s: %w", *svc.Helm.LuaFolder, err)
	}

	sort.Slice(luaFiles, func(i, j int) bool {
		return luaFiles[i] < luaFiles[j]
	})

	luaFileContents := make([]string, 0)
	for _, file := range luaFiles {
		luaContents, err := os.ReadFile(filepath.Join(h.dir, file))
		if err != nil {
			return "", fmt.Errorf("failed to read lua file %s: %w", file, err)
		}
		luaFileContents = append(luaFileContents, string(luaContents))
	}

	return strings.Join(luaFileContents, "\n\n"), nil
}

func (h *helm) valuesFile(svc *console.ServiceDeploymentForAgent, filename string) (map[string]interface{}, error) {
	filename = filepath.Join(h.dir, filename)
	currentMap := map[string]interface{}{}
	if fs.Exists(filename) {
		data, err := os.ReadFile(filename)
		if err != nil {
			return nil, err
		}

		if strings.HasSuffix(filename, ".liquid") {
			data, err = renderLiquid(data, svc)
			if err != nil {
				return nil, err
			}
		}

		if strings.HasSuffix(filename, ".tpl") {
			data, err = renderTpl(data, svc)
			if err != nil {
				return nil, err
			}
		}

		if err := yaml.Unmarshal(data, &currentMap); err != nil {
			return nil, errors.Wrapf(err, "failed to parse %s", filename)
		}
	}

	return currentMap, nil
}

func (h *helm) templateHelm(conf *action.Configuration, release, namespace string, values map[string]any, includeCRDs bool) (*release.Release, error) {
	// load chart from the path
	chart, err := loader.Load(h.dir)
	if err != nil {
		return nil, err
	}

	client := action.NewInstall(conf)
	client.DryRun = true
	if !args.DisableHelmTemplateDryRunServer() {
		client.DryRunOption = "server"
	}
	client.ReleaseName = release
	client.Replace = true // Skip the name check
	client.ClientOnly = true
	client.Namespace = namespace
	client.IncludeCRDs = includeCRDs
	client.IsUpgrade = true
	vsn, err := kubeVersion(conf)
	if err != nil {
		return nil, err
	}
	client.KubeVersion = vsn
	client.APIVersions = h.buildHelmAPIVersions()

	return client.Run(chart, values)
}

func (h *helm) buildHelmAPIVersions() []string {
	return slices.Concat[[]string](
		algorithms.Map(
			discoverycache.GlobalCache().GroupVersion().List(),
			func(gv schema.GroupVersion) string {
				return gv.String()
			},
		),
		algorithms.Map(
			discoverycache.GlobalCache().GroupVersionKind().List(),
			func(gvk schema.GroupVersionKind) string {
				return fmt.Sprintf("%s/%s", gvk.GroupVersion().String(), gvk.Kind)
			},
		),
	)
}

// GetActionConfig now receives EnvSettings instead of using a global
func GetActionConfig(namespace string, settings *cli.EnvSettings) (*action.Configuration, error) {
	if os.Getenv("KUBECONFIG") != "" {
		settings.KubeConfig = os.Getenv("KUBECONFIG")
	}
	settings.SetNamespace(namespace)
	settings.Debug = false

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(settings.RESTClientGetter(), namespace, "", debug); err != nil {
		return nil, err
	}
	return actionConfig, nil
}

func NewHelm(dir string) Template {
	return &helm{dir}
}

func kubeVersion(conf *action.Configuration) (*chartutil.KubeVersion, error) {
	dc, err := conf.RESTClientGetter.ToDiscoveryClient()
	if err != nil {
		return nil, errors.Wrap(err, "could not get Kubernetes discovery client")
	}

	kubeVersion, err := dc.ServerVersion()
	if err != nil {
		return nil, errors.Wrap(err, "could not get server version from Kubernetes")
	}

	return &chartutil.KubeVersion{
		Version: kubeVersion.GitVersion,
		Major:   kubeVersion.Major,
		Minor:   kubeVersion.Minor,
	}, nil
}

func (h *helm) dependencyUpdate(conf *action.Configuration, dependencies []*chart.Dependency, settings *cli.EnvSettings) error {
	for _, dep := range dependencies {
		if err := AddRepo(dep.Name, dep.Repository, settings); err != nil {
			return err
		}
	}
	if err := UpdateRepos(settings); err != nil {
		return err
	}

	man := &downloader.Manager{
		Out:              log.Writer(),
		ChartPath:        h.dir,
		Keyring:          defaultKeyring(),
		SkipUpdate:       true,
		Getters:          getter.All(settings),
		RegistryClient:   conf.RegistryClient,
		RepositoryConfig: settings.RepositoryConfig,
		RepositoryCache:  settings.RepositoryCache,
		Debug:            false,
	}
	return man.Update()
}

// defaultKeyring returns the expanded path to the default keyring.
func defaultKeyring() string {
	if v, ok := os.LookupEnv("GNUPGHOME"); ok {
		return filepath.Join(v, "pubring.gpg")
	}
	return filepath.Join(homedir.HomeDir(), ".gnupg", "pubring.gpg")
}

// UpdateRepos now receives EnvSettings
func UpdateRepos(settings *cli.EnvSettings) error {
	repoFileMutex.Lock()
	defer repoFileMutex.Unlock()

	klog.V(loglevel.LogLevelExtended).InfoS("helm repo update...")
	f, err := repo.LoadFile(settings.RepositoryConfig)
	switch {
	case os.IsNotExist(err):
		return errors.New("no repositories found. You must add one before updating")
	case err != nil:
		return fmt.Errorf("failed loading file: %s: %w", settings.RepositoryConfig, err)
	case len(f.Repositories) == 0:
		return errors.New("no repositories found. You must add one before updating")
	}

	repos := make([]repo.ChartRepository, 0, len(f.Repositories))
	for _, cfg := range f.Repositories {
		r, err := repo.NewChartRepository(cfg, getter.All(settings))
		if err != nil {
			return err
		}
		r.CachePath = settings.RepositoryCache
		repos = append(repos, *r)
	}

	return updateCharts(repos, true)
}

func updateCharts(repos []repo.ChartRepository, failOnRepoUpdateFail bool) error {
	var wg sync.WaitGroup
	var repoFailList []string
	for _, re := range repos {
		wg.Add(1)
		go func(re repo.ChartRepository) {
			defer wg.Done()
			if _, err := re.DownloadIndexFile(); err != nil {
				klog.ErrorS(err, "unable to get an update from the chart repository", "name", re.Config.Name, "url", re.Config.URL)
				repoFailList = append(repoFailList, re.Config.URL)
			} else {
				klog.V(loglevel.LogLevelExtended).InfoS("successfully got an update from the chart repository", "name", re.Config.Name)
			}
		}(re)
	}
	wg.Wait()

	if len(repoFailList) > 0 && failOnRepoUpdateFail {
		return fmt.Errorf("failed to update the following repositories: %s",
			repoFailList)
	}

	klog.V(loglevel.LogLevelExtended).InfoS("helm repo update complete")
	return nil
}

func AddRepo(repoName, repoUrl string, settings *cli.EnvSettings) error {
	repoFileMutex.Lock()
	defer repoFileMutex.Unlock()

	repoFile := settings.RepositoryConfig
	if err := os.MkdirAll(filepath.Dir(repoFile), os.ModePerm); err != nil && !os.IsExist(err) {
		return err
	}

	klog.V(loglevel.LogLevelExtended).InfoS("adding helm repo", "name", repoName, "file", repoFile)

	b, err := os.ReadFile(repoFile)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	var f repo.File
	if err := yaml.Unmarshal(b, &f); err != nil {
		return err
	}

	c := repo.Entry{
		Name:                  repoName,
		URL:                   repoUrl,
		InsecureSkipTLSverify: true,
	}
	f.Update(&c)
	klog.V(loglevel.LogLevelExtended).InfoS("helm repo added", "name", repoName, "file", repoFile)
	return f.WriteFile(repoFile, 0644)
}

func HelmSettings() (*cli.EnvSettings, error) {
	return newEnvSettings()
}
