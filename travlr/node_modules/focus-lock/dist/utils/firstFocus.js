'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var findFormParent = function findFormParent(startNode) {
  var node = startNode;
  while (node = node.parentNode) {
    if (node.tagName === 'FORM') {
      return node;
    }
  }
  return null;
};

var isRadio = function isRadio(node) {
  return node.tagName === 'INPUT' && node.type === 'radio';
};

var findSelectedRadio = function findSelectedRadio(node, nodes) {
  return nodes.filter(isRadio).filter(function (el) {
    return el.name === node.name;
  }).find(function (el) {
    return el.checked;
  }) || node;
};

var pickFirstFocus = function pickFirstFocus(nodes) {
  if (nodes[0] && nodes.length > 1) {
    if (isRadio(nodes[0]) && nodes[0].name) {
      return findSelectedRadio(nodes[0], nodes);
    }
  }
  return nodes[0];
};

exports.default = pickFirstFocus;