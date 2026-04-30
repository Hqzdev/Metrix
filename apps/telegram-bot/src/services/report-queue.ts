type QueueJob = {
  run: () => Promise<void>
}

export class ReportQueue {
  private readonly jobs: QueueJob[] = []
  private running = false

  enqueue(run: () => Promise<void>): void {
    this.jobs.push({ run })
    this.processNext()
  }

  private processNext(): void {
    if (this.running || this.jobs.length === 0) return
    this.running = true
    const job = this.jobs.shift()!

    setImmediate(async () => {
      try {
        await job.run()
      } finally {
        this.running = false
        this.processNext()
      }
    })
  }
}
