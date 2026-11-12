const minimumDuration = 2000
const completedDuration = 240

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds))
}

export async function showProgressUntil<T>(task: Promise<T>, finish: () => void): Promise<T> {
  const [result] = await Promise.allSettled([task, wait(minimumDuration)])
  finish()
  await wait(completedDuration)
  if (result.status === 'rejected') throw result.reason
  return result.value
}
