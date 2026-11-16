package daemon

import (
	"net"
	"net/http"
	"strconv"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/browser"
)

// BundlePath is the daemon-local extension for git bundle uploads (DBX-72 push). The contract has no RPC for it.
const BundlePath = "/workspace/bundles/"

// Handler serves gRPC (HTTP/2 with content-type application/grpc) and the HTTP endpoints on one port.
func (d *Daemon) Handler() http.Handler {
	gs := grpc.NewServer(grpc.ChainUnaryInterceptor(d.unary), grpc.ChainStreamInterceptor(d.stream),
		grpc.MaxRecvMsgSize(64<<20), grpc.MaxSendMsgSize(64<<20))
	devboxv1.RegisterDaemonServer(gs, d)

	mux := http.NewServeMux()
	mux.HandleFunc("/readyz", d.serveHealth)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok\n")) })
	mux.HandleFunc("/terminals/", d.httpAuth(d.terms.ServeWS))
	mux.HandleFunc(browser.VNCPath, d.httpAuth(d.browser.ServeVNC))
	mux.Handle("/preview/", d.httpAuth((&browser.PreviewProxy{Deny: d.reservedPorts(), Activity: d.browser}).ServeHTTP))
	mux.HandleFunc("PUT "+BundlePath+"{name}", d.httpAuth(d.putBundle))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ProtoMajor == 2 && strings.HasPrefix(r.Header.Get("Content-Type"), "application/grpc") {
			gs.ServeHTTP(w, r)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func (d *Daemon) reservedPorts() map[int]bool {
	deny := map[int]bool{d.cfg.CDPPort: true, d.cfg.CDPPort + 1: true, d.cfg.VNCPort: true}
	if _, port, err := net.SplitHostPort(d.cfg.ListenAddr); err == nil {
		if p, err := strconv.Atoi(port); err == nil {
			deny[p] = true
		}
	}
	return deny
}

// httpAuth checks the request token on HTTP endpoints when the caller sends one, or always once keys are
// configured and the caller isn't a browser stream (those carry the gateway's stream token, validated upstream).
func (d *Daemon) httpAuth(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := trimToken(r.Header.Get(devboxv1.RequestTokenMetadataKey))
		strict := strings.HasPrefix(r.URL.Path, BundlePath)
		if token != "" || strict {
			if err := d.checkToken(token); err != nil {
				http.Error(w, status.Convert(err).Message(), http.StatusUnauthorized)
				return
			}
		}
		h(w, r)
	}
}

func (d *Daemon) serveHealth(w http.ResponseWriter, _ *http.Request) {
	h := d.health()
	data, _ := protojson.Marshal(h)
	w.Header().Set("Content-Type", "application/json")
	// Always 200 once serving: Substrate's wakeup probe gates routing, and Initialize must be able to arrive.
	_, _ = w.Write(data)
}

func (d *Daemon) putBundle(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	co, err := d.ws.ApplyBundle(r.Context(), name, r.URL.Query().Get("remote"), http.MaxBytesReader(w, r.Body, 2<<30))
	if err != nil {
		st := status.Convert(err)
		code := http.StatusBadRequest
		if st.Code() == codes.Internal || st.Code() == codes.Unknown {
			code = http.StatusInternalServerError
		}
		http.Error(w, st.Message(), code)
		return
	}
	data, _ := protojson.Marshal(co)
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(data)
}
