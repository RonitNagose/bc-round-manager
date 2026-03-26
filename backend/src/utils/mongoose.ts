export function objectIdToStringTransform(_doc: unknown, ret: any) {
  ret.id = ret._id?.toString?.();
  delete ret._id;
  return ret;
}

export const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: objectIdToStringTransform,
};

