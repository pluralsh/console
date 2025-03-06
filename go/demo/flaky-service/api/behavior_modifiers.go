func HandleRequestTimestampModulus(timestampModulus int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slog.Info("Handling API request using timestamp")
		time_now := time.Now().UnixNano() / int64(time.Millisecond)

		if time_now%timestampModulus == 0 {
			slog.Warn("Request processed with a timestamp modulus but returning OK", "time_now", time_now, "modulus", timestampModulus)

			metrics.IncrementRequestCounter(http.StatusOK, r.Method)
			w.WriteHeader(http.StatusOK)
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "req processed but timestamp modulus encountered"}`))
		} else {
			slog.Info("Everything seems fine, returning status.OK", "time_now", time_now, "modulus", timestampModulus)

			metrics.IncrementRequestCounter(http.StatusOK, r.Method)
			w.WriteHeader(http.StatusOK)
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "req processed successfully"}`))
		}
	}
}