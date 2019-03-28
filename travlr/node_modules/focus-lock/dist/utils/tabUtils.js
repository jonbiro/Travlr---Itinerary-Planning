'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getParentAutofocusables = exports.getFocusables = undefined;

var _tabbables = require('./tabbables');

var _tabbables2 = _interopRequireDefault(_tabbables);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var getFocusables = exports.getFocusables = function getFocusables(parent) {
  return parent.querySelectorAll(_tabbables2.default.join(','));
};

var getParentAutofocusables = exports.getParentAutofocusables = function getParentAutofocusables(parent) {
  var parentFocus = parent.querySelectorAll('[data-autofocus-inside]');
  return [].concat(_toConsumableArray(parentFocus)).map(function (node) {
    return getFocusables(node);
  }).reduce(function (acc, nodes) {
    return [].concat(_toConsumableArray(acc), _toConsumableArray(nodes));
  }, []);
};