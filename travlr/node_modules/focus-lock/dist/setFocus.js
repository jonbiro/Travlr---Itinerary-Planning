'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.focusOn = undefined;

var _focusMerge = require('./focusMerge');

var _focusMerge2 = _interopRequireDefault(_focusMerge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var focusOn = exports.focusOn = function focusOn(target) {
  target.focus();
  if (target.contentWindow) {
    target.contentWindow.focus();
  }
};

exports.default = function (topNode, lastNode) {
  var focusable = (0, _focusMerge2.default)(topNode, lastNode);

  if (focusable) {
    focusOn(focusable.node);
  }
};