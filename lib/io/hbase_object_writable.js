/*!
 * node-hbase-client - lib/io/hbase_object_writable.js
 * Copyright(c) 2013 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var debug = require('debug')('hbase:writable');
var Long = require('long');
var Bytes = require('../util/bytes');
var WritableUtils = require('../writable_utils');
var Text = require('../text');
var IOException = require('../errors').IOException;
var UnsupportedOperationException = require('../errors').UnsupportedOperationException;

var CODE_TO_CLASS = {};
var CLASS_TO_CODE = {};

var CLASSES = {};

var addToMap = function (clazzName, code) {
  CLASS_TO_CODE[clazzName] = code;
  CODE_TO_CLASS[code] = clazzName;
};

exports.addToClass = function (name, clazz) {
  CLASSES[name] = clazz;
  clazz.__classname = name;
};

////////////////////////////////////////////////////////////////////////////
// WARNING: Please do not insert, remove or swap any line in this static  //
// block.  Doing so would change or shift all the codes used to serialize //
// objects, which makes backwards compatibility very hard for clients.    //
// New codes should always be added at the end. Code removal is           //
// discouraged because code is a short now.                               //
////////////////////////////////////////////////////////////////////////////

var NOT_ENCODED = 0;
var code = NOT_ENCODED + 1;
// Primitive types.
addToMap('Boolean.TYPE', code++);
addToMap('Byte.TYPE', code++);
addToMap('Character.TYPE', code++);
addToMap('Short.TYPE', code++);
addToMap('Integer.TYPE', code++);
addToMap('Long.TYPE', code++);
addToMap('Float.TYPE', code++);
addToMap('Double.TYPE', code++);
addToMap('Void.TYPE', code++);

// Other java types
addToMap('String.class', code++);
addToMap('byte[].class', code++);
addToMap('byte[][].class', code++);

// Hadoop types
addToMap('Text.class', code++);
addToMap('Writable.class', code++);
addToMap('Writable[].class', code++);
addToMap('HbaseMapWritable.class', code++);
addToMap('NullInstance.class', code++);

// Hbase types
addToMap('HColumnDescriptor.class', code++);
addToMap('HConstants.Modify.class', code++);

// We used to have a class named HMsg but its been removed.  Rather than
// just axe it, use following random Integer class -- we just chose any
// class from java.lang -- instead just so codes that follow stay
// in same relative place.
addToMap('Integer.class', code++);
addToMap('Integer[].class', code++);

addToMap('MyClass.class', code++);//addToMap(HRegion.class, code++);
addToMap('MyClass.class', code++);//addToMap(HRegion[].class, code++);
addToMap('HRegionInfo.class', code++);
addToMap('HRegionInfo[].class', code++);
addToMap('HServerAddress.class', code++);
addToMap('MyClass.class', code++);//addToMap(HServerInfo.class, code++);
addToMap('HTableDescriptor.class', code++);
addToMap('MyClass.class', code++);//addToMap(MapWritable.class, code++);

//
// HBASE-880
//
addToMap('MyClass.class', code++);//addToMap(ClusterStatus.class, code++);
addToMap('Delete.class', code++);
addToMap('Get.class', code++);
addToMap('KeyValue.class', code++);
addToMap('KeyValue[].class', code++);
addToMap('Put.class', code++);
addToMap('Put[].class', code++);
addToMap('Result.class', code++);
addToMap('Result[].class', code++);
addToMap('Scan.class', code++);

addToMap('WhileMatchFilter.class', code++);
addToMap('PrefixFilter.class', code++);
addToMap('PageFilter.class', code++);
addToMap('InclusiveStopFilter.class', code++);
addToMap('ColumnCountGetFilter.class', code++);
addToMap('SingleColumnValueFilter.class', code++);
addToMap('SingleColumnValueExcludeFilter.class', code++);
addToMap('BinaryComparator.class', code++);
addToMap('BitComparator.class', code++);
addToMap('CompareFilter.class', code++);
addToMap('RowFilter.class', code++);
addToMap('ValueFilter.class', code++);
addToMap('QualifierFilter.class', code++);
addToMap('SkipFilter.class', code++);
addToMap('WritableByteArrayComparable.class', code++);
addToMap('FirstKeyOnlyFilter.class', code++);
addToMap('DependentColumnFilter.class', code++);

addToMap('Delete[].class', code++);

addToMap('MyClass.class', code++);//addToMap(HLog.Entry.class, code++);
addToMap('MyClass.class', code++);//addToMap(HLog.Entry[].class, code++);
addToMap('MyClass.class', code++);//addToMap(HLogKey.class, code++);

addToMap('List.class', code++);

addToMap('NavigableSet.class', code++);
addToMap('ColumnPrefixFilter.class', code++);

// Multi
addToMap('Row.class', code++);
addToMap('Action.class', code++);
addToMap('MultiAction.class', code++);
addToMap('MultiResponse.class', code++);

// coprocessor execution
addToMap('Exec.class', code++);
addToMap('Increment.class', code++);

addToMap('KeyOnlyFilter.class', code++);

// serializable
addToMap('Serializable.class', code++);

addToMap('RandomRowFilter.class', code++);

addToMap('CompareOp.class', code++);

addToMap('ColumnRangeFilter.class', code++);

addToMap('HServerLoad.class', code++);

addToMap('MyClass.class', code++);//addToMap(RegionOpeningState.class, code++);

addToMap('HTableDescriptor[].class', code++);

addToMap('Append.class', code++);

addToMap('RowMutations.class', code++);

addToMap('MyClass.class', code++);//addToMap(Message.class, code++);

//java.lang.reflect.Array is a placeholder for arrays not defined above
exports.GENERIC_ARRAY_CODE = code++;
addToMap('Array.class', exports.GENERIC_ARRAY_CODE);

// make sure that this is the last statement in this static block
exports.NEXT_CLASS_CODE = code;

/**
 * Read a {@link Writable}, {@link String}, primitive type, or an array of
 * the preceding.
 * @param in
 * @param objectWritable
 * @param conf
 * @return the object
 * @throws IOException
 */
exports.readObject = function (io, objectWritable, conf) {
  var code = io.readVInt();
  var declaredClass = CODE_TO_CLASS[code];
  debug('readObject: code: %s, class: %s', code, declaredClass);
  var instance;
  // primitive types
  if (declaredClass === 'Boolean.TYPE') { // boolean
    instance = io.readBoolean();
  } else if (declaredClass === 'Character.TYPE') { // char
    instance = io.readChar();
  } else if (declaredClass === 'Byte.TYPE') { // byte
    instance = io.readByte();
  } else if (declaredClass === 'Short.TYPE') { // short
    instance = io.readShort();
  } else if (declaredClass === 'Integer.TYPE') { // int
    instance = io.readInt();
  } else if (declaredClass === 'Long.TYPE') { // long
    instance = io.readLong();
  } else if (declaredClass === 'Float.TYPE') { // float
    instance = io.readFloat();
  } else if (declaredClass === 'Double.TYPE') { // double
    instance = io.readDouble();
  } else if (declaredClass === 'Void.TYPE') { // void
    instance = null;
    // array
  } else if (declaredClass === 'byte[].class') {
    instance = Bytes.readByteArray(io);
  } else if (declaredClass === 'Result[].class') {
    var Result = CLASSES['Result.class'];
    instance = Result.readArray(io);
  // } else {
  //   var length = io.readInt();
  //   instance = Array.newInstance(declaredClass.getComponentType(), length);
  //   for (var i = 0; i < length; i++) {
  //     Array.set(instance, i, readObject(io, null, conf));
  //   }
  } else if (declaredClass === 'Array.class') { //an array not declared in CLASS_TO_CODE
    // Class<?> componentType = readClass(conf, in);
    var length = io.readInt();
    // console.log(declaredClass, length)
    // instance = Array.newInstance(componentType, length);
    // for (int i = 0; i < length; i++) {
    //   Array.set(instance, i, readObject(in, conf));
    // }
  // } else if (List.class.isAssignableFrom(declaredClass)) { // List
  //   int length = in.readInt();
  //   instance = new ArrayList(length);
  //   for (int i = 0; i < length; i++) {
  //     ((ArrayList) instance).add(readObject(in, conf));
  //   }
  } else if (declaredClass === 'String.class') { // String
    // instance = Text.readString(io);
    instance = io.readVString();
  // } else if (declaredClass.isEnum()) { // enum
  //   instance = Enum.valueOf((Class<? extends Enum>) declaredClass, Text.readString(in));
    
  //   //    } else if (declaredClass == Message.class) {
  //   //      String className = Text.readString(in);
  //   //      try {
  //   //        declaredClass = getClassByName(conf, className);
  //   //        instance = tryInstantiateProtobuf(declaredClass, in);
  //   //      } catch (ClassNotFoundException e) {
  //   //        LOG.error("Can't find class " + className, e);
  //   //        throw new IOException("Can't find class " + className, e);
  //   //      }
  } else { 
    // Writable or Serializable
    // int b = (byte) WritableUtils.readVInt(in);
    var b = io.readVInt();
    var name = CODE_TO_CLASS[b];
    
    debug('writable class: code: %s, name: %s', b, name);

    if (b === NOT_ENCODED) {
      // String className = Text.readString(in);
      name = io.readVString();
      // try {
      //   instanceClass = getClassByName(conf, className);
      // } catch (ClassNotFoundException e) {
      //   LOG.error("Can't find class " + className, e);
      //   throw new IOException("Can't find class " + className, e);
      // }
    } else if (name === 'NullInstance.class') {
      instance = null;
    } else {
      var instanceClass = CLASSES[name];
      instance = instanceClass();

      if (typeof instance.readFields === 'function') {
        instance.readFields(io);
      } else {
        var len = io.readInt();
        var objectBytes = io.read(len);
        instance = objectBytes;
        // ByteArrayInputStream bis = null;
        // ObjectInputStream ois = null;
        // try {
        //   bis = new ByteArrayInputStream(objectBytes);
        //   ois = new ObjectInputStream(bis);
        //   instance = ois.readObject();
        // } catch (ClassNotFoundException e) {
        //   LOG.error("Class not found when attempting to deserialize object", e);
        //   throw new IOException("Class not found when attempting to " + "deserialize object", e);
        // } finally {
        //   if (bis != null)
        //     bis.close();
        //   if (ois != null)
        //     ois.close();
        // }
      }
    }

    declaredClass = name;
  }
  
  if (objectWritable) { // store values
    objectWritable.declaredClass = declaredClass;
    objectWritable.instance = instance;
  }
  return instance;
};

exports.readFields = function (io) {
  var obj = {};
  exports.readObject(io, obj);
  return obj;
};

/**
 * Write a {@link Writable}, {@link String}, primitive type, or an array of
 * the preceding.
 * @param out
 * @param instance
 * @param declaredClass
 * @param conf
 * @throws IOException
 */
exports.writeObject = function (out, instance, declaredClass) {
  // if (instanceObj === null) { // null
  //   instanceObj = new NullInstance(declClass, conf);
  //   declClass = Writable.class;
  // }
  var name = instance.constructor.name;
  var clazz = name + '.class';
  if (Buffer.isBuffer(instance)) {
    clazz = 'byte[].class';
    exports.writeClassCode(out, clazz);
    Bytes.writeByteArray(out, instance);
    return;
  }
  if (instance instanceof Long) {
    clazz = 'Long.TYPE';
    exports.writeClassCode(out, clazz);
    out.writeLong(instance);
    return;
  }

  exports.writeClassCode(out, clazz);
  // writable
  if (typeof instance.write === 'function') {
    // Class<?> c = instanceObj.getClass();
    // Integer code = CLASS_TO_CODE.get(c);
    // if (code == null) {
    //   out.writeByte(NOT_ENCODED);
    //   Text.writeString(out, c.getName());
    // } else {
    //   writeClassCode(out, c);
    // }
    exports.writeClassCode(out, clazz);
    instance.write(out);
    // ((Writable) instanceObj).write(out);
    return;
  }

  if (clazz === 'String.class') {
    Text.writeString(out, instance);
    return;
  }
  // if (name === 'Boolean') { // boolean
  //   out.writeBoolean(instance));
  // } else if (declClass == Character.TYPE) { // char
  //   out.writeChar(((Character) instanceObj).charValue());
  // } else if (declClass == Byte.TYPE) { // byte
  //   out.writeByte(((Byte) instanceObj).byteValue());
  // } else if (declClass == Short.TYPE) { // short
  //   out.writeShort(((Short) instanceObj).shortValue());
  // } else if (declClass == Integer.TYPE) { // int
  //   out.writeInt(((Integer) instanceObj).intValue());
  // } else if (declClass == Long.TYPE) { // long
  //   out.writeLong(((Long) instanceObj).longValue());
  // } else if (declClass == Float.TYPE) { // float
  //   out.writeFloat(((Float) instanceObj).floatValue());
  // } else if (declClass == Double.TYPE) { // double
  //   out.writeDouble(((Double) instanceObj).doubleValue());
  // } else if (declClass == Void.TYPE) { // void
  // } else {
  //   throw new IllegalArgumentException("Not a primitive: " + declClass);
  // }
  // if (Array.isArray(instance)) { // array
  // // if (declClass.isArray()) { // array
  //   // If bytearray, just dump it out -- avoid the recursion and
  //   // byte-at-a-time we were previously doing.
  //   if (declClass.equals(byte[].class)) {
  //     Bytes.writeByteArray(out, (byte[]) instanceObj);
  //   } else if (declClass.equals(Result[].class)) {
  //     Result.writeArray(out, (Result[]) instanceObj);
  //   } else {
  //     //if it is a Generic array, write the element's type
  //     if (getClassCode(declaredClass) == GENERIC_ARRAY_CODE) {
  //       Class<?> componentType = declaredClass.getComponentType();
  //       writeClass(out, componentType);
  //     }

  //     int length = Array.getLength(instanceObj);
  //     out.writeInt(length);
  //     for (int i = 0; i < length; i++) {
  //       Object item = Array.get(instanceObj, i);
  //       writeObject(out, item, item.getClass(), conf);
  //     }
  //   }
  // } 
  // else if (List.class.isAssignableFrom(declClass)) {
  //   List list = (List) instanceObj;
  //   int length = list.size();
  //   out.writeInt(length);
  //   for (int i = 0; i < length; i++) {
  //     writeObject(out, list.get(i), list.get(i).getClass(), conf);
  //   }
  // } else if (declClass == String.class) { // String
  //   Text.writeString(out, (String) instanceObj);
  // } else if (declClass.isPrimitive()) { // primitive type
  //   if (declClass == Boolean.TYPE) { // boolean
  //     out.writeBoolean(((Boolean) instanceObj).booleanValue());
  //   } else if (declClass == Character.TYPE) { // char
  //     out.writeChar(((Character) instanceObj).charValue());
  //   } else if (declClass == Byte.TYPE) { // byte
  //     out.writeByte(((Byte) instanceObj).byteValue());
  //   } else if (declClass == Short.TYPE) { // short
  //     out.writeShort(((Short) instanceObj).shortValue());
  //   } else if (declClass == Integer.TYPE) { // int
  //     out.writeInt(((Integer) instanceObj).intValue());
  //   } else if (declClass == Long.TYPE) { // long
  //     out.writeLong(((Long) instanceObj).longValue());
  //   } else if (declClass == Float.TYPE) { // float
  //     out.writeFloat(((Float) instanceObj).floatValue());
  //   } else if (declClass == Double.TYPE) { // double
  //     out.writeDouble(((Double) instanceObj).doubleValue());
  //   } else if (declClass == Void.TYPE) { // void
  //   } else {
  //     throw new IllegalArgumentException("Not a primitive: " + declClass);
  //   }
  // } else if (declClass.isEnum()) { // enum
  //   Text.writeString(out, ((Enum) instanceObj).name());
  //   //    } else if (Message.class.isAssignableFrom(declaredClass)) {
  //   //      Text.writeString(out, instanceObj.getClass().getName());
  //   //      ((Message) instance).writeDelimitedTo(DataOutputOutputStream.constructOutputStream(out));
  // } else if (Writable.class.isAssignableFrom(declClass)) { // Writable
  //   Class<?> c = instanceObj.getClass();
  //   Integer code = CLASS_TO_CODE.get(c);
  //   if (code == null) {
  //     out.writeByte(NOT_ENCODED);
  //     Text.writeString(out, c.getName());
  //   } else {
  //     writeClassCode(out, c);
  //   }
  //   ((Writable) instanceObj).write(out);
  // } else if (Serializable.class.isAssignableFrom(declClass)) {
  //   Class<?> c = instanceObj.getClass();
  //   Integer code = CLASS_TO_CODE.get(c);
  //   if (code == null) {
  //     out.writeByte(NOT_ENCODED);
  //     Text.writeString(out, c.getName());
  //   } else {
  //     writeClassCode(out, c);
  //   }
  //   ByteArrayOutputStream bos = null;
  //   ObjectOutputStream oos = null;
  //   try {
  //     bos = new ByteArrayOutputStream();
  //     oos = new ObjectOutputStream(bos);
  //     oos.writeObject(instanceObj);
  //     byte[] value = bos.toByteArray();
  //     out.writeInt(value.length);
  //     out.write(value);
  //   } finally {
  //     if (bos != null)
  //       bos.close();
  //     if (oos != null)
  //       oos.close();
  //   }
  // } else {
  //   throw new IOException("Can't write: " + instanceObj + " as " + declClass);
  // }
  throw new IOException("Can't write: " + instance + " as " + clazz);
};

/**
 * Write out the code for passed Class.
 * @param out
 * @param c
 * @throws IOException
 */
exports.writeClassCode = function (out, c) {
  var code = exports.getClassCode(c);
  debug('writeClassCode: code: %s, class: %s', code, c);
  if (code === null || code === undefined) {
    // LOG.error("Unsupported type " + c);
    // StackTraceElement[] els = new Exception().getStackTrace();
    // for (StackTraceElement elem : els) {
    //   LOG.error(elem.getMethodName());
    // }
    throw new UnsupportedOperationException("No code for unexpected " + c);
  }
  WritableUtils.writeVInt(out, code);
};

exports.getClassCode = function (c) {
  var code = CLASS_TO_CODE[c];
  // if (code === null) {
  //   if (List.class.isAssignableFrom(c)) {
  //     code = CLASS_TO_CODE.get(List.class);
  //   } else if (Writable.class.isAssignableFrom(c)) {
  //     code = CLASS_TO_CODE.get(Writable.class);
  //   } else if (c.isArray()) {
  //     code = CLASS_TO_CODE.get(Array.class);
  //     //} else if (Message.class.isAssignableFrom(c)) {
  //     //  code = CLASS_TO_CODE.get(Message.class);
  //   } else if (Serializable.class.isAssignableFrom(c)) {
  //     code = CLASS_TO_CODE.get(Serializable.class);
  //   }
  // }
  return code;
};

 /**
   * Determines if the specified <code>Class</code> object represents a
   * primitive type.
   *
   * <p> There are nine predefined <code>Class</code> objects to represent
   * the eight primitive types and void.  These are created by the Java
   * Virtual Machine, and have the same names as the primitive types that
   * they represent, namely <code>boolean</code>, <code>byte</code>,
   * <code>char</code>, <code>short</code>, <code>int</code>,
   * <code>long</code>, <code>float</code>, and <code>double</code>.
   *
   * <p> These objects may only be accessed via the following public static
   * final variables, and are the only <code>Class</code> objects for which
   * this method returns <code>true</code>.
   *
   * @return true if and only if this class represents a primitive type
   *
   * @see     java.lang.Boolean#TYPE
   * @see     java.lang.Character#TYPE
   * @see     java.lang.Byte#TYPE
   * @see     java.lang.Short#TYPE
   * @see     java.lang.Integer#TYPE
   * @see     java.lang.Long#TYPE
   * @see     java.lang.Float#TYPE
   * @see     java.lang.Double#TYPE
   * @see     java.lang.Void#TYPE
   * @since JDK1.1
   */
exports.isPrimitive = function (o) {

};

