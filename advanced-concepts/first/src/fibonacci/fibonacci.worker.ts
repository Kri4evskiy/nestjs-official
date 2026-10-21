// import { parentPort } from 'worker_threads';

// if (!parentPort) {
//   throw new Error('This file must be run as a Worker thread');
// }

function fib(n: number): number {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

// parentPort.on('message', ({ n, id }: { n: number; id: string }) => {
//   const result = fib(n);
//   parentPort!.postMessage({ result, id });
// });

export default (n: number) => fib(n);
