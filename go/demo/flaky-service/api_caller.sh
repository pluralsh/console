#!/bin/bash

set -e

while getopts "e:m:t:" opt; do
  case ${opt} in
    e ) ENDPOINT=$OPTARG
      ;;
    m ) METRICS_ENDPOINT=$OPTARG
      ;;
    t ) SLEEP_TIME_SECS=$OPTARG
      ;;
    \? ) echo "Usage: cmd [-e] <api-endpoint> [-m] <metrics-endpoint> [-t] <sleep-time-secs>"
      ;;
  esac
done

echo "Will call http://${ENDPOINT} every ${SLEEP_TIME_SECS} seconds"
echo "Will call http://${METRICS_ENDPOINT} every 10 requests"

CALL_NUM=0
while true
do
  # Log the request being made
  echo "Making API request to http://${ENDPOINT}"

  # Perform the curl request and log the response
  RESPONSE=$(curl "http://${ENDPOINT}")

  # If the response is empty, log a message
  if [ -z "$RESPONSE" ]; then
    echo "Received empty response from http://${ENDPOINT}"
  else
    echo "Response: $RESPONSE"
  fi

  CALL_NUM=$((${CALL_NUM:-0}+1))
  if [ $((${CALL_NUM} % 10)) == 0 ]; then
    echo "Making metrics request to http://${METRICS_ENDPOINT}"
    METRICS_RESPONSE=$(curl "http://${METRICS_ENDPOINT}")

    if [ -z "$METRICS_RESPONSE" ]; then
      echo "Received empty response from http://${METRICS_ENDPOINT}"
    else
      echo "Metrics Response: $METRICS_RESPONSE"
    fi
  fi

  sleep ${SLEEP_TIME_SECS}
done
