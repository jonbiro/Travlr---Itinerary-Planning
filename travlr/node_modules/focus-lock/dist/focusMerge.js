'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.newFocus = undefined;

var _tabOrder = require('./utils/tabOrder');

var _DOMutils = require('./utils/DOMutils');

var _tabUtils = require('./utils/tabUtils');

var _firstFocus = require('./utils/firstFocus');

var _firstFocus2 = _interopRequireDefault(_firstFocus);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var findAutoFocused = function findAutoFocused(autoFocusables) {
  return function (node) {
    return !!node.autofocus || node.dataset && !!node.dataset.autofocus || autoFocusables.indexOf(node) >= 0;
  };
};

var newFocus = exports.newFocus = function newFocus(innerNodes, outerNodes, activeElement, lastNode, autoFocused) {
  var cnt = innerNodes.length;
  var firstFocus = innerNodes[0];
  var lastFocus = innerNodes[cnt - 1];

  // focus is inside
  if (innerNodes.indexOf(activeElement) >= 0) {
    return undefined;
  }

  var activeIndex = outerNodes.indexOf(activeElement);
  var lastIndex = outerNodes.indexOf(lastNode || activeIndex);
  var lastNodeInside = innerNodes.indexOf(lastNode);
  var indexDiff = activeIndex - lastIndex;
  var firstNodeIndex = outerNodes.indexOf(firstFocus);
  var lastNodeIndex = outerNodes.indexOf(lastFocus);

  // new focus
  if (activeIndex === -1 || lastNodeInside === -1) {
    return innerNodes.indexOf(autoFocused.length ? (0, _firstFocus2.default)(autoFocused) : (0, _firstFocus2.default)(innerNodes));
  }
  // old focus
  if (!indexDiff && lastNodeInside >= 0) {
    return lastNodeInside;
  }
  // jump out
  if (indexDiff && Math.abs(indexDiff) > 1) {
    return lastNodeInside;
  }
  // focus above lock
  if (activeIndex <= firstNodeIndex) {
    return cnt - 1;
  }
  // focus below lock
  if (activeIndex > lastNodeIndex) {
    return 0;
  }
  // index is inside tab order, but outside Lock
  if (indexDiff) {
    if (Math.abs(indexDiff) > 1) {
      return lastNodeInside;
    }
    return (cnt + lastNodeInside + indexDiff) % cnt;
  }
  // do nothing
  return undefined;
};

var getFocusMerge = function getFocusMerge(topNode, lastNode) {
  var activeElement = document.activeElement;

  var commonParent = (0, _DOMutils.getCommonParent)(activeElement || topNode, topNode) || topNode;

  var innerElements = (0, _DOMutils.getTabbableNodes)(topNode);
  if (!innerElements[0]) {
    return undefined;
  }

  var innerNodes = innerElements.map(function (_ref) {
    var node = _ref.node;
    return node;
  });

  var outerNodes = (0, _tabOrder.orderByTabIndex)((0, _tabUtils.getFocusables)(commonParent)).map(function (_ref2) {
    var node = _ref2.node;
    return node;
  });

  var newId = newFocus(innerNodes, outerNodes, activeElement, lastNode, innerNodes.filter(findAutoFocused((0, _DOMutils.parentAutofocusables)(topNode))));

  if (newId === undefined) {
    return newId;
  }
  return innerElements[newId];
};

exports.default = getFocusMerge;