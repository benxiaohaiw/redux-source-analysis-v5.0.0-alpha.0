import compose from './compose'
import { Middleware, MiddlewareAPI } from './types/middleware'
import { AnyAction } from './types/actions'
import {
  StoreEnhancer,
  Dispatch,
  PreloadedState,
  StoreEnhancerStoreCreator
} from './types/store'
import { Reducer } from './types/reducers'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param middlewares The middleware chain to be applied.
 * @returns A store enhancer applying the middleware.
 *
 * @template Ext Dispatch signature added by a middleware.
 * @template S The type of the state supported by a middleware.
 */
export default function applyMiddleware(): StoreEnhancer
export default function applyMiddleware<Ext1, S>(
  middleware1: Middleware<Ext1, S, any>
): StoreEnhancer<{ dispatch: Ext1 }>
export default function applyMiddleware<Ext1, Ext2, S>(
  middleware1: Middleware<Ext1, S, any>,
  middleware2: Middleware<Ext2, S, any>
): StoreEnhancer<{ dispatch: Ext1 & Ext2 }>
export default function applyMiddleware<Ext1, Ext2, Ext3, S>(
  middleware1: Middleware<Ext1, S, any>,
  middleware2: Middleware<Ext2, S, any>,
  middleware3: Middleware<Ext3, S, any>
): StoreEnhancer<{ dispatch: Ext1 & Ext2 & Ext3 }>
export default function applyMiddleware<Ext1, Ext2, Ext3, Ext4, S>(
  middleware1: Middleware<Ext1, S, any>,
  middleware2: Middleware<Ext2, S, any>,
  middleware3: Middleware<Ext3, S, any>,
  middleware4: Middleware<Ext4, S, any>
): StoreEnhancer<{ dispatch: Ext1 & Ext2 & Ext3 & Ext4 }>
export default function applyMiddleware<Ext1, Ext2, Ext3, Ext4, Ext5, S>(
  middleware1: Middleware<Ext1, S, any>,
  middleware2: Middleware<Ext2, S, any>,
  middleware3: Middleware<Ext3, S, any>,
  middleware4: Middleware<Ext4, S, any>,
  middleware5: Middleware<Ext5, S, any>
): StoreEnhancer<{ dispatch: Ext1 & Ext2 & Ext3 & Ext4 & Ext5 }>
export default function applyMiddleware<Ext, S = any>(
  ...middlewares: Middleware<any, S, any>[]
): StoreEnhancer<{ dispatch: Ext }>
export default function applyMiddleware(
  ...middlewares: Middleware[]
): StoreEnhancer<any> {

  // 返回一个函数
  return (createStore: StoreEnhancerStoreCreator) => // 再次返回一个函数
    // 
    <S, A extends AnyAction>(
      reducer: Reducer<S, A>,
      preloadedState?: PreloadedState<S>
    ) => {
      // +++
      // root reducer, undefined
      // 再一次执行createStore函数 // +++
      const store = createStore(reducer, preloadedState) // 这一次便没有第三个参数enhancer函数了 // +++

      // 准备dispatch函数
      let dispatch: Dispatch = () => {
        throw new Error(
          'Dispatching while constructing your middleware is not allowed. ' +
            'Other middleware would not be applied to this dispatch.'
        )
      }

      // 准备中间件api对象
      const middlewareAPI: MiddlewareAPI = {
        // store实例的获取状态函数
        getState: store.getState,
        // dispatch函数
        dispatch: (action, ...args) => dispatch(action, ...args) // 这里的dispatch是当前下的dispatch变量引用，而这个变量在下面进行替换啦 ~
      }

      // 对中间件函数数组一一进行执行函数 - 传入参数上述对象
      // 返回的也是一个由函数组成的数组 // +++
      const chain = middlewares.map(middleware => middleware(middlewareAPI) /** thunk middleware 函数1执行返回函数2 */)

      // 再次使用compose函数进行执行
      // compose函数参数是一个函数的数组来讲 - 最终调用开关交给了外部 - 且参数数组中的函数是倒序一一执行的，且后一个函数执行后的结果作为前一个函数执行时的参数 // +++
      dispatch = compose<typeof dispatch>(...chain)(store.dispatch) // 这里紧接着就对这个开关函数进行【执行调用】
      // 对开关函数的执行结果就是函数数组第一个元素函数执行后所返回的结果 // +++
      // thunk middleware函数2的执行结果返回的函数3: (action) => {...} <- 这里的dispatch

      // 注意上述传入的参数是store.dispatch这个函数 // +++

      // 这里对dispatch变量进行替换

      // +++
      // 那么开发模式下这个最终的dispatch变量的值就是benxiaohaiw/redux-toolkit-source-analysis-v1.9.0/packages/toolkit/src/immutableStateInvariantMiddleware.ts下的action参数所在的函数
      // 生产模式下最终的这个dispatch变量就是benxiaohaiw/redux-thunk-source-analysis-v2.4.2/src/index.ts下的action参数函数 // +++
      // +++

      // 返回对象
      return {
        ...store,
        // 重写store实例对象中的dispatch函数 // +++
        dispatch
      }
    }
}
