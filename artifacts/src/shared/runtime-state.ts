export const RUNTIME_STATE_REQUEST = 'moldable:runtime-state-request'
export const RUNTIME_STATE_RESPONSE = 'moldable:runtime-state-response'
export const RUNTIME_STATE_PROTOCOL_VERSION = 1
export const MAX_RUNTIME_STATE_BYTES = 512 * 1024

const RUNTIME_STATE_NAMESPACE_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export type RuntimeStateOperation = 'get' | 'set' | 'delete'

export interface RuntimeStateRequest {
  type: typeof RUNTIME_STATE_REQUEST
  version: typeof RUNTIME_STATE_PROTOCOL_VERSION
  requestId: string
  namespace: string
  operation: RuntimeStateOperation
  value?: unknown
}

export interface RuntimeStateResponse {
  type: typeof RUNTIME_STATE_RESPONSE
  version: typeof RUNTIME_STATE_PROTOCOL_VERSION
  requestId: string
  ok: boolean
  value?: unknown
  error?: string
}

export function isValidRuntimeStateNamespace(value: string): boolean {
  return RUNTIME_STATE_NAMESPACE_RE.test(value)
}

/**
 * Browser runtime injected before authored artifact scripts. Authored code calls
 * `window.moldableState(namespace)` and never needs to know whether the host is
 * the local app (filesystem) or artifacts.moldable.sh (browser localStorage).
 */
export const RUNTIME_STATE_CLIENT_JS = `
(function () {
  if (window.moldableState) return;

  var REQUEST = '${RUNTIME_STATE_REQUEST}';
  var RESPONSE = '${RUNTIME_STATE_RESPONSE}';
  var VERSION = ${RUNTIME_STATE_PROTOCOL_VERSION};
  var namespaceRe = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  var pending = Object.create(null);
  var memory = Object.create(null);
  var sequence = 0;
  var isThumb = (new URLSearchParams(window.location.search)).has('thumb');

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function directKey(namespace) {
    return 'moldable:runtime-state:direct:' + window.location.pathname + ':' + namespace;
  }

  function direct(operation, namespace, value) {
    var key = directKey(namespace);
    try {
      if (operation === 'get') {
        var raw = window.localStorage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      }
      if (operation === 'set') {
        window.localStorage.setItem(key, JSON.stringify(value));
        return value;
      }
      window.localStorage.removeItem(key);
      return null;
    } catch (error) {
      if (operation === 'get') return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      if (operation === 'set') memory[key] = value;
      else delete memory[key];
      return operation === 'set' ? value : null;
    }
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var data = event.data || {};
    if (data.type !== RESPONSE || data.version !== VERSION || typeof data.requestId !== 'string') return;
    var request = pending[data.requestId];
    if (!request) return;
    delete pending[data.requestId];
    clearTimeout(request.timeout);
    if (data.ok) request.resolve(data.value === undefined ? null : data.value);
    else {
      var error = new Error(typeof data.error === 'string' ? data.error : 'Runtime state request failed');
      error.hostResponded = true;
      request.reject(error);
    }
  });

  function hostRequest(operation, namespace, value) {
    return new Promise(function (resolve, reject) {
      sequence += 1;
      var requestId = 'state-' + Date.now() + '-' + sequence;
      var timeout = setTimeout(function () {
        if (!pending[requestId]) return;
        delete pending[requestId];
        reject(new Error('Runtime state host unavailable'));
      }, 3000);
      pending[requestId] = { resolve: resolve, reject: reject, timeout: timeout };
      window.parent.postMessage({
        type: REQUEST,
        version: VERSION,
        requestId: requestId,
        namespace: namespace,
        operation: operation,
        value: value
      }, '*');
    });
  }

  function invoke(operation, namespace, value) {
    if (isThumb) return Promise.resolve(operation === 'get' ? null : value);
    if (window.parent === window) return Promise.resolve(direct(operation, namespace, value));
    return hostRequest(operation, namespace, value).catch(function (error) {
      if (error && error.hostResponded) throw error;
      return direct(operation, namespace, value);
    });
  }

  window.moldableState = function (namespace) {
    if (typeof namespace !== 'string' || !namespaceRe.test(namespace)) {
      throw new Error('Invalid Moldable state namespace');
    }
    var chain = Promise.resolve();
    return {
      get: function (fallback) {
        var read = chain.catch(function () {}).then(function () {
          return invoke('get', namespace);
        });
        chain = read.then(function () {}, function () {});
        return read.then(function (value) {
          return value === null || value === undefined ? fallback : value;
        });
      },
      set: function (value) {
        var snapshot = clone(value);
        chain = chain.catch(function () {}).then(function () {
          return invoke('set', namespace, snapshot);
        });
        return chain;
      },
      clear: function () {
        chain = chain.catch(function () {}).then(function () {
          return invoke('delete', namespace);
        });
        return chain;
      }
    };
  };
})();
`.trim()
