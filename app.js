/**
* Replace these with your OpenTok API key, a session ID for a routed OpenTok session,
* and a token that has the publish role:
*/
// var request = require('request');

var API_KEY = '46067482';
var SESSION_ID = '2_MX40NjA2NzQ4Mn5-MTUyMDAyNjU4MTA3M35RdjdKaFdrWHF2aEpSRXFybFAyeDNzYXB-fg';
var TOKEN = "T1==cGFydG5lcl9pZD00NjA2NzQ4MiZzaWc9MjY4MGQ2NTI0MGNkZjRiNzZlYTlkZWIwZGQ2NWFiMzM2OWZhZTc4YzpzZXNzaW9uX2lkPTFfTVg0ME5qQTJOelE0TW41LU1UVXlNREF5TnprM01EVXdNWDVRY1ZSSlJYSlFZa3hEYVVkME5tMTNTbEIxZVUxVFpHVi1mZyZjcmVhdGVfdGltZT0xNTIwMDI4MDc3Jm5vbmNlPTAuOTMyNTcwNDQzODkzNjA4OSZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNTIwMTE0NDc3JmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";

var TEST_TIMEOUT_MS = 15000; // 15 seconds

var publisherEl = document.createElement('div');
var subscriberEl = document.createElement('div');

var session;
var publisher;
var subscriber;
var statusContainerEl;
var statusMessageEl;
var statusIconEl;

// var getToken = function (callback) {
//   var url = 'https://altruli/herokuapp.com/session';
//   request(url, function (error, response, body) {
//     console.log('error:', error); // Print the error if one occurred
//     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//     console.log('body:', body); // Print the HTML for the Google homepage.
//     SESSION_ID = body.sessionId;
//     TOKEN = body.token;
//     callback(body);
//   });
// }

var testStreamingCapability = function (subscriber, callback) {
  performQualityTest({ subscriber: subscriber, timeout: TEST_TIMEOUT_MS }, function (error, results) {
    console.log('Test concluded', results);
    // If we tried to set video constraints, but no video data was found
    if (!results.video) {
      var audioSupported = results.audio.bitsPerSecond > 25000 &&
        results.audio.packetLossRatioPerSecond < 0.05;

      if (audioSupported) {
        return callback(false, {
          text: 'You can\'t do video because no camera was found, ' +
            'but your bandwidth can support an audio-only stream',
          icon: 'assets/icon_warning.svg'
        });
      }

      return callback(false, {
        text: 'You can\'t do video because no camera was found, ' +
          'and your bandwidth is too low for an audio-only stream',
        icon: 'assets/icon_warning.svg'
      });
    }

    var audioVideoSupported = results.video.bitsPerSecond > 250000 &&
      results.video.packetLossRatioPerSecond < 0.03 &&
      results.audio.bitsPerSecond > 25000 &&
      results.audio.packetLossRatioPerSecond < 0.05;

    if (audioVideoSupported) {
      return callback(false, {
        text: 'You\'re all set!',
        icon: 'assets/icon_tick.svg'
      });
    }

    if (results.audio.packetLossRatioPerSecond < 0.05) {
      return callback(false, {
        text: 'Your bandwidth can support audio only',
        icon: 'assets/icon_warning.svg'
      });
    }

    // try audio only to see if it reduces the packet loss
    setText(
      statusMessageEl,
      'Trying audio only'
    );

    publisher.publishVideo(false);

    performQualityTest({ subscriber: subscriber, timeout: 5000 }, function (error, results) {
      var audioSupported = results.audio.bitsPerSecond > 25000 &&
        results.audio.packetLossRatioPerSecond < 0.05;

      if (audioSupported) {
        return callback(false, {
          text: 'Your bandwidth can support audio only',
          icon: 'assets/icon_warning.svg'
        });
      }

      return callback(false, {
        text: 'Your bandwidth is too low for audio',
        icon: 'assets/icon_error.svg'
      });
    });
  });
};

var callbacks = {
  onInitPublisher: function onInitPublisher(error) {
    if (error) {
      setText(statusMessageEl, 'Could not acquire your camera');
      return;
    }

    setText(statusMessageEl, 'Connecting to session');
  },

  onPublish: function onPublish(error) {
    if (error) {
      // handle publishing errors here
      setText(
        statusMessageEl,
        'Could not publish video'
      );
      return;
    }

    setText(
      statusMessageEl,
      'Subscribing to video'
    );

    subscriber = session.subscribe(
      publisher.stream,
      subscriberEl,
      {
        audioVolume: 0,
        testNetwork: true
      },
      callbacks.onSubscribe
    );
  },

  cleanup: function () {
    session.unsubscribe(subscriber);
    session.unpublish(publisher);
  },

  onSubscribe: function onSubscribe(error, subscriber) {
    if (error) {
      setText(statusMessageEl, 'Could not subscribe to video');
      return;
    }

    setText(statusMessageEl, 'Checking your available bandwidth');

    testStreamingCapability(subscriber, function (error, message) {
      setText(statusMessageEl, message.text);
      statusIconEl.src = message.icon;
      callbacks.cleanup();
    });
  },

  onConnect: function onConnect(error) {
    if (error) {
      setText(statusMessageEl, 'Could not connect to OpenTok');
    }
  }
};

compositeOfCallbacks(
  callbacks,
  ['onInitPublisher', 'onConnect'],
  function (error) {
    if (error) {
      return;
    }

    setText(statusMessageEl, 'Publishing video');
    session.publish(publisher, callbacks.onPublish);
  }
);

document.addEventListener('DOMContentLoaded', function () {
  var container = document.createElement('div');
  container.className = 'container';

  container.appendChild(publisherEl);
  container.appendChild(subscriberEl);
  document.body.appendChild(container);

  // This publisher uses the default resolution (640x480 pixels) and frame rate (30fps).
  // For other resoultions you may need to adjust the bandwidth conditions in
  // testStreamingCapability().

  // getToken(function (body) {
  // console.log(body);
  publisher = OT.initPublisher(publisherEl, {}, callbacks.onInitPublisher);

  session = OT.initSession(API_KEY, SESSION_ID);
  session.connect(TOKEN, callbacks.onConnect);
  statusContainerEl = document.getElementById('status_container');
  statusMessageEl = statusContainerEl.querySelector('p');
  statusIconEl = statusContainerEl.querySelector('img');
  // });
});

// Helpers
function setText(el, text) {
  if (!el) {
    return;
  }

  if (el.textContent) {
    el.textContent = text;
  }

  if (el.innerText) {
    el.innerText = text;
  }
}

function pluck(arr, propertName) {
  return arr.map(function (value) {
    return value[propertName];
  });
}

function sum(arr, propertyName) {
  if (typeof propertyName !== 'undefined') {
    arr = pluck(arr, propertyName);
  }

  return arr.reduce(function (previous, current) {
    return previous + current;
  }, 0);
}

function max(arr) {
  return Math.max.apply(undefined, arr);
}

function min(arr) {
  return Math.min.apply(undefined, arr);
}

function calculatePerSecondStats(statsBuffer, seconds) {
  var stats = {};
  var activeMediaTypes = Object.keys(statsBuffer[0] || {})
    .filter(function (key) {
      return key !== 'timestamp';
    });

  activeMediaTypes.forEach(function (type) {
    stats[type] = {
      packetsPerSecond: sum(pluck(statsBuffer, type), 'packetsReceived') / seconds,
      bitsPerSecond: (sum(pluck(statsBuffer, type), 'bytesReceived') * 8) / seconds,
      packetsLostPerSecond: sum(pluck(statsBuffer, type), 'packetsLost') / seconds
    };
    stats[type].packetLossRatioPerSecond = (
      stats[type].packetsLostPerSecond / stats[type].packetsPerSecond
    );
  });

  stats.windowSize = seconds;
  return stats;
}

function getSampleWindowSize(samples) {
  var times = pluck(samples, 'timestamp');
  return (max(times) - min(times)) / 1000;
}

if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (fn, scope) {
    for (var i = 0, len = this.length; i < len; ++i) {
      fn.call(scope, this[i], i, this);
    }
  };
}

function compositeOfCallbacks(obj, fns, callback) {
  var results = {};
  var hasError = false;

  var checkDone = function checkDone() {
    if (Object.keys(results).length === fns.length) {
      callback(hasError, results);
      callback = function () { };
    }
  };

  fns.forEach(function (key) {
    var originalCallback = obj[key];

    obj[key] = function (error) {
      results[key] = {
        error: error,
        args: Array.prototype.slice.call(arguments, 1)
      };

      if (error) {
        hasError = true;
      }

      originalCallback.apply(obj, arguments);
      checkDone();
    };
  });
}

function bandwidthCalculatorObj(config) {
  var intervalId;

  config.pollingInterval = config.pollingInterval || 500;
  config.windowSize = config.windowSize || 2000;
  config.subscriber = config.subscriber || undefined;

  return {
    start: function (reportFunction) {
      var statsBuffer = [];
      var last = {
        audio: {},
        video: {}
      };

      intervalId = window.setInterval(function () {
        config.subscriber.getStats(function (error, stats) {
          var activeMediaTypes = Object.keys(stats)
            .filter(function (key) {
              return key !== 'timestamp';
            });
          var snapshot = {};
          var nowMs = new Date().getTime();
          var sampleWindowSize;

          activeMediaTypes.forEach(function (type) {
            snapshot[type] = Object.keys(stats[type]).reduce(function (result, key) {
              result[key] = stats[type][key] - (last[type][key] || 0);
              last[type][key] = stats[type][key];
              return result;
            }, {});
          });

          // get a snapshot of now, and keep the last values for next round
          snapshot.timestamp = stats.timestamp;

          statsBuffer.push(snapshot);
          statsBuffer = statsBuffer.filter(function (value) {
            return nowMs - value.timestamp < config.windowSize;
          });

          sampleWindowSize = getSampleWindowSize(statsBuffer);

          if (sampleWindowSize !== 0) {
            reportFunction(calculatePerSecondStats(
              statsBuffer,
              sampleWindowSize + (config.pollingInterval / 1000)
            ));
          }
        });
      }, config.pollingInterval);
    },

    stop: function () {
      window.clearInterval(intervalId);
    }
  };
}

function performQualityTest(config, callback) {
  var startMs = new Date().getTime();
  var testTimeout;
  var currentStats;

  var bandwidthCalculator = bandwidthCalculatorObj({
    subscriber: config.subscriber
  });

  var cleanupAndReport = function () {
    currentStats.elapsedTimeMs = new Date().getTime() - startMs;
    callback(undefined, currentStats);

    window.clearTimeout(testTimeout);
    bandwidthCalculator.stop();

    callback = function () { };
  };

  // bail out of the test after 30 seconds
  window.setTimeout(cleanupAndReport, config.timeout);

  bandwidthCalculator.start(function (stats) {
    console.log(stats);

    // you could do something smart here like determine if the bandwidth is
    // stable or acceptable and exit early
    currentStats = stats;
  });
}
