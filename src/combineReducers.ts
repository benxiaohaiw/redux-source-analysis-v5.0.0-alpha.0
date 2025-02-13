import { AnyAction, Action } from './types/actions'
import {
  ActionFromReducersMapObject,
  Reducer,
  ReducersMapObject,
  StateFromReducersMapObject
} from './types/reducers'
import { CombinedState } from './types/store'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'
import warning from './utils/warning'
import { kindOf } from './utils/kindOf'

function getUnexpectedStateShapeWarningMessage(
  inputState: object,
  reducers: ReducersMapObject,
  action: Action,
  unexpectedKeyCache: { [key: string]: true }
) {
  const reducerKeys = Object.keys(reducers)
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? 'preloadedState argument passed to createStore'
      : 'previous state received by the reducer'

  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "${kindOf(
        inputState
      )}". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (action && action.type === ActionTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

// 断言reducer的形状 - 其实就是一一执行每个reducer函数对其返回的值进行判断是undefined则报错 // +++
function assertReducerShape(reducers: ReducersMapObject) {
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]

    // 执行reducer函数 // +++
    // benxiaohaiw/redux-toolkit-source-analysis-v1.9.0/packages/toolkit/src/createReducer.ts下的reducer函数所返回的应该是一个空数组进行的带有初始值的reduce函数的执行
    // 那么将直接返回这个初始值state到这里 // 然后下面将直接对该值进行类型上的判断 // +++
    const initialState = reducer(undefined, { type: ActionTypes.INIT }) // +++

    // 对返回的值进行判断
    if (typeof initialState === 'undefined') {
      throw new Error(
        `The slice reducer for key "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
      )
    }

    if (
      typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined'
    ) {
      throw new Error(
        `The slice reducer for key "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle '${ActionTypes.INIT}' or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @template S Combined state object type.
 *
 * @param reducers An object whose values correspond to different reducer
 *   functions that need to be combined into one. One handy way to obtain it
 *   is to use ES6 `import * as reducers` syntax. The reducers may never
 *   return undefined for any action. Instead, they should return their
 *   initial state if the state passed to them was undefined, and the current
 *   state for any unrecognized action.
 *
 * @returns A reducer function that invokes every reducer inside the passed
 *   object, and builds a state object with the same shape.
 */
export default function combineReducers<S>(
  reducers: ReducersMapObject<S, any>
): Reducer<CombinedState<S>>
export default function combineReducers<S, A extends Action = AnyAction>(
  reducers: ReducersMapObject<S, A>
): Reducer<CombinedState<S>, A>
export default function combineReducers<M extends ReducersMapObject>(
  reducers: M
): Reducer<
  CombinedState<StateFromReducersMapObject<M>>,
  ActionFromReducersMapObject<M>
>
export default function combineReducers(reducers: ReducersMapObject) {
  // 取出对象所有的key
  const reducerKeys = Object.keys(reducers)
  
  // 最终
  const finalReducers: ReducersMapObject = {}

  // 遍历
  for (let i = 0; i < reducerKeys.length; i++) {
    // 取出key
    const key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    // 值是为函数的
    if (typeof reducers[key] === 'function') {
      // 存入最终对象中 // +++
      finalReducers[key] = reducers[key]
    }
  }

  // 取出最终的所有key
  const finalReducerKeys = Object.keys(finalReducers)

  // This is used to make sure we don't warn about the same
  // keys multiple times.
  let unexpectedKeyCache: { [key: string]: true }
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  let shapeAssertionError: unknown
  try {
    assertReducerShape(finalReducers) // 断言reducer的形状 - 其实就是一一执行每个reducer函数对其返回的值进行判断是undefined则报错 // +++
  } catch (e) {
    // 捕获错误 - 赋值
    shapeAssertionError = e
  }

  // 返回一个函数作为root reducer
  return function combination(
    state: StateFromReducersMapObject<typeof reducers> = {}, // undefined -> {}
    action: AnyAction // src/createStore.ts下的{type: ActionTypes.INIT}
  ) {

    // 有错误直接抛出去 // +++
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    let hasChanged = false // 是否有变化 - 默认么有

    // 准备新的状态对象 // +++
    const nextState: StateFromReducersMapObject<typeof reducers> = {} // 新的状态
    // 注意每次执行这个combination函数也就是在最终dispatch函数中执行调用root reducer时就是这里的combination函数的执行
    // 需要注意这个新的状态每次都是一个【新的对象引用】 // +++

    // 遍历 // +++
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i]

      // 取出reducer函数
      const reducer = finalReducers[key]

      // 在{}中取counter对应的状态 -> undefined // +++
      const previousStateForKey = state[key] // 对key的之前的状态 // +++

      // 对key的新的状态 // +++
      const nextStateForKey = reducer(previousStateForKey, action) // 传入对key的之前的状态, action对象

      // 
      if (typeof nextStateForKey === 'undefined') {
        const actionType = action && action.type
        throw new Error(
          `When called with an action of type ${
            actionType ? `"${String(actionType)}"` : '(unknown type)'
          }, the slice reducer for key "${key}" returned undefined. ` +
            `To ignore an action, you must explicitly return the previous state. ` +
            `If you want this reducer to hold no value, you can return null instead of undefined.`
        )
      }

      // 存入
      nextState[key] = nextStateForKey

      // 对比新旧状态值来进行标记是否有变化
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }

    // 还需要进行直接性的对比finalReducerKeys的长度与传入的state参数的所有key的长度是否相等
    hasChanged =
      hasChanged || finalReducerKeys.length !== Object.keys(state).length
    
    // 有变化则返回新状态 // +++
    // 没有变化则还是旧状态
    return hasChanged ? nextState : state // 这里是关键如果有变化了则返回上面内的那个新的对象，没有变化的话则返回旧状态 // +++
    // benxiaohaiw/redux-toolkit-source-analysis-v1.9.0/packages/toolkit/src/createReducer.ts中的reducer函数
    // 一定注意其内部使用了immer下的produce函数保证如果有变化则返回的一定是一个【新的引用值】

    // 可以想到react中dispatchSetState函数中使用Object.is算法所带来的问题
    // 比如对一个对象属性进行修改之后再返回这个对象，你会发现react并没有进行更新
    // 原因就是is算法在判断新旧引用时是一样的，那么代表没有变化则不会进行更新

    // 解决方式就是使用下面的方法 // +++

    /* 
    https://immerjs.github.io/immer/#a-quick-example-for-comparison

    const baseState = [
      {
        title: "Learn TypeScript",
        done: true
      },
      {
        title: "Try Immer",
        done: false
      }
    ]

    Without Immer

    const nextState = baseState.slice() // shallow clone the array
    nextState[1] = {
      // replace element 1...
      ...nextState[1], // with a shallow clone of element 1
      done: true // ...combined with the desired update
    }
    // since nextState was freshly cloned, using push is safe here,
    // but doing the same thing at any arbitrary time in the future would
    // violate the immutability principles and introduce a bug!
    nextState.push({title: "Tweet about it"})

    With Immer

    import produce from "immer"

    const nextState = produce(baseState, draft => { // draft是一个Proxy实例
      draft[1].done = true
      draft.push({title: "Tweet about it"})
    })

    */

    // ------

    /* 
    // +++
    // 当前的combine函数的执行是在src/createStore.ts下的dispatch函数中进行执行的
    // 那么这里所返回的值将直接作为dispatch函数所在的作用域中的currentState变量的值 // +++
    */
  }
}
