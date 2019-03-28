'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parentAutofocusables = exports.getTabbableNodes = exports.getCommonParent = exports.notHiddenInput = exports.isVisible = undefined;

var _tabOrder = require('./tabOrder');

var _tabUtils = require('./tabUtils');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var isElementHidden = function isElementHidden(computedStyle) {
  return computedStyle.getPropertyValue('display') === 'none' || computedStyle.getPropertyValue('visibility') === 'hidden';
};

var isVisible = exports.isVisible = function isVisible(node) {
  return !node || node === document || !isElementHidden(window.getComputedStyle(node, null)) && isVisible(node.parentNode);
};

var notHiddenInput = exports.notHiddenInput = function notHiddenInput(node) {
  return node.tagName !== 'INPUT' || node.type !== 'hidden';
};

var getParents = function getParents(node) {
  var parents = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  parents.push(node);
  if (node.parentNode) {
    getParents(node.parentNode, parents);
  }
  return parents;
};

var getCommonParent = exports.getCommonParent = function getCommonParent(nodea, nodeb) {
  var parentsA = getParents(nodea);
  var parentsB = getParents(nodeb);

  for (var i = 0; i < parentsA.length; i += 1) {
    var currentParent = parentsA[i];
    if (parentsB.indexOf(currentParent) >= 0) {
      return currentParent;
    }
  }
  return false;
};

var findFocusable = function findFocusable(nodes) {
  return [].concat(_toConsumableArray(nodes)).filter(function (node) {
    return isVisible(node);
  }).filter(function (node) {
    return notHiddenInput(node);
  });
};

var getTabbableNodes = exports.getTabbableNodes = function getTabbableNodes(topNode) {
  return (0, _tabOrder.orderByTabIndex)(findFocusable((0, _tabUtils.getFocusables)(topNode)));
};

var parentAutofocusables = exports.parentAutofocusables = function parentAutofocusables(topNode) {
  return findFocusable((0, _tabUtils.getParentAutofocusables)(topNode));
};