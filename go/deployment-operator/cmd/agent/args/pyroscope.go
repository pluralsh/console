package args

import (
	"os"
	"runtime"
	"time"

	"github.com/grafana/pyroscope-go"
	"k8s.io/klog/v2"
)

func InitPyroscope() (*pyroscope.Profiler, error) {
	klog.Info("initializing pyroscope")

	runtime.SetMutexProfileFraction(5)
	runtime.SetBlockProfileRate(5)

	return pyroscope.Start(pyroscope.Config{
		ApplicationName: "deployment-operator",

		// replace this with the address of pyroscope server
		ServerAddress: PyroscopeAddress(),

		// you can disable logging by setting this to nil
		Logger: nil,

		// Push metrics once every 30 seconds
		UploadRate: 30 * time.Second,

		// you can provide static tags via a map:
		Tags: map[string]string{"hostname": os.Getenv("HOSTNAME")},

		ProfileTypes: []pyroscope.ProfileType{
			// these profile types are enabled by default:
			pyroscope.ProfileCPU,
			pyroscope.ProfileAllocObjects,
			pyroscope.ProfileAllocSpace,
			pyroscope.ProfileInuseObjects,
			pyroscope.ProfileInuseSpace,

			// these profile types are optional:
			pyroscope.ProfileGoroutines,
			pyroscope.ProfileMutexCount,
			pyroscope.ProfileMutexDuration,
			pyroscope.ProfileBlockCount,
			pyroscope.ProfileBlockDuration,
		},
	})
}
