/*!
 * node-hbase-client - lib/data_output_buffer.js
 * Copyright(c) 2013 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var util = require('util');
var WritableUtils = require('./writable_utils');
var Long = require('long');
var DataOutputStream = require('./data_output_stream');


function DataBuffer() {
  this.datas = [];
  this.length = 0;
}

DataBuffer.prototype.write = function (b) {
  this.datas.push(b);
  this.length += b.length;
};

function DataOutputBuffer() {
  this.buf = new DataBuffer();
  DataOutputBuffer.super_.call(this, this.buf, this.constructor);
}
util.inherits(DataOutputBuffer, DataOutputStream);

DataOutputBuffer.prototype.getData = function () {
  return Buffer.concat(this.buf.datas, this.buf.length);
};

DataOutputBuffer.prototype.getLength = function () {
  return this.buf.length;
};

module.exports = DataOutputBuffer;
