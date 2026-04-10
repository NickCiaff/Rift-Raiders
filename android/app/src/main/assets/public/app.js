(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform2 = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve) => call.then(() => resolve({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform2;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          this.listeners[eventName].splice(index, 1);
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/errors.js
  var __extends, PURCHASES_ERROR_CODE, UninitializedPurchasesError, UnsupportedPlatformError;
  var init_errors = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/errors.js"() {
      __extends = /* @__PURE__ */ (function() {
        var extendStatics = function(d, b) {
          extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
            d2.__proto__ = b2;
          } || function(d2, b2) {
            for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
          };
          return extendStatics(d, b);
        };
        return function(d, b) {
          if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
          extendStatics(d, b);
          function __() {
            this.constructor = d;
          }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
      })();
      (function(PURCHASES_ERROR_CODE2) {
        PURCHASES_ERROR_CODE2["UNKNOWN_ERROR"] = "0";
        PURCHASES_ERROR_CODE2["PURCHASE_CANCELLED_ERROR"] = "1";
        PURCHASES_ERROR_CODE2["STORE_PROBLEM_ERROR"] = "2";
        PURCHASES_ERROR_CODE2["PURCHASE_NOT_ALLOWED_ERROR"] = "3";
        PURCHASES_ERROR_CODE2["PURCHASE_INVALID_ERROR"] = "4";
        PURCHASES_ERROR_CODE2["PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR"] = "5";
        PURCHASES_ERROR_CODE2["PRODUCT_ALREADY_PURCHASED_ERROR"] = "6";
        PURCHASES_ERROR_CODE2["RECEIPT_ALREADY_IN_USE_ERROR"] = "7";
        PURCHASES_ERROR_CODE2["INVALID_RECEIPT_ERROR"] = "8";
        PURCHASES_ERROR_CODE2["MISSING_RECEIPT_FILE_ERROR"] = "9";
        PURCHASES_ERROR_CODE2["NETWORK_ERROR"] = "10";
        PURCHASES_ERROR_CODE2["INVALID_CREDENTIALS_ERROR"] = "11";
        PURCHASES_ERROR_CODE2["UNEXPECTED_BACKEND_RESPONSE_ERROR"] = "12";
        PURCHASES_ERROR_CODE2["RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR"] = "13";
        PURCHASES_ERROR_CODE2["INVALID_APP_USER_ID_ERROR"] = "14";
        PURCHASES_ERROR_CODE2["OPERATION_ALREADY_IN_PROGRESS_ERROR"] = "15";
        PURCHASES_ERROR_CODE2["UNKNOWN_BACKEND_ERROR"] = "16";
        PURCHASES_ERROR_CODE2["INVALID_APPLE_SUBSCRIPTION_KEY_ERROR"] = "17";
        PURCHASES_ERROR_CODE2["INELIGIBLE_ERROR"] = "18";
        PURCHASES_ERROR_CODE2["INSUFFICIENT_PERMISSIONS_ERROR"] = "19";
        PURCHASES_ERROR_CODE2["PAYMENT_PENDING_ERROR"] = "20";
        PURCHASES_ERROR_CODE2["INVALID_SUBSCRIBER_ATTRIBUTES_ERROR"] = "21";
        PURCHASES_ERROR_CODE2["LOG_OUT_ANONYMOUS_USER_ERROR"] = "22";
        PURCHASES_ERROR_CODE2["CONFIGURATION_ERROR"] = "23";
        PURCHASES_ERROR_CODE2["UNSUPPORTED_ERROR"] = "24";
        PURCHASES_ERROR_CODE2["EMPTY_SUBSCRIBER_ATTRIBUTES_ERROR"] = "25";
        PURCHASES_ERROR_CODE2["PRODUCT_DISCOUNT_MISSING_IDENTIFIER_ERROR"] = "26";
        PURCHASES_ERROR_CODE2["PRODUCT_DISCOUNT_MISSING_SUBSCRIPTION_GROUP_IDENTIFIER_ERROR"] = "28";
        PURCHASES_ERROR_CODE2["CUSTOMER_INFO_ERROR"] = "29";
        PURCHASES_ERROR_CODE2["SYSTEM_INFO_ERROR"] = "30";
        PURCHASES_ERROR_CODE2["BEGIN_REFUND_REQUEST_ERROR"] = "31";
        PURCHASES_ERROR_CODE2["PRODUCT_REQUEST_TIMED_OUT_ERROR"] = "32";
        PURCHASES_ERROR_CODE2["API_ENDPOINT_BLOCKED"] = "33";
        PURCHASES_ERROR_CODE2["INVALID_PROMOTIONAL_OFFER_ERROR"] = "34";
        PURCHASES_ERROR_CODE2["OFFLINE_CONNECTION_ERROR"] = "35";
        PURCHASES_ERROR_CODE2["TEST_STORE_SIMULATED_PURCHASE_ERROR"] = "42";
      })(PURCHASES_ERROR_CODE || (PURCHASES_ERROR_CODE = {}));
      UninitializedPurchasesError = /** @class */
      (function(_super) {
        __extends(UninitializedPurchasesError2, _super);
        function UninitializedPurchasesError2() {
          var _this = _super.call(this, "There is no singleton instance. Make sure you configure Purchases before trying to get the default instance. More info here: https://errors.rev.cat/configuring-sdk") || this;
          Object.setPrototypeOf(_this, UninitializedPurchasesError2.prototype);
          return _this;
        }
        return UninitializedPurchasesError2;
      })(Error);
      UnsupportedPlatformError = /** @class */
      (function(_super) {
        __extends(UnsupportedPlatformError2, _super);
        function UnsupportedPlatformError2() {
          var _this = _super.call(this, "This method is not available in the current platform.") || this;
          Object.setPrototypeOf(_this, UnsupportedPlatformError2.prototype);
          return _this;
        }
        return UnsupportedPlatformError2;
      })(Error);
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/customerInfo.js
  var init_customerInfo = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/customerInfo.js"() {
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/offerings.js
  var PACKAGE_TYPE, INTRO_ELIGIBILITY_STATUS, PRODUCT_CATEGORY, PRODUCT_TYPE, PRORATION_MODE, RECURRENCE_MODE, OFFER_PAYMENT_MODE, PERIOD_UNIT;
  var init_offerings = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/offerings.js"() {
      (function(PACKAGE_TYPE2) {
        PACKAGE_TYPE2["UNKNOWN"] = "UNKNOWN";
        PACKAGE_TYPE2["CUSTOM"] = "CUSTOM";
        PACKAGE_TYPE2["LIFETIME"] = "LIFETIME";
        PACKAGE_TYPE2["ANNUAL"] = "ANNUAL";
        PACKAGE_TYPE2["SIX_MONTH"] = "SIX_MONTH";
        PACKAGE_TYPE2["THREE_MONTH"] = "THREE_MONTH";
        PACKAGE_TYPE2["TWO_MONTH"] = "TWO_MONTH";
        PACKAGE_TYPE2["MONTHLY"] = "MONTHLY";
        PACKAGE_TYPE2["WEEKLY"] = "WEEKLY";
      })(PACKAGE_TYPE || (PACKAGE_TYPE = {}));
      (function(INTRO_ELIGIBILITY_STATUS2) {
        INTRO_ELIGIBILITY_STATUS2[INTRO_ELIGIBILITY_STATUS2["INTRO_ELIGIBILITY_STATUS_UNKNOWN"] = 0] = "INTRO_ELIGIBILITY_STATUS_UNKNOWN";
        INTRO_ELIGIBILITY_STATUS2[INTRO_ELIGIBILITY_STATUS2["INTRO_ELIGIBILITY_STATUS_INELIGIBLE"] = 1] = "INTRO_ELIGIBILITY_STATUS_INELIGIBLE";
        INTRO_ELIGIBILITY_STATUS2[INTRO_ELIGIBILITY_STATUS2["INTRO_ELIGIBILITY_STATUS_ELIGIBLE"] = 2] = "INTRO_ELIGIBILITY_STATUS_ELIGIBLE";
        INTRO_ELIGIBILITY_STATUS2[INTRO_ELIGIBILITY_STATUS2["INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS"] = 3] = "INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS";
      })(INTRO_ELIGIBILITY_STATUS || (INTRO_ELIGIBILITY_STATUS = {}));
      (function(PRODUCT_CATEGORY2) {
        PRODUCT_CATEGORY2["NON_SUBSCRIPTION"] = "NON_SUBSCRIPTION";
        PRODUCT_CATEGORY2["SUBSCRIPTION"] = "SUBSCRIPTION";
        PRODUCT_CATEGORY2["UNKNOWN"] = "UNKNOWN";
      })(PRODUCT_CATEGORY || (PRODUCT_CATEGORY = {}));
      (function(PRODUCT_TYPE2) {
        PRODUCT_TYPE2["CONSUMABLE"] = "CONSUMABLE";
        PRODUCT_TYPE2["NON_CONSUMABLE"] = "NON_CONSUMABLE";
        PRODUCT_TYPE2["NON_RENEWABLE_SUBSCRIPTION"] = "NON_RENEWABLE_SUBSCRIPTION";
        PRODUCT_TYPE2["AUTO_RENEWABLE_SUBSCRIPTION"] = "AUTO_RENEWABLE_SUBSCRIPTION";
        PRODUCT_TYPE2["PREPAID_SUBSCRIPTION"] = "PREPAID_SUBSCRIPTION";
        PRODUCT_TYPE2["UNKNOWN"] = "UNKNOWN";
      })(PRODUCT_TYPE || (PRODUCT_TYPE = {}));
      (function(PRORATION_MODE2) {
        PRORATION_MODE2[PRORATION_MODE2["UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY"] = 0] = "UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY";
        PRORATION_MODE2[PRORATION_MODE2["IMMEDIATE_WITH_TIME_PRORATION"] = 1] = "IMMEDIATE_WITH_TIME_PRORATION";
        PRORATION_MODE2[PRORATION_MODE2["IMMEDIATE_AND_CHARGE_PRORATED_PRICE"] = 2] = "IMMEDIATE_AND_CHARGE_PRORATED_PRICE";
        PRORATION_MODE2[PRORATION_MODE2["IMMEDIATE_WITHOUT_PRORATION"] = 3] = "IMMEDIATE_WITHOUT_PRORATION";
        PRORATION_MODE2[PRORATION_MODE2["DEFERRED"] = 6] = "DEFERRED";
        PRORATION_MODE2[PRORATION_MODE2["IMMEDIATE_AND_CHARGE_FULL_PRICE"] = 5] = "IMMEDIATE_AND_CHARGE_FULL_PRICE";
      })(PRORATION_MODE || (PRORATION_MODE = {}));
      (function(RECURRENCE_MODE2) {
        RECURRENCE_MODE2[RECURRENCE_MODE2["INFINITE_RECURRING"] = 1] = "INFINITE_RECURRING";
        RECURRENCE_MODE2[RECURRENCE_MODE2["FINITE_RECURRING"] = 2] = "FINITE_RECURRING";
        RECURRENCE_MODE2[RECURRENCE_MODE2["NON_RECURRING"] = 3] = "NON_RECURRING";
      })(RECURRENCE_MODE || (RECURRENCE_MODE = {}));
      (function(OFFER_PAYMENT_MODE2) {
        OFFER_PAYMENT_MODE2["FREE_TRIAL"] = "FREE_TRIAL";
        OFFER_PAYMENT_MODE2["SINGLE_PAYMENT"] = "SINGLE_PAYMENT";
        OFFER_PAYMENT_MODE2["DISCOUNTED_RECURRING_PAYMENT"] = "DISCOUNTED_RECURRING_PAYMENT";
      })(OFFER_PAYMENT_MODE || (OFFER_PAYMENT_MODE = {}));
      (function(PERIOD_UNIT2) {
        PERIOD_UNIT2["DAY"] = "DAY";
        PERIOD_UNIT2["WEEK"] = "WEEK";
        PERIOD_UNIT2["MONTH"] = "MONTH";
        PERIOD_UNIT2["YEAR"] = "YEAR";
        PERIOD_UNIT2["UNKNOWN"] = "UNKNOWN";
      })(PERIOD_UNIT || (PERIOD_UNIT = {}));
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/enums.js
  var PURCHASE_TYPE, BILLING_FEATURE, REFUND_REQUEST_STATUS, LOG_LEVEL, IN_APP_MESSAGE_TYPE, ENTITLEMENT_VERIFICATION_MODE, VERIFICATION_RESULT, PAYWALL_RESULT, STOREKIT_VERSION, PURCHASES_ARE_COMPLETED_BY_TYPE;
  var init_enums = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/enums.js"() {
      (function(PURCHASE_TYPE2) {
        PURCHASE_TYPE2["INAPP"] = "inapp";
        PURCHASE_TYPE2["SUBS"] = "subs";
      })(PURCHASE_TYPE || (PURCHASE_TYPE = {}));
      (function(BILLING_FEATURE2) {
        BILLING_FEATURE2[BILLING_FEATURE2["SUBSCRIPTIONS"] = 0] = "SUBSCRIPTIONS";
        BILLING_FEATURE2[BILLING_FEATURE2["SUBSCRIPTIONS_UPDATE"] = 1] = "SUBSCRIPTIONS_UPDATE";
        BILLING_FEATURE2[BILLING_FEATURE2["IN_APP_ITEMS_ON_VR"] = 2] = "IN_APP_ITEMS_ON_VR";
        BILLING_FEATURE2[BILLING_FEATURE2["SUBSCRIPTIONS_ON_VR"] = 3] = "SUBSCRIPTIONS_ON_VR";
        BILLING_FEATURE2[BILLING_FEATURE2["PRICE_CHANGE_CONFIRMATION"] = 4] = "PRICE_CHANGE_CONFIRMATION";
      })(BILLING_FEATURE || (BILLING_FEATURE = {}));
      (function(REFUND_REQUEST_STATUS2) {
        REFUND_REQUEST_STATUS2[REFUND_REQUEST_STATUS2["SUCCESS"] = 0] = "SUCCESS";
        REFUND_REQUEST_STATUS2[REFUND_REQUEST_STATUS2["USER_CANCELLED"] = 1] = "USER_CANCELLED";
        REFUND_REQUEST_STATUS2[REFUND_REQUEST_STATUS2["ERROR"] = 2] = "ERROR";
      })(REFUND_REQUEST_STATUS || (REFUND_REQUEST_STATUS = {}));
      (function(LOG_LEVEL2) {
        LOG_LEVEL2["VERBOSE"] = "VERBOSE";
        LOG_LEVEL2["DEBUG"] = "DEBUG";
        LOG_LEVEL2["INFO"] = "INFO";
        LOG_LEVEL2["WARN"] = "WARN";
        LOG_LEVEL2["ERROR"] = "ERROR";
      })(LOG_LEVEL || (LOG_LEVEL = {}));
      (function(IN_APP_MESSAGE_TYPE2) {
        IN_APP_MESSAGE_TYPE2[IN_APP_MESSAGE_TYPE2["BILLING_ISSUE"] = 0] = "BILLING_ISSUE";
        IN_APP_MESSAGE_TYPE2[IN_APP_MESSAGE_TYPE2["PRICE_INCREASE_CONSENT"] = 1] = "PRICE_INCREASE_CONSENT";
        IN_APP_MESSAGE_TYPE2[IN_APP_MESSAGE_TYPE2["GENERIC"] = 2] = "GENERIC";
        IN_APP_MESSAGE_TYPE2[IN_APP_MESSAGE_TYPE2["WIN_BACK_OFFER"] = 3] = "WIN_BACK_OFFER";
      })(IN_APP_MESSAGE_TYPE || (IN_APP_MESSAGE_TYPE = {}));
      (function(ENTITLEMENT_VERIFICATION_MODE2) {
        ENTITLEMENT_VERIFICATION_MODE2["DISABLED"] = "DISABLED";
        ENTITLEMENT_VERIFICATION_MODE2["INFORMATIONAL"] = "INFORMATIONAL";
      })(ENTITLEMENT_VERIFICATION_MODE || (ENTITLEMENT_VERIFICATION_MODE = {}));
      (function(VERIFICATION_RESULT2) {
        VERIFICATION_RESULT2["NOT_REQUESTED"] = "NOT_REQUESTED";
        VERIFICATION_RESULT2["VERIFIED"] = "VERIFIED";
        VERIFICATION_RESULT2["FAILED"] = "FAILED";
        VERIFICATION_RESULT2["VERIFIED_ON_DEVICE"] = "VERIFIED_ON_DEVICE";
      })(VERIFICATION_RESULT || (VERIFICATION_RESULT = {}));
      (function(PAYWALL_RESULT2) {
        PAYWALL_RESULT2["NOT_PRESENTED"] = "NOT_PRESENTED";
        PAYWALL_RESULT2["ERROR"] = "ERROR";
        PAYWALL_RESULT2["CANCELLED"] = "CANCELLED";
        PAYWALL_RESULT2["PURCHASED"] = "PURCHASED";
        PAYWALL_RESULT2["RESTORED"] = "RESTORED";
      })(PAYWALL_RESULT || (PAYWALL_RESULT = {}));
      (function(STOREKIT_VERSION2) {
        STOREKIT_VERSION2["STOREKIT_1"] = "STOREKIT_1";
        STOREKIT_VERSION2["STOREKIT_2"] = "STOREKIT_2";
        STOREKIT_VERSION2["DEFAULT"] = "DEFAULT";
      })(STOREKIT_VERSION || (STOREKIT_VERSION = {}));
      (function(PURCHASES_ARE_COMPLETED_BY_TYPE2) {
        PURCHASES_ARE_COMPLETED_BY_TYPE2["MY_APP"] = "MY_APP";
        PURCHASES_ARE_COMPLETED_BY_TYPE2["REVENUECAT"] = "REVENUECAT";
      })(PURCHASES_ARE_COMPLETED_BY_TYPE || (PURCHASES_ARE_COMPLETED_BY_TYPE = {}));
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/purchaseParams.js
  var init_purchaseParams = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/purchaseParams.js"() {
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/purchasesConfiguration.js
  var init_purchasesConfiguration = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/purchasesConfiguration.js"() {
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/callbackTypes.js
  var init_callbackTypes = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/callbackTypes.js"() {
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/webRedemption.js
  var WebPurchaseRedemptionResultType;
  var init_webRedemption = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/webRedemption.js"() {
      (function(WebPurchaseRedemptionResultType2) {
        WebPurchaseRedemptionResultType2["SUCCESS"] = "SUCCESS";
        WebPurchaseRedemptionResultType2["ERROR"] = "ERROR";
        WebPurchaseRedemptionResultType2["PURCHASE_BELONGS_TO_OTHER_USER"] = "PURCHASE_BELONGS_TO_OTHER_USER";
        WebPurchaseRedemptionResultType2["INVALID_TOKEN"] = "INVALID_TOKEN";
        WebPurchaseRedemptionResultType2["EXPIRED"] = "EXPIRED";
      })(WebPurchaseRedemptionResultType || (WebPurchaseRedemptionResultType = {}));
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/storefront.js
  var init_storefront = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/storefront.js"() {
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/virtualCurrency.js
  var init_virtualCurrency = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/virtualCurrency.js"() {
    }
  });

  // node_modules/@revenuecat/purchases-typescript-internal-esm/dist/index.js
  var init_dist2 = __esm({
    "node_modules/@revenuecat/purchases-typescript-internal-esm/dist/index.js"() {
      init_errors();
      init_customerInfo();
      init_offerings();
      init_enums();
      init_purchaseParams();
      init_purchasesConfiguration();
      init_callbackTypes();
      init_webRedemption();
      init_storefront();
      init_virtualCurrency();
    }
  });

  // node_modules/@revenuecat/purchases-capacitor/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    PurchasesWeb: () => PurchasesWeb
  });
  var PurchasesWeb;
  var init_web = __esm({
    "node_modules/@revenuecat/purchases-capacitor/dist/esm/web.js"() {
      init_dist();
      init_dist2();
      PurchasesWeb = class extends WebPlugin {
        constructor() {
          super(...arguments);
          this.shouldMockWebResults = false;
          this.webNotSupportedErrorMessage = "Web not supported in this plugin.";
          this.mockEmptyCustomerInfo = {
            entitlements: {
              all: {},
              active: {},
              verification: VERIFICATION_RESULT.NOT_REQUESTED
            },
            activeSubscriptions: [],
            allPurchasedProductIdentifiers: [],
            latestExpirationDate: null,
            firstSeen: "2023-08-31T15:11:21.445Z",
            originalAppUserId: "mock-web-user-id",
            requestDate: "2023-08-31T15:11:21.445Z",
            allExpirationDates: {},
            allPurchaseDates: {},
            originalApplicationVersion: null,
            originalPurchaseDate: null,
            managementURL: null,
            nonSubscriptionTransactions: [],
            subscriptionsByProductIdentifier: {}
          };
          this.mockEmptyVirtualCurrencies = {
            all: {}
          };
        }
        configure(_configuration) {
          return this.mockNonReturningFunctionIfEnabled("configure");
        }
        parseAsWebPurchaseRedemption(_options) {
          return this.mockReturningFunctionIfEnabled("parseAsWebPurchaseRedemption", { webPurchaseRedemption: null });
        }
        redeemWebPurchase(_options) {
          return this.mockReturningFunctionIfEnabled("redeemWebPurchase", {
            result: WebPurchaseRedemptionResultType.INVALID_TOKEN
          });
        }
        setMockWebResults(options) {
          this.shouldMockWebResults = options.shouldMockWebResults;
          return Promise.resolve();
        }
        setSimulatesAskToBuyInSandbox(_simulatesAskToBuyInSandbox) {
          return this.mockNonReturningFunctionIfEnabled("setSimulatesAskToBuyInSandbox");
        }
        addCustomerInfoUpdateListener(_customerInfoUpdateListener) {
          return this.mockReturningFunctionIfEnabled("addCustomerInfoUpdateListener", "mock-callback-id");
        }
        removeCustomerInfoUpdateListener(_options) {
          return this.mockReturningFunctionIfEnabled("removeCustomerInfoUpdateListener", { wasRemoved: false });
        }
        addShouldPurchasePromoProductListener(_shouldPurchasePromoProductListener) {
          return this.mockReturningFunctionIfEnabled("addShouldPurchasePromoProductListener", "mock-callback-id");
        }
        removeShouldPurchasePromoProductListener(_listenerToRemove) {
          return this.mockReturningFunctionIfEnabled("removeShouldPurchasePromoProductListener", { wasRemoved: false });
        }
        getOfferings() {
          const mockOfferings = {
            all: {},
            current: null
          };
          return this.mockReturningFunctionIfEnabled("getOfferings", mockOfferings);
        }
        getCurrentOfferingForPlacement(_options) {
          const mockOffering = null;
          return this.mockReturningFunctionIfEnabled("getCurrentOfferingForPlacement", mockOffering);
        }
        syncAttributesAndOfferingsIfNeeded() {
          const mockOfferings = {
            all: {},
            current: null
          };
          return this.mockReturningFunctionIfEnabled("syncAttributesAndOfferingsIfNeeded", mockOfferings);
        }
        getProducts(_options) {
          const mockProducts = { products: [] };
          return this.mockReturningFunctionIfEnabled("getProducts", mockProducts);
        }
        purchaseStoreProduct(_options) {
          const mockPurchaseResult = {
            productIdentifier: _options.product.identifier,
            customerInfo: this.mockEmptyCustomerInfo,
            transaction: this.mockTransaction(_options.product.identifier)
          };
          return this.mockReturningFunctionIfEnabled("purchaseStoreProduct", mockPurchaseResult);
        }
        purchaseDiscountedProduct(_options) {
          const mockPurchaseResult = {
            productIdentifier: _options.product.identifier,
            customerInfo: this.mockEmptyCustomerInfo,
            transaction: this.mockTransaction(_options.product.identifier)
          };
          return this.mockReturningFunctionIfEnabled("purchaseDiscountedProduct", mockPurchaseResult);
        }
        purchasePackage(_options) {
          const mockPurchaseResult = {
            productIdentifier: _options.aPackage.product.identifier,
            customerInfo: this.mockEmptyCustomerInfo,
            transaction: this.mockTransaction(_options.aPackage.product.identifier)
          };
          return this.mockReturningFunctionIfEnabled("purchasePackage", mockPurchaseResult);
        }
        purchaseSubscriptionOption(_options) {
          const mockPurchaseResult = {
            productIdentifier: _options.subscriptionOption.productId,
            customerInfo: this.mockEmptyCustomerInfo,
            transaction: this.mockTransaction(_options.subscriptionOption.productId)
          };
          return this.mockReturningFunctionIfEnabled("purchaseSubscriptionOption", mockPurchaseResult);
        }
        purchaseDiscountedPackage(_options) {
          const mockPurchaseResult = {
            productIdentifier: _options.aPackage.product.identifier,
            customerInfo: this.mockEmptyCustomerInfo,
            transaction: this.mockTransaction(_options.aPackage.product.identifier)
          };
          return this.mockReturningFunctionIfEnabled("purchaseDiscountedPackage", mockPurchaseResult);
        }
        restorePurchases() {
          const mockResponse = { customerInfo: this.mockEmptyCustomerInfo };
          return this.mockReturningFunctionIfEnabled("restorePurchases", mockResponse);
        }
        recordPurchase(options) {
          const mockResponse = {
            transaction: this.mockTransaction(options.productID)
          };
          return this.mockReturningFunctionIfEnabled("recordPurchase", mockResponse);
        }
        getAppUserID() {
          return this.mockReturningFunctionIfEnabled("getAppUserID", {
            appUserID: "test-web-user-id"
          });
        }
        getStorefront() {
          return this.mockReturningFunctionIfEnabled("getStorefront", {
            countryCode: "USA"
          });
        }
        logIn(_appUserID) {
          const mockLogInResult = {
            customerInfo: this.mockEmptyCustomerInfo,
            created: false
          };
          return this.mockReturningFunctionIfEnabled("logIn", mockLogInResult);
        }
        logOut() {
          const mockResponse = { customerInfo: this.mockEmptyCustomerInfo };
          return this.mockReturningFunctionIfEnabled("logOut", mockResponse);
        }
        setLogLevel(_level) {
          return this.mockNonReturningFunctionIfEnabled("setLogLevel");
        }
        setLogHandler(_logHandler) {
          return this.mockNonReturningFunctionIfEnabled("setLogHandler");
        }
        getCustomerInfo() {
          const mockResponse = { customerInfo: this.mockEmptyCustomerInfo };
          return this.mockReturningFunctionIfEnabled("getCustomerInfo", mockResponse);
        }
        syncPurchases() {
          return this.mockNonReturningFunctionIfEnabled("syncPurchases");
        }
        syncObserverModeAmazonPurchase(_options) {
          return this.mockNonReturningFunctionIfEnabled("syncObserverModeAmazonPurchase");
        }
        syncAmazonPurchase(_options) {
          return this.mockNonReturningFunctionIfEnabled("syncAmazonPurchase");
        }
        enableAdServicesAttributionTokenCollection() {
          return this.mockNonReturningFunctionIfEnabled("enableAdServicesAttributionTokenCollection");
        }
        isAnonymous() {
          const mockResponse = { isAnonymous: false };
          return this.mockReturningFunctionIfEnabled("isAnonymous", mockResponse);
        }
        checkTrialOrIntroductoryPriceEligibility(_productIdentifiers) {
          return this.mockReturningFunctionIfEnabled("checkTrialOrIntroductoryPriceEligibility", {});
        }
        getPromotionalOffer(_options) {
          return this.mockReturningFunctionIfEnabled("getPromotionalOffer", void 0);
        }
        getEligibleWinBackOffersForProduct(_options) {
          return this.mockReturningFunctionIfEnabled("getEligibleWinBackOffersForProduct", { eligibleWinBackOffers: [] });
        }
        getEligibleWinBackOffersForPackage(_options) {
          return this.mockReturningFunctionIfEnabled("getEligibleWinBackOffersForPackage", { eligibleWinBackOffers: [] });
        }
        purchaseProductWithWinBackOffer(_options) {
          return this.mockReturningFunctionIfEnabled("purchaseProductWithWinBackOffer", void 0);
        }
        purchasePackageWithWinBackOffer(_options) {
          return this.mockReturningFunctionIfEnabled("purchasePackageWithWinBackOffer", void 0);
        }
        invalidateCustomerInfoCache() {
          return this.mockNonReturningFunctionIfEnabled("invalidateCustomerInfoCache");
        }
        presentCodeRedemptionSheet() {
          return this.mockNonReturningFunctionIfEnabled("presentCodeRedemptionSheet");
        }
        setAttributes(_attributes) {
          return this.mockNonReturningFunctionIfEnabled("setAttributes");
        }
        setEmail(_email) {
          return this.mockNonReturningFunctionIfEnabled("setEmail");
        }
        setPhoneNumber(_phoneNumber) {
          return this.mockNonReturningFunctionIfEnabled("setPhoneNumber");
        }
        setDisplayName(_displayName) {
          return this.mockNonReturningFunctionIfEnabled("setDisplayName");
        }
        setPushToken(_pushToken) {
          return this.mockNonReturningFunctionIfEnabled("setPushToken");
        }
        setProxyURL(_url) {
          return this.mockNonReturningFunctionIfEnabled("setProxyURL");
        }
        collectDeviceIdentifiers() {
          return this.mockNonReturningFunctionIfEnabled("collectDeviceIdentifiers");
        }
        setAdjustID(_adjustID) {
          return this.mockNonReturningFunctionIfEnabled("setAdjustID");
        }
        setAppsflyerID(_appsflyerID) {
          return this.mockNonReturningFunctionIfEnabled("setAppsflyerID");
        }
        setFBAnonymousID(_fbAnonymousID) {
          return this.mockNonReturningFunctionIfEnabled("setFBAnonymousID");
        }
        setMparticleID(_mparticleID) {
          return this.mockNonReturningFunctionIfEnabled("setMparticleID");
        }
        setCleverTapID(_cleverTapID) {
          return this.mockNonReturningFunctionIfEnabled("setCleverTapID");
        }
        setMixpanelDistinctID(_mixpanelDistinctID) {
          return this.mockNonReturningFunctionIfEnabled("setMixpanelDistinctID");
        }
        setFirebaseAppInstanceID(_firebaseAppInstanceID) {
          return this.mockNonReturningFunctionIfEnabled("setFirebaseAppInstanceID");
        }
        setOnesignalID(_onesignalID) {
          return this.mockNonReturningFunctionIfEnabled("setOnesignalID");
        }
        setOnesignalUserID(_onesignalUserID) {
          return this.mockNonReturningFunctionIfEnabled("setOnesignalUserID");
        }
        setAirshipChannelID(_airshipChannelID) {
          return this.mockNonReturningFunctionIfEnabled("setAirshipChannelID");
        }
        setMediaSource(_mediaSource) {
          return this.mockNonReturningFunctionIfEnabled("setMediaSource");
        }
        setCampaign(_campaign) {
          return this.mockNonReturningFunctionIfEnabled("setCampaign");
        }
        setAdGroup(_adGroup) {
          return this.mockNonReturningFunctionIfEnabled("setAdGroup");
        }
        setAd(_ad) {
          return this.mockNonReturningFunctionIfEnabled("setAd");
        }
        setKeyword(_keyword) {
          return this.mockNonReturningFunctionIfEnabled("setKeyword");
        }
        setCreative(_creative) {
          return this.mockNonReturningFunctionIfEnabled("setCreative");
        }
        canMakePayments(_features) {
          return this.mockReturningFunctionIfEnabled("canMakePayments", {
            canMakePayments: true
          });
        }
        beginRefundRequestForActiveEntitlement() {
          const mockResult = {
            refundRequestStatus: REFUND_REQUEST_STATUS.USER_CANCELLED
          };
          return this.mockReturningFunctionIfEnabled("beginRefundRequestForActiveEntitlement", mockResult);
        }
        beginRefundRequestForEntitlement(_entitlementInfo) {
          const mockResult = {
            refundRequestStatus: REFUND_REQUEST_STATUS.USER_CANCELLED
          };
          return this.mockReturningFunctionIfEnabled("beginRefundRequestForEntitlement", mockResult);
        }
        beginRefundRequestForProduct(_storeProduct) {
          const mockResult = {
            refundRequestStatus: REFUND_REQUEST_STATUS.USER_CANCELLED
          };
          return this.mockReturningFunctionIfEnabled("beginRefundRequestForProduct", mockResult);
        }
        showInAppMessages(_options) {
          return this.mockNonReturningFunctionIfEnabled("showInAppMessages");
        }
        isConfigured() {
          const mockResult = { isConfigured: true };
          return this.mockReturningFunctionIfEnabled("isConfigured", mockResult);
        }
        getVirtualCurrencies() {
          return this.mockReturningFunctionIfEnabled("getVirtualCurrencies", {
            virtualCurrencies: this.mockEmptyVirtualCurrencies
          });
        }
        invalidateVirtualCurrenciesCache() {
          return this.mockNonReturningFunctionIfEnabled("invalidateVirtualCurrenciesCache");
        }
        getCachedVirtualCurrencies() {
          return this.mockReturningFunctionIfEnabled("getCachedVirtualCurrencies", {
            cachedVirtualCurrencies: this.mockEmptyVirtualCurrencies
          });
        }
        mockTransaction(productIdentifier) {
          return {
            productIdentifier,
            purchaseDate: (/* @__PURE__ */ new Date()).toISOString(),
            transactionIdentifier: ""
          };
        }
        mockNonReturningFunctionIfEnabled(functionName) {
          if (!this.shouldMockWebResults) {
            return Promise.reject(this.webNotSupportedErrorMessage);
          }
          console.log(`${functionName} called on web with mocking enabled. No-op`);
          return Promise.resolve();
        }
        mockReturningFunctionIfEnabled(functionName, returnValue) {
          if (!this.shouldMockWebResults) {
            return Promise.reject(this.webNotSupportedErrorMessage);
          }
          console.log(`${functionName} called on web with mocking enabled. Returning mocked value`);
          return Promise.resolve(returnValue);
        }
      };
    }
  });

  // src/app.js
  init_dist();

  // node_modules/@revenuecat/purchases-capacitor/dist/esm/index.js
  init_dist();

  // node_modules/@revenuecat/purchases-capacitor/dist/esm/definitions.js
  init_dist2();

  // node_modules/@revenuecat/purchases-capacitor/dist/esm/index.js
  var Purchases = registerPlugin("Purchases", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.PurchasesWeb())
  });

  // shared/monetization-catalog.js
  var MONETIZATION_CATALOG = {
    defaultWallet: {
      gems: 150
    },
    entitlementIds: {
      riftPass: "premium_rift_pass"
    },
    offeringIdentifier: "main",
    packageIds: {
      starterPack: "starter_pack",
      riftPassMonthly: "rift_pass_monthly",
      gemVault1800: "gem_vault_1800"
    },
    productIds: {
      apple: {
        starterPack: "com.nickciaff.riftraiders.starterpack",
        riftPassMonthly: "com.nickciaff.riftraiders.riftpass.monthly",
        gemVault1800: "com.nickciaff.riftraiders.gemvault.1800"
      },
      google: {
        starterPack: "com.nickciaff.riftraiders.starterpack",
        riftPassMonthly: "com.nickciaff.riftraiders.riftpass.monthly",
        gemVault1800: "com.nickciaff.riftraiders.gemvault.1800"
      }
    },
    packageRewards: {
      starter_pack: {
        gems: 250,
        gold: 1200,
        note: "Starter Cache",
        storeType: "one_time",
        revenueCatPackage: "starter_pack"
      },
      rift_pass_monthly: {
        gems: 700,
        gold: 3e3,
        note: "Rift Pass Monthly",
        storeType: "subscription",
        revenueCatPackage: "rift_pass_monthly"
      },
      gem_vault_1800: {
        gems: 1800,
        gold: 0,
        note: "Gem Vault 1800",
        storeType: "consumable",
        revenueCatPackage: "gem_vault_1800"
      }
    }
  };

  // src/iap-config.js
  var IAP_CONFIG = {
    ...MONETIZATION_CATALOG,
    appleApiKey: "appl_public_sdk_key_here",
    googleApiKey: "goog_public_sdk_key_here",
    backend: {
      baseUrl: "http://10.0.2.2:8787",
      apiToken: "dev-token-change-me"
    }
  };

  // src/app.js
  var STORAGE_KEY = "rift-raiders-save-v2";
  var TICK_MS = 250;
  var companionsPool = [
    { name: "Spark Fox", rarity: "Rare", bonus: 1.12, flavor: "Boosts crit damage through static arcs." },
    { name: "Lantern Wisp", rarity: "Common", bonus: 1.08, flavor: "Adds safe auto-battle damage over time." },
    { name: "Moss Golem", rarity: "Epic", bonus: 1.22, flavor: "Turns max HP into bonus attack." },
    { name: "Ash Drake", rarity: "Legendary", bonus: 1.35, flavor: "Massive burst against bosses." },
    { name: "Coin Mantis", rarity: "Rare", bonus: 1.15, flavor: "Improves gold drops from elite kills." }
  ];
  var fallbackOffers = [
    { identifier: IAP_CONFIG.packageIds.starterPack, title: "Starter Cache", price: "$1.99", description: "250 gems \u2022 1200 gold" },
    { identifier: IAP_CONFIG.packageIds.riftPassMonthly, title: "Rift Pass Monthly", price: "$4.99", description: "700 gems \u2022 3000 gold \u2022 premium perks" },
    { identifier: IAP_CONFIG.packageIds.gemVault1800, title: "Gem Vault 1800", price: "$9.99", description: "1800 gems" }
  ];
  var quests = [
    { title: "Clean Sweep", desc: "Defeat 8 enemies", target: 8, type: "kills", reward: { gold: 500, gems: 30 } },
    { title: "Burst Damage", desc: "Use Rift Burst 5 times", target: 5, type: "skills", reward: { gold: 300, gems: 40 } },
    { title: "Deep Dive", desc: "Clear 3 stages", target: 3, type: "stages", reward: { gold: 900, gems: 60 } }
  ];
  var runtime = {
    offerings: [],
    currentOfferingId: null,
    storeStatus: "Connecting store...",
    purchaseInFlight: false,
    billingReady: false,
    customerInfoListener: null,
    appUserId: null,
    walletEnabled: false,
    walletSyncInFlight: false,
    walletQueue: Promise.resolve()
  };
  var defaultState = () => ({
    gold: 400,
    gems: 150,
    stage: 1,
    wave: 1,
    enemy: buildEnemy(1, 1),
    player: {
      attack: 18,
      hpMax: 150,
      hp: 150,
      critRate: 0.1,
      critDamage: 1.8,
      lifesteal: 0.03
    },
    upgrades: { attack: 0, health: 0, crit: 0, lifesteal: 0 },
    companions: [],
    autoBattle: true,
    forcedBoss: false,
    stats: { kills: 0, skills: 0, stages: 0, damageDone: 0 },
    questIndex: 0,
    questClaimed: false,
    lastSaved: Date.now(),
    lastOpened: Date.now(),
    monetization: {
      platform: "web",
      premiumActive: false,
      lastStoreSync: null,
      lastWalletSync: null
    },
    battleLog: ["The first breach opens under a blood-orange sky."]
  });
  var state = loadState();
  var els = {};
  document.addEventListener("DOMContentLoaded", async () => {
    bindElements();
    bindEvents();
    render();
    await initializeBilling();
    applyIdleRewards();
    render();
    setInterval(gameTick, TICK_MS);
    setInterval(saveState, 5e3);
  });
  window.addEventListener("beforeunload", saveState);
  function bindElements() {
    const ids = [
      "goldValue",
      "gemsValue",
      "powerValue",
      "stageValue",
      "enemyName",
      "enemyFlavor",
      "enemyBadge",
      "enemyHpBar",
      "enemyHpText",
      "dpsValue",
      "critValue",
      "lifestealValue",
      "battleLog",
      "attackUpgradeCost",
      "healthUpgradeCost",
      "critUpgradeCost",
      "lifestealUpgradeCost",
      "questTitle",
      "questDesc",
      "questBar",
      "questProgress",
      "companionsList",
      "offersList",
      "attackBtn",
      "skillBtn",
      "bossBtn",
      "summonBtn",
      "claimQuestBtn",
      "claimIdleBtn",
      "autoBattleToggle",
      "restorePurchasesBtn",
      "storeStatus"
    ];
    ids.forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }
  function bindEvents() {
    els.attackBtn.addEventListener("click", () => hitEnemy(false));
    els.skillBtn.addEventListener("click", castSkill);
    els.bossBtn.addEventListener("click", () => {
      state.forcedBoss = true;
      state.enemy = buildEnemy(state.stage, state.wave, true);
      log("Boss challenge forced. Better kill it fast.");
      render();
    });
    els.summonBtn.addEventListener("click", summonCompanion);
    els.claimQuestBtn.addEventListener("click", claimQuestReward);
    els.claimIdleBtn.addEventListener("click", () => applyIdleRewards(true));
    els.restorePurchasesBtn.addEventListener("click", restorePurchases);
    els.autoBattleToggle.addEventListener("change", (event) => {
      state.autoBattle = event.target.checked;
      render();
    });
    document.querySelectorAll("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
    });
  }
  async function initializeBilling() {
    state.monetization.platform = Capacitor.getPlatform();
    if (!isNativePlatform()) {
      runtime.storeStatus = "Open the Android or iPhone app to test real purchases. Browser mode does not have native billing.";
      render();
      return;
    }
    const apiKey = getRevenueCatApiKey();
    if (!apiKey || apiKey.includes("_here")) {
      runtime.storeStatus = "RevenueCat API key missing. Add your Apple and Google public SDK keys in src/iap-config.js.";
      render();
      return;
    }
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({ apiKey, appUserID: null });
      runtime.appUserId = (await Purchases.getAppUserID()).appUserID;
      await initializeWallet();
      runtime.customerInfoListener = await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        applyCustomerInfo(customerInfo);
        render();
      });
      runtime.billingReady = true;
      runtime.storeStatus = "Store connected. Loading offerings...";
      await refreshStoreState();
    } catch (error) {
      runtime.storeStatus = `Store setup failed: ${getErrorMessage(error)}`;
      render();
    }
  }
  async function initializeWallet() {
    if (!runtime.appUserId) {
      runtime.storeStatus = "Wallet setup failed: RevenueCat app user ID missing.";
      return;
    }
    if (!hasBackendConfig()) {
      runtime.storeStatus = "Backend wallet config missing. Set src/iap-config.js backend.baseUrl and backend.apiToken.";
      return;
    }
    try {
      runtime.walletSyncInFlight = true;
      const response = await backendRequest(`/api/wallet/${encodeURIComponent(runtime.appUserId)}`);
      state.gems = response.wallet.balances.gems || 0;
      state.monetization.lastWalletSync = Date.now();
      runtime.walletEnabled = true;
    } catch (error) {
      runtime.storeStatus = `Wallet sync failed: ${getErrorMessage(error)}`;
    } finally {
      runtime.walletSyncInFlight = false;
    }
  }
  async function refreshStoreState() {
    if (!runtime.billingReady) return;
    try {
      const [{ customerInfo }, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings()
      ]);
      applyCustomerInfo(customerInfo);
      const currentOffering = offerings.current ?? offerings.all?.[IAP_CONFIG.offeringIdentifier] ?? null;
      runtime.currentOfferingId = currentOffering?.identifier ?? null;
      runtime.offerings = (currentOffering?.availablePackages ?? []).map((entry) => ({
        rcPackage: entry,
        identifier: entry.identifier,
        productIdentifier: entry.product.identifier,
        title: entry.product.title || prettifyIdentifier(entry.identifier),
        description: entry.product.description || describeReward(entry.identifier),
        price: entry.product.priceString
      }));
      runtime.storeStatus = runtime.offerings.length ? `Store ready on ${state.monetization.platform}. Offering: ${runtime.currentOfferingId || "current"}.` : "Store connected, but no RevenueCat packages were returned for the current offering.";
    } catch (error) {
      runtime.storeStatus = `Store refresh failed: ${getErrorMessage(error)}`;
    }
    render();
  }
  function gameTick() {
    if (state.autoBattle) {
      hitEnemy(true);
    }
    saveState(false);
    render();
  }
  function hitEnemy(isAuto) {
    const damage = calcDamage(isAuto ? 0.72 : 1);
    state.enemy.hp = Math.max(0, state.enemy.hp - damage);
    state.stats.damageDone += damage;
    healFromLifesteal(damage);
    log(`${isAuto ? "Auto" : "Strike"} hits ${state.enemy.name} for ${formatNumber(damage)}.`);
    if (state.enemy.hp <= 0) {
      killEnemy();
    }
  }
  function castSkill() {
    const damage = calcDamage(2.6);
    updateQuestProgress("skills", 1);
    state.enemy.hp = Math.max(0, state.enemy.hp - damage);
    healFromLifesteal(damage * 1.3);
    log(`Rift Burst detonates for ${formatNumber(damage)} damage.`);
    if (state.enemy.hp <= 0) {
      killEnemy();
    }
    render();
  }
  function killEnemy() {
    const goldReward = Math.round(state.enemy.maxHp * (state.enemy.isBoss ? 0.95 : 0.45) * getPremiumGoldMultiplier());
    const gemReward = state.enemy.isBoss ? 12 + Math.floor(state.stage / 3) : Math.random() < 0.12 ? 3 : 0;
    state.gold += goldReward;
    if (gemReward) {
      scheduleGemGrant(gemReward, state.enemy.isBoss ? "boss_kill" : "enemy_drop");
    }
    updateQuestProgress("kills", 1);
    log(`${state.enemy.name} falls. +${goldReward} gold${gemReward ? `, +${gemReward} gems` : ""}.`);
    advanceWave();
  }
  function advanceWave() {
    if (state.enemy.isBoss || state.wave >= 5) {
      state.stage += 1;
      state.wave = 1;
      updateQuestProgress("stages", 1);
      log(`Stage cleared. The rift deepens to ${state.stage}-1.`);
    } else {
      state.wave += 1;
    }
    state.forcedBoss = false;
    state.enemy = buildEnemy(state.stage, state.wave);
  }
  function buyUpgrade(type) {
    const cost = getUpgradeCost(type);
    if (state.gold < cost) {
      log("Not enough gold for that upgrade.");
      return;
    }
    state.gold -= cost;
    state.upgrades[type] += 1;
    if (type === "attack") state.player.attack += 6;
    if (type === "health") {
      state.player.hpMax += 30;
      state.player.hp = state.player.hpMax;
    }
    if (type === "crit") state.player.critRate += 0.02;
    if (type === "lifesteal") state.player.lifesteal += 0.01;
    log(`Purchased ${type} upgrade.`);
    render();
  }
  async function summonCompanion() {
    if (state.gems < 100) {
      log("Need 100 gems to summon a companion.");
      return;
    }
    const spendApplied = await spendGems(100, "companion_summon");
    if (!spendApplied) {
      return;
    }
    const pick = companionsPool[Math.floor(Math.random() * companionsPool.length)];
    state.companions.push({ ...pick, id: `${pick.name}-${Date.now()}` });
    log(`${pick.rarity} companion summoned: ${pick.name}.`);
    render();
  }
  function claimQuestReward() {
    const quest = getQuest();
    if (state.questClaimed || getQuestCurrentProgress() < quest.target) {
      log("Quest reward is not ready.");
      return;
    }
    state.gold += quest.reward.gold;
    if (quest.reward.gems) {
      scheduleGemGrant(quest.reward.gems, "quest_reward");
    }
    state.questIndex = (state.questIndex + 1) % quests.length;
    state.questClaimed = false;
    resetQuestProgress();
    log(`Quest completed. +${quest.reward.gold} gold and +${quest.reward.gems} gems.`);
    render();
  }
  async function restorePurchases() {
    if (!runtime.billingReady || runtime.purchaseInFlight) {
      log("Billing is not ready yet.");
      return;
    }
    try {
      runtime.purchaseInFlight = true;
      render();
      const { customerInfo } = await Purchases.restorePurchases();
      applyCustomerInfo(customerInfo);
      runtime.storeStatus = "Restore completed.";
      log("Restore Purchases finished.");
      await refreshStoreState();
    } catch (error) {
      runtime.storeStatus = `Restore failed: ${getErrorMessage(error)}`;
      log(runtime.storeStatus);
      render();
    } finally {
      runtime.purchaseInFlight = false;
      render();
    }
  }
  async function handlePurchase(identifier) {
    if (!runtime.billingReady || runtime.purchaseInFlight) return;
    const selected = runtime.offerings.find((entry) => entry.identifier === identifier);
    if (!selected?.rcPackage) {
      runtime.storeStatus = "Selected package is unavailable.";
      render();
      return;
    }
    try {
      runtime.purchaseInFlight = true;
      runtime.storeStatus = `Opening ${selected.title} checkout...`;
      render();
      const result = await Purchases.purchasePackage({
        aPackage: selected.rcPackage,
        googleIsPersonalizedPrice: false
      });
      await reconcilePurchaseGrant({
        packageIdentifier: selected.identifier,
        productIdentifier: selected.productIdentifier,
        transactionIdentifier: result.transaction.transactionIdentifier,
        platform: state.monetization.platform
      });
      applyCustomerInfo(result.customerInfo);
      runtime.storeStatus = `${selected.title} purchase completed.`;
      log(`${selected.title} purchased through ${state.monetization.platform}.`);
      await refreshStoreState();
    } catch (error) {
      const message = getErrorMessage(error);
      runtime.storeStatus = message === "Purchase was cancelled." ? message : `Purchase failed: ${message}`;
      log(runtime.storeStatus);
      render();
    } finally {
      runtime.purchaseInFlight = false;
      render();
    }
  }
  function applyCustomerInfo(customerInfo) {
    const active = customerInfo?.entitlements?.active ?? {};
    state.monetization.premiumActive = Boolean(active[IAP_CONFIG.entitlementIds.riftPass]);
    state.monetization.lastStoreSync = Date.now();
  }
  function applyIdleRewards(fromButton = false) {
    const now = Date.now();
    const elapsedMinutes = Math.min(240, Math.floor((now - state.lastOpened) / 6e4));
    if (!elapsedMinutes) {
      if (fromButton) log("No idle loot ready yet.");
      return;
    }
    const gold = Math.round(elapsedMinutes * getPower() * 0.55 * getPremiumGoldMultiplier());
    const gems = Math.floor(elapsedMinutes / 18);
    state.gold += gold;
    if (gems) {
      scheduleGemGrant(gems, "idle_reward");
    }
    state.lastOpened = now;
    log(`Idle haul collected: ${gold} gold${gems ? ` and ${gems} gems` : ""}.`);
  }
  function buildEnemy(stage, wave, forceBoss = false) {
    const isBoss = forceBoss || wave === 5;
    const tier = stage + wave;
    const name = isBoss ? `Rift Tyrant ${stage}` : ["Void Slime", "Ash Hound", "Shard Priest", "Iron Ghoul"][tier % 4];
    const maxHp = Math.round((70 + stage * 28 + wave * 18) * (isBoss ? 4.3 : 1));
    return {
      name,
      flavor: isBoss ? "Its core pulses with stolen treasure." : "Every kill feeds the breach and your upgrade loop.",
      isBoss,
      maxHp,
      hp: maxHp
    };
  }
  function calcDamage(multiplier) {
    const companionBonus = state.companions.reduce((sum, companion) => sum * companion.bonus, 1);
    const crit = Math.random() < state.player.critRate ? state.player.critDamage : 1;
    const healthBonus = 1 + state.player.hpMax / 1e3 * hasCompanion("Moss Golem") * 0.8;
    const premiumBonus = state.monetization.premiumActive ? 1.12 : 1;
    return Math.round(state.player.attack * multiplier * crit * companionBonus * healthBonus * premiumBonus);
  }
  function healFromLifesteal(damage) {
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + damage * state.player.lifesteal);
  }
  function getPower() {
    const companionMultiplier = state.companions.reduce((sum, companion) => sum + companion.bonus - 1, 1);
    const premiumOffset = state.monetization.premiumActive ? 250 : 0;
    return Math.round(state.player.attack * 4 + state.player.hpMax * 0.7 + state.player.critRate * 600 + companionMultiplier * 180 + premiumOffset);
  }
  function getUpgradeCost(type) {
    const level = state.upgrades[type];
    const base = { attack: 120, health: 140, crit: 180, lifesteal: 220 }[type];
    return Math.round(base * Math.pow(1.45, level));
  }
  function getQuest() {
    return quests[state.questIndex];
  }
  function getQuestCurrentProgress() {
    const type = getQuest().type;
    return state.stats[type];
  }
  function updateQuestProgress(type, amount) {
    const quest = getQuest();
    state.stats[type] += amount;
    if (quest.type === type && state.stats[type] >= quest.target) {
      state.questClaimed = false;
    }
  }
  function resetQuestProgress() {
    state.stats.kills = 0;
    state.stats.skills = 0;
    state.stats.stages = 0;
  }
  function hasCompanion(name) {
    return state.companions.some((companion) => companion.name === name) ? 1 : 0;
  }
  function getPremiumGoldMultiplier() {
    return state.monetization.premiumActive ? 1.2 : 1;
  }
  function log(message) {
    state.battleLog.unshift(message);
    state.battleLog = state.battleLog.slice(0, 18);
  }
  function render() {
    const hpRatio = state.enemy.hp / state.enemy.maxHp * 100;
    const quest = getQuest();
    const questProgress = Math.min(getQuestCurrentProgress(), quest.target);
    els.goldValue.textContent = formatNumber(state.gold);
    els.gemsValue.textContent = formatNumber(state.gems);
    els.powerValue.textContent = formatNumber(getPower());
    els.stageValue.textContent = `${state.stage}-${state.wave}`;
    els.enemyName.textContent = state.enemy.name;
    els.enemyFlavor.textContent = state.enemy.flavor;
    els.enemyBadge.textContent = state.enemy.isBoss ? "Boss" : "Normal";
    els.enemyHpBar.style.width = `${hpRatio}%`;
    els.enemyHpText.textContent = `${formatNumber(state.enemy.hp)} / ${formatNumber(state.enemy.maxHp)} HP`;
    els.dpsValue.textContent = formatNumber(Math.round(calcDamage(0.72) * (1e3 / TICK_MS)));
    els.critValue.textContent = `${Math.round(state.player.critRate * 100)}%`;
    els.lifestealValue.textContent = `${Math.round(state.player.lifesteal * 100)}%`;
    els.attackUpgradeCost.textContent = `${formatNumber(getUpgradeCost("attack"))} gold`;
    els.healthUpgradeCost.textContent = `${formatNumber(getUpgradeCost("health"))} gold`;
    els.critUpgradeCost.textContent = `${formatNumber(getUpgradeCost("crit"))} gold`;
    els.lifestealUpgradeCost.textContent = `${formatNumber(getUpgradeCost("lifesteal"))} gold`;
    els.questTitle.textContent = quest.title;
    els.questDesc.textContent = `${quest.desc}. Reward: ${quest.reward.gold} gold, ${quest.reward.gems} gems.`;
    els.questBar.style.width = `${questProgress / quest.target * 100}%`;
    els.questProgress.textContent = `${questProgress} / ${quest.target}`;
    els.claimQuestBtn.textContent = questProgress >= quest.target ? "Claim Quest Reward" : "Quest In Progress";
    els.autoBattleToggle.checked = state.autoBattle;
    els.restorePurchasesBtn.disabled = !runtime.billingReady || runtime.purchaseInFlight;
    els.storeStatus.textContent = runtime.storeStatus;
    els.storeStatus.className = runtime.billingReady ? "muted status-good" : "muted status-bad";
    els.battleLog.innerHTML = state.battleLog.map((entry) => `<p class="log-entry">${entry}</p>`).join("");
    renderCompanions();
    renderOffers();
  }
  function renderCompanions() {
    if (!state.companions.length) {
      els.companionsList.innerHTML = `<article class="companion-card"><div><h3>No companions yet</h3><p class="muted">Summon allies to compound your power curve.</p></div><strong>0%</strong></article>`;
      return;
    }
    els.companionsList.innerHTML = state.companions.map((companion) => `
      <article class="companion-card">
        <div>
          <h3>${companion.name}</h3>
          <p class="muted">${companion.rarity} \u2022 ${companion.flavor}</p>
        </div>
        <strong>+${Math.round((companion.bonus - 1) * 100)}%</strong>
      </article>
    `).join("");
  }
  function renderOffers() {
    const offers = runtime.offerings.length ? runtime.offerings : fallbackOffers;
    const canPurchase = runtime.billingReady && !runtime.purchaseInFlight;
    els.offersList.innerHTML = offers.map((offer) => `
    <article class="offer-card">
      <div class="offer-meta">
        <h3>${offer.title}</h3>
        <p class="muted">${offer.description || describeReward(offer.identifier)}</p>
        <small class="button-note">${offer.identifier}${state.monetization.premiumActive && offer.identifier === IAP_CONFIG.packageIds.riftPassMonthly ? " \u2022 active" : ""}</small>
      </div>
      <div class="offer-actions">
        <span class="offer-price">${offer.price}</span>
        <button class="primary-button" data-offer="${offer.identifier}" ${canPurchase && runtime.offerings.length ? "" : "disabled"}>
          ${runtime.purchaseInFlight ? "Processing" : runtime.offerings.length ? "Buy" : "Native Only"}
        </button>
      </div>
    </article>
  `).join("");
    document.querySelectorAll("[data-offer]").forEach((button) => {
      button.addEventListener("click", () => handlePurchase(button.dataset.offer));
    });
  }
  function getRevenueCatApiKey() {
    return state.monetization.platform === "ios" ? IAP_CONFIG.appleApiKey : IAP_CONFIG.googleApiKey;
  }
  function hasBackendConfig() {
    return Boolean(IAP_CONFIG.backend?.baseUrl && IAP_CONFIG.backend?.apiToken);
  }
  async function backendRequest(path, options = {}) {
    const response = await fetch(`${IAP_CONFIG.backend.baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${IAP_CONFIG.backend.apiToken}`,
        ...options.headers || {}
      },
      body: options.body ? JSON.stringify(options.body) : void 0
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "backend_request_failed");
    }
    return payload;
  }
  function enqueueWalletOperation(work) {
    runtime.walletQueue = runtime.walletQueue.then(work).catch((error) => {
      log(`Wallet sync failed: ${getErrorMessage(error)}`);
      render();
      return null;
    });
    return runtime.walletQueue;
  }
  function scheduleGemGrant(amount, reason) {
    state.gems += amount;
    render();
    if (!runtime.walletEnabled) {
      return;
    }
    const idempotencyKey = `${runtime.appUserId}:${reason}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    enqueueWalletOperation(async () => {
      const payload = await backendRequest("/api/wallet/grant", {
        method: "POST",
        body: {
          appUserId: runtime.appUserId,
          currency: "gems",
          amount,
          reason,
          idempotencyKey
        }
      });
      state.gems = payload.wallet.balances.gems || 0;
      state.monetization.lastWalletSync = Date.now();
      render();
    });
  }
  async function spendGems(amount, reason) {
    if (!runtime.walletEnabled) {
      state.gems -= amount;
      render();
      return true;
    }
    try {
      runtime.walletSyncInFlight = true;
      render();
      const payload = await enqueueWalletOperation(() => backendRequest("/api/wallet/spend", {
        method: "POST",
        body: {
          appUserId: runtime.appUserId,
          currency: "gems",
          amount,
          reason,
          idempotencyKey: `${runtime.appUserId}:${reason}:${Date.now()}`
        }
      }));
      if (!payload) return false;
      state.gems = payload.wallet.balances.gems || 0;
      state.monetization.lastWalletSync = Date.now();
      render();
      return true;
    } catch (error) {
      log(`Spend failed: ${getErrorMessage(error)}`);
      render();
      return false;
    } finally {
      runtime.walletSyncInFlight = false;
    }
  }
  async function reconcilePurchaseGrant({ packageIdentifier, productIdentifier, transactionIdentifier, platform }) {
    const reward = IAP_CONFIG.packageRewards[packageIdentifier];
    if (!runtime.walletEnabled) {
      if (reward) {
        state.gems += reward.gems;
        state.gold += reward.gold;
      }
      return;
    }
    const payload = await waitForVerifiedPurchase({
      appUserId: runtime.appUserId,
      packageIdentifier,
      productIdentifier,
      transactionIdentifier,
      platform
    });
    state.gems = payload.wallet.balances.gems || 0;
    if (!payload.duplicate && payload.purchaseRecord?.goldGranted) {
      state.gold += payload.purchaseRecord.goldGranted;
    }
    state.monetization.lastWalletSync = Date.now();
    const gemsGranted = payload.purchaseRecord?.gemsGranted ?? reward?.gems ?? 0;
    const goldGranted = payload.purchaseRecord?.goldGranted ?? reward?.gold ?? 0;
    log(`${reward?.note || prettifyIdentifier(packageIdentifier)} reconciled: +${gemsGranted} gems${goldGranted ? `, +${goldGranted} gold` : ""}.`);
  }
  async function waitForVerifiedPurchase(body) {
    const attempts = 4;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await backendRequest("/api/iap/reconcile", {
          method: "POST",
          body
        });
      } catch (error) {
        if (error.message !== "purchase_not_yet_verified" || attempt === attempts - 1) {
          throw error;
        }
        runtime.storeStatus = "Purchase submitted. Waiting for RevenueCat verification...";
        render();
        await wait(1500);
      }
    }
    throw new Error("purchase_not_yet_verified");
  }
  function isNativePlatform() {
    return ["ios", "android"].includes(Capacitor.getPlatform());
  }
  function describeReward(identifier) {
    const reward = IAP_CONFIG.packageRewards[identifier];
    if (!reward) return "Configure this package in RevenueCat.";
    const typeLabel = reward.storeType === "subscription" ? " \u2022 subscription" : reward.storeType === "consumable" ? " \u2022 consumable" : " \u2022 one-time";
    return `${reward.gems} gems${reward.gold ? ` \u2022 ${reward.gold} gold` : ""}${typeLabel}`;
  }
  function prettifyIdentifier(identifier) {
    return identifier.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
  function formatNumber(value) {
    return new Intl.NumberFormat("en-US", {
      notation: value > 9999 ? "compact" : "standard",
      maximumFractionDigits: 1
    }).format(Math.round(value));
  }
  function getErrorMessage(error) {
    if (error?.userCancelled) return "Purchase was cancelled.";
    return error?.message || error?.code || "Unknown billing error.";
  }
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? { ...defaultState(), ...saved } : defaultState();
    } catch {
      return defaultState();
    }
  }
  function saveState(updateTimestamp = true) {
    if (updateTimestamp) {
      state.lastOpened = Date.now();
    }
    state.lastSaved = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
