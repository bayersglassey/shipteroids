'use strict';

// query params
var PARAMS = new URLSearchParams(window.location.search);

function getParam(name, default_value) {
    var value = PARAMS.get(name);
    return value === null? default_value: value;
}

function getBoolParam(name, default_value) {
    default_value = getDefault(default_value, false);
    return Boolean(getParam(name, default_value));
}

function getIntParam(name, default_value) {
    default_value = getDefault(default_value, 0);
    return parseInt(getParam(name, default_value));
}

function getFloatParam(name, default_value) {
    default_value = getDefault(default_value, 0);
    return parseFloat(getParam(name, default_value));
}

var DEBUG = getBoolParam('debug');
