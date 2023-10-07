// https://github.com/sindresorhus/p-limit

function promiseLimit(concurrency: number) {
  if (
    !(
      (Number.isInteger(concurrency) || concurrency === Infinity) &&
      concurrency > 0
    )
  ) {
    throw new TypeError(
      "Expected `concurrency` to be an integer and bigger than 0"
    );
  }

  // 当前正在进行中的异步任务
  const queue: ((...args: unknown[]) => unknown)[] = [];
  // 当前正在进行中的异步任务的数量
  let activeCount = 0;

  // 执行器
  async function run(
    fn: (...args: unknown[]) => unknown,
    resolve: (value: unknown) => void,
    ...args: unknown[]
  ) {
    activeCount++;
    const result = (async () => fn(...args))();
    resolve(result);
    try {
      await result;
    } catch (error) {
      // TODO
    }
    next();
  }

  // 执行下一个任务
  function next() {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  }

  // 入队
  function enqueue(
    fn: (...args: unknown[]) => unknown,
    resolve: (value: unknown) => void,
    ...args: unknown[]
  ) {
    queue.push(run.bind(null, fn, resolve, ...args));

    (async () => {
      await Promise.resolve();

      if (activeCount < concurrency && queue.length > 0) {
        queue.shift()!();
      }
    })();
  }

  // 添加并发任务
  function generator(fn: (...args: unknown[]) => unknown, ...args: unknown[]) {
    return new Promise((resolve) => {
      enqueue(fn, resolve, ...args);
    });
  }

  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount,
    },
    pendingCount: {
      get: () => queue.length,
    },
    clearQueue: {
      value: () => {
        queue.length = 0;
      },
    },
  });

  return generator;
}

export default promiseLimit;
