export function isPrimitiveType(test: any) {
  return test !== Object(test);
}
