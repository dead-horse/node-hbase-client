/*!
 * node-hbase-client - lib/data_output_stream.js
 * Copyright(c) 2013 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var WritableUtils = require('./writable_utils');
var Long = require('long');

function DataOutputStream(out) {
  this.out = out;
  this.written = 0;
}

DataOutputStream.prototype.incCount = function (size) {
  this.written += size;
};

DataOutputStream.prototype.write = function (b, offset, length) {
  length = length === undefined ? b.length : length;
  if (offset !== undefined) {
    b = b.slice(offset, length);
  }
  
  this.out.write(b);
  this.incCount(length);
};

/**
 * Writes out a <code>byte</code> to the underlying output stream as 
 * a 1-byte value. If no exception is thrown, the counter 
 * <code>written</code> is incremented by <code>1</code>.
 *
 * @param      v   a <code>byte</code> value to be written.
 * @exception  IOException  if an I/O error occurs.
 * @see        java.io.FilterOutputStream#out
 */
DataOutputStream.prototype.writeByte = function (v) {
  if (!Buffer.isBuffer(v)) {
    v = new Buffer([v]);
  }
  this.write(v);
};

/**
 * Writes a <code>boolean</code> to the underlying output stream as 
 * a 1-byte value. The value <code>true</code> is written out as the 
 * value <code>(byte)1</code>; the value <code>false</code> is 
 * written out as the value <code>(byte)0</code>. If no exception is 
 * thrown, the counter <code>written</code> is incremented by 
 * <code>1</code>.
 *
 * @param      v   a <code>boolean</code> value to be written.
 * @exception  IOException  if an I/O error occurs.
 * @see        java.io.FilterOutputStream#out
 */
DataOutputStream.prototype.writeBoolean = function (v) {
  this.writeByte(v ? 1 : 0);
};

/**
 * Writes a <code>short</code> to the underlying output stream as two
 * bytes, high byte first. If no exception is thrown, the counter 
 * <code>written</code> is incremented by <code>2</code>.
 *
 * @param      v   a <code>short</code> to be written.
 * @exception  IOException  if an I/O error occurs.
 * @see        java.io.FilterOutputStream#out
 */
DataOutputStream.prototype.writeShort = function (v) {
  this.writeChar(v);
};

/**
 * Writes a <code>char</code> to the underlying output stream as a 
 * 2-byte value, high byte first. If no exception is thrown, the 
 * counter <code>written</code> is incremented by <code>2</code>.
 *
 * @param      v   a <code>char</code> value to be written.
 * @exception  IOException  if an I/O error occurs.
 * @see        java.io.FilterOutputStream#out
 */
DataOutputStream.prototype.writeChar = function (v) {
  var buf = new Buffer(2);
  buf.writeInt16BE(v, 0, true);
  this.write(buf);
};

/**
 * Writes an <code>int</code> to the underlying output stream as four
 * bytes, high byte first. If no exception is thrown, the counter 
 * <code>written</code> is incremented by <code>4</code>.
 *
 * @param      v   an <code>int</code> to be written.
 * @exception  IOException  if an I/O error occurs.
 * @see        java.io.FilterOutputStream#out
 */
DataOutputStream.prototype.writeInt = function (v) {
  var buf = new Buffer(4);
  buf.writeInt32BE(v, 0);
  this.write(buf);
};

var ZERO_LONG_BUFFER = new Buffer([0, 0, 0, 0, 0, 0, 0, 0]);

var MAX_INT32 = 4294967295;
var MIN_INT32 = -4294967296;
// var MAX_NUMBER = 9007199254740992;

/**
 * Writes a <code>long</code> to the underlying output stream as eight
 * bytes, high byte first. In no exception is thrown, the counter 
 * <code>written</code> is incremented by <code>8</code>.
 *
 * @param      v   a <code>long</code> to be written.
 * @exception  IOException  if an I/O error occurs.
 * @see        java.io.FilterOutputStream#out
 */
DataOutputStream.prototype.writeLong = function (v) {
  // In Javascript, numbers are 64 bit floating point values. 
  // The largest integer (magnitude) is 253, or Math.pow(2,53), or 9007199254740992.
  // Bitwise Operators: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/Bitwise_Operators
  // v should below MAX_INT32.
  //
  // 32位带符号整数表单范围是 -Math.pow(2,31) ~ Math.pow(2,31)-1 即 -2147483648～2147483647,
  // 而 js 数字的精度是双精度，64位，如果一个超过 2147483647 的整数参与位运算的时候就需要注意，
  // 其二进制溢出了,截取32位后，如果第32位是1将被解读为负数(补码)。
  // 
  // 位移运算不能移动超过32位，如果试图移动超过31位，将位数 对32取模后再移位
  
  // java code
  // writeBuffer[0] = v >>> 56;
  // writeBuffer[1] = v >>> 48;
  // writeBuffer[2] = v >>> 40;
  // writeBuffer[3] = v >>> 32;
  // writeBuffer[4] = v >>> 24;
  // writeBuffer[5] = v >>> 16;
  // writeBuffer[6] = v >>>  8;
  // writeBuffer[7] = v >>>  0;

  if (v === 0) {
    this.write(ZERO_LONG_BUFFER);
    return;
  }
  
  this.write(WritableUtils.toLongBytes(v));
};

DataOutputStream.prototype.writeBytes = function (bytes) {
  this.write(bytes);
};

/**
 * Writes a string to the specified DataOutput using
 * <a href="DataInput.html#modified-utf-8">modified UTF-8</a>
 * encoding in a machine-independent manner. 
 * <p>
 * First, two bytes are written to out as if by the <code>writeShort</code>
 * method giving the number of bytes to follow. This value is the number of
 * bytes actually written out, not the length of the string. Following the
 * length, each character of the string is output, in sequence, using the
 * modified UTF-8 encoding for the character. If no exception is thrown, the
 * counter <code>written</code> is incremented by the total number of 
 * bytes written to the output stream. This will be at least two 
 * plus the length of <code>str</code>, and at most two plus 
 * thrice the length of <code>str</code>.
 *
 * @param      str   a string to be written.
 * @param      out   destination to write to
 * @return     The number of bytes written out.
 * @exception  IOException  if an I/O error occurs.
 */
DataOutputStream.prototype.writeUTF = function (s) {
  var buf = new Buffer(s);
  var data = new Buffer(buf.length + 2);
  data.writeInt16BE(buf.length, 0);
  buf.copy(data, 2);
  this.write(data);
  // int strlen = str.length();
  // int utflen = 0;
  // int c, count = 0;
 
  //       /* use charAt instead of copying String to char array */
  // for (int i = 0; i < strlen; i++) {
  //           c = str.charAt(i);
  //     if ((c >= 0x0001) && (c <= 0x007F)) {
  //   utflen++;
  //     } else if (c > 0x07FF) {
  //   utflen += 3;
  //     } else {
  //   utflen += 2;
  //     }
  // }

  // if (utflen > 65535)
  //     throw new UTFDataFormatException(
  //               "encoded string too long: " + utflen + " bytes");

  //       byte[] bytearr = null;
  //       if (out instanceof DataOutputStream) {
  //           DataOutputStream dos = (DataOutputStream)out;
  //           if(dos.bytearr == null || (dos.bytearr.length < (utflen+2)))
  //               dos.bytearr = new byte[(utflen*2) + 2];
  //           bytearr = dos.bytearr;
  //       } else {
  //           bytearr = new byte[utflen+2];
  //       }
     
  // bytearr[count++] = (byte) ((utflen >>> 8) & 0xFF);
  // bytearr[count++] = (byte) ((utflen >>> 0) & 0xFF);  
        
  //       int i=0;
  //       for (i=0; i<strlen; i++) {
  //          c = str.charAt(i);
  //          if (!((c >= 0x0001) && (c <= 0x007F))) break;
  //          bytearr[count++] = (byte) c;
  //       }
  
  // for (;i < strlen; i++){
  //           c = str.charAt(i);
  //     if ((c >= 0x0001) && (c <= 0x007F)) {
  //   bytearr[count++] = (byte) c;
               
  //     } else if (c > 0x07FF) {
  //   bytearr[count++] = (byte) (0xE0 | ((c >> 12) & 0x0F));
  //   bytearr[count++] = (byte) (0x80 | ((c >>  6) & 0x3F));
  //   bytearr[count++] = (byte) (0x80 | ((c >>  0) & 0x3F));
  //     } else {
  //   bytearr[count++] = (byte) (0xC0 | ((c >>  6) & 0x1F));
  //   bytearr[count++] = (byte) (0x80 | ((c >>  0) & 0x3F));
  //     }
  // }
  //       out.write(bytearr, 0, utflen+2);
  //       return utflen + 2;
  //   }
};

module.exports = DataOutputStream;
