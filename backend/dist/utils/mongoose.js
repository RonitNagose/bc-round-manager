"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJSON = void 0;
exports.objectIdToStringTransform = objectIdToStringTransform;
function objectIdToStringTransform(_doc, ret) {
    ret.id = ret._id?.toString?.();
    delete ret._id;
    return ret;
}
exports.toJSON = {
    virtuals: true,
    versionKey: false,
    transform: objectIdToStringTransform,
};
