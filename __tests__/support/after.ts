// Stand-in for `after` from `next/server`, which only works inside a Next
// request. A test file swaps it in with
//
//   vi.mock("next/server", async (importOriginal) => ({
//     ...(await importOriginal<typeof import("next/server")>()),
//     after: (await import("../support/after")).after,
//   }));
//
// and then runs what the code under test scheduled with `runAfterTasks()`,
// as Next would once the response is sent.

type Task = (() => unknown) | Promise<unknown>;

let tasks: Task[] = [];

export function after(task: Task) {
  tasks.push(task);
}

/** Runs every task scheduled so far, and any they schedule, in order. */
export async function runAfterTasks() {
  while (tasks.length > 0) {
    const task = tasks.shift()!;
    await (typeof task === "function" ? task() : task);
  }
}

/** Takes the tasks scheduled so far without running them; run them later with the returned function. */
export function takeAfterTasks(): () => Promise<void> {
  const taken = tasks;
  tasks = [];
  return async () => {
    for (const task of taken) {
      await (typeof task === "function" ? task() : task);
    }
  };
}

export function resetAfterTasks() {
  tasks = [];
}
