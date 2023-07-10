// type ArrayType<T> = Extract<
//   true extends false & T ?
//     any[] :
//   T extends readonly any[] ?
//     T :
//   unknown[],
//   T
// >;

// declare global {
//   interface ArrayConstructor {
//     isArray<T>(arg: T): arg is ArrayType<T>;
//   }
// }