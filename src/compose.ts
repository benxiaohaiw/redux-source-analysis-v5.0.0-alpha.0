type Func<T extends any[], R> = (...a: T) => R

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for the
 * resulting composite function.
 *
 * @param funcs The functions to compose.
 * @returns A function obtained by composing the argument functions from right
 *   to left. For example, `compose(f, g, h)` is identical to doing
 *   `(...args) => f(g(h(...args)))`.
 */
export default function compose(): <R>(a: R) => R

export default function compose<F extends Function>(f: F): F

/* two functions */
export default function compose<A, T extends any[], R>(
  f1: (a: A) => R,
  f2: Func<T, A>
): Func<T, R>

/* three functions */
export default function compose<A, B, T extends any[], R>(
  f1: (b: B) => R,
  f2: (a: A) => B,
  f3: Func<T, A>
): Func<T, R>

/* four functions */
export default function compose<A, B, C, T extends any[], R>(
  f1: (c: C) => R,
  f2: (b: B) => C,
  f3: (a: A) => B,
  f4: Func<T, A>
): Func<T, R>

/* rest */
export default function compose<R>(
  f1: (a: any) => R,
  ...funcs: Function[]
): (...args: any[]) => R

export default function compose<R>(...funcs: Function[]): (...args: any[]) => R

export default function compose(...funcs: Function[]) { // 组合函数

  // 空数组则返回一个函数arg => arg
  if (funcs.length === 0) {
    // infer the argument type so it is usable in inference down the line
    return <T>(arg: T) => arg
  }

  // 只有有一个函数 - 则返回这个函数
  if (funcs.length === 1) {
    return funcs[0]
  }

  // 对数组进行reduce - 没有初始值参数
  return funcs.reduce(
    (a, b) => // 返回一个函数则作为下一次的参数a
      (...args: any) => // 该函数返回执行结果
        a(b(...args))
  )

  /* 
  fn1, fn2, fn3

  a -> fn1
  b -> fn2
  
  返回一个函数A作为下一次的参数a
  ---

  // 闭包的存在
  a -> (..args) => fn1(fn2(...args)) <- 函数A
  b -> fn3

  返回一个函数B作为compose函数的结果
  结果 -> (..args) => 函数A(fn3(...args)) <- 函数B

  // 执行这个结果也就是函数B - 传参数
  // 那么参数传给fn3且先执行，它的结果作为函数A的参数，之后传给fn2且执行后的结果传给了fn1且执行后的结果作为函数A的结果然后作为函数B的结果返回
  
  // +++
  所以拿compose函数参数是一个函数的数组来讲 - 最终调用开关交给了外部 - 且参数数组中的函数是倒序一一执行的，且后一个函数执行后的结果作为前一个函数执行时的参数 // +++
  */
}
