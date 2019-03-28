"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var tabSort = exports.tabSort = function tabSort(a, b) {
  var tabDiff = a.tabIndex - b.tabIndex;
  var indexDiff = a.index - b.index;

  if (tabDiff) {
    if (!a.tabIndex) return 1;
    if (!b.tabIndex) return -1;
  }

  return tabDiff || indexDiff;
};

var orderByTabIndex = exports.orderByTabIndex = function orderByTabIndex(nodes) {
  return [].concat(_toConsumableArray(nodes)).map(function (node, index) {
    return {
      node: node,
      index: index,
      tabIndex: node.tabIndex
    };
  }).filter(function (data) {
    return data.tabIndex >= 0;
  }).sort(tabSort);
};