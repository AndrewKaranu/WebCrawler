# BullMQ Integration for Dive & Scrape Job

# Processing

## Setting Up a BullMQ Queue for Crawl Jobs

To offload crawling and scraping tasks from the API layer, we will introduce **BullMQ** as a job queue. BullMQ
uses Redis to store jobs and manage workers. We will start with a **single queue** to handle all "dive" and
"scrape" jobs (for now) – BullMQ allows one queue to contain many job types, and we can add more queues
later if needed.

```
Queue Initialization: Create a BullMQ Queue (e.g. diveQueue) when the application starts. This
queue will serve as a container for all dive and scrape jobs. For example:
```
```
import { Queue} from'bullmq';
constdiveQueue= new Queue('DiveJobs'); // using Redis connection
```
BullMQ will use Redis to persist these jobs until a worker processes them. Ensure a Redis instance is
configured (BullMQ relies on Redis/Dragonfly for job storage ).

```
One vs. Multiple Queues: Using one queue simplifies initial implementation: all jobs are enqueued
in DiveJobs queue. BullMQ supports adding multiple queues for different job types if needed.
In the future, we can introduce separate queues (e.g. a dedicated ScrapeJobs queue) if massive
scrape sub-tasks from a dive begin to overwhelm the main queue. For now, we'll differentiate job
types within the single queue rather than separate queues.
```
## Enqueuing Jobs in DiveController Endpoints

Each API endpoint in DiveController.ts will create a BullMQ job instead of running tasks
synchronously:

```
POST /api/dive – When a full crawl ("dive") request is received, validate and normalize the input
options (via DiveService). Then add a new job to the diveQueue. For example:
```
```
constjobData= { url: startUrl, options: diveOptions};
constjob = awaitdiveQueue.add('diveFull', jobData);
```
Here 'diveFull' is the job **name** indicating a full crawl, and jobData carries the target URL and crawl
options. This call enqueues a job in Redis for processing by a worker. BullMQ will assign a unique

### 1 • 2 3 • 1 • 2


job.id if none is provided (we can optionally use a custom ID like an engineId). The API should respond
immediately with an identifier (e.g. the job.id) that the client can use to track progress.

```
POST /api/dive/preview – Similar to above, enqueue a job named say 'divePreview' with the
URL to perform a quick link-count or sitemap preview. This job will be processed by the same queue
but handled with a different logic branch (since it's a lighter preview crawl). For instance:
```
```
awaitdiveQueue.add('divePreview', { url, options: previewOptions });
```
```
POST /api/dive/validate – This endpoint only validates options and does not perform crawling , so
it can remain synchronous. It will call the validation logic in DiveService directly and return
results without queuing. (Only actual crawling/scraping actions are queued, per the requirement to
put "any scraping or diving functions" into the queue.)
```
```
GET /api/dive/progress/:jobId – This endpoint will retrieve the status of a job by its ID. Using
BullMQ's Job API, we can fetch the job and inspect its state and progress. For example:
```
```
constjob = awaitdiveQueue.getJob(jobId);
if(!job) { /* handle unknown jobId */}
conststate =await
job.getState(); // e.g. "waiting", "active", "completed", etc.
constprogress = job.progress; // numeric or object progress value
constresult = job.returnvalue; // if completed, any return value
```
BullMQ defines various job states like **waiting, active, completed, failed, delayed** , etc. We can use
job.getState() to retrieve the current status string (e.g. "active" while running, "completed" when
done). The endpoint should return a JSON containing the job’s status and progress metrics (and possibly
result or error if finished).

## Processing Jobs with BullMQ Workers

We will implement a BullMQ **Worker** that listens on the DiveJobs queue and executes crawl or scrape
tasks. This worker can be started in the background when the app launches (or in a separate process if
desired for scalability). Key implementation details:

```
Unified Worker for Multiple Job Types: Since we have a single queue, our worker will handle both
dive and scrape jobs. We can distinguish the job type by the job.name field and execute different
logic accordingly. For example:
```
```
import { Worker, Job} from'bullmq';
constdiveWorker =new Worker('DiveJobs', async(job: Job) => {
switch(job.name) {
case'diveFull':
// Call SpiderDiver to perform depth-first/breadth-first crawl
```
### • • • 4 5 • 6


```
return awaitSpiderEngine.performDive(job.data.url, job.data.options,
job);
case'divePreview':
// Call a lighter crawl function to get link counts or sitemap preview
return awaitSpiderEngine.performPreview(job.data.url, job.data.options,
job);
case'scrapePage':
// Use SpiderScraper to scrape a single URL (HTML, text, etc.)
return awaitSpiderEngine.scrapePage(job.data.url, job.data.options);
// ... other task types as needed
}
});
```
In this pseudo-code, we pass the job or its data into the existing SpiderDiver/SpiderScraper logic. The
SpiderEngine.performDive would encapsulate the crawl loop (depth-first or breadth-first), but now it
can **report progress** via the BullMQ job (see below). The worker runs these tasks asynchronously. Using a
single Worker with a switch on job.name follows BullMQ’s "named jobs" pattern to differentiate logic

. (Alternatively, multiple Worker instances or processors could be registered, but a single switch-case is
straightforward.)

```
Concurrency and Rate Limits: By default, one worker will process one job at a time. BullMQ allows
setting concurrency if we want to process multiple jobs in parallel (e.g. multiple scrapes
simultaneously) by passing an option like { concurrency: N } to the Worker. We might start
with concurrency 1 or a low number to avoid overloading resources, especially if each job already
manages multiple internal requests. We can also leverage BullMQ’s rate limiting if needed (e.g. if we
want to throttle how fast pages are fetched globally) , although the SpiderEngine’s own delay
settings and robots.txt compliance might suffice.
```
```
Job Completion: When a job function returns (or resolves a Promise), BullMQ will mark it as
completed (or failed if an error is thrown). The return value becomes job.returnvalue , which
we can use if needed (for example, the dive job could return a final sitemap or summary, which
could be retrieved later via job.returnvalue).
```
## Updating and Tracking Progress

A crucial feature to implement is **live progress updates** for each job. BullMQ supports progress reporting
out of the box:

```
Reporting Progress in Workers: Inside the SpiderEngine crawl/scrape logic, we should periodically
call job.updateProgress(...) to record how far along the task is. This could be a simple
percentage or a detailed object. For our use case, we can include metrics like pages processed,
pages queued, assets found, etc. For example, during a crawl the code might do:
```
### 6 • 7 • 8 •


```
// Within SpiderDiver loop:
job.updateProgress({ processed: countVisited, queued: countQueued, visited:
uniqueVisitedCount});
```
BullMQ will save this progress data in Redis. The worker can call updateProgress multiple times as the
crawl proceeds. We can even send an object for complex needs (as shown in BullMQ docs). For
instance, BullMQ’s example uses await job.updateProgress({ foo: 'bar' }) to illustrate object
progress data. In our case, the object can carry crawl stats.

```
Note: job.updateProgress is async and returns a Promise, but we can fire-and-forget or
await it inside the crawl loop. This call will emit a progress event internally and store the
progress value.
```
```
Polling Progress via API: The /api/dive/progress/:jobId endpoint will use the job’s stored
progress. After retrieving the job (as shown earlier), we can get job.progress which holds the
latest progress value (number or object). For example, if
job.progress = { processed: 10, queued: 5 }, we return that to the client. We should
also return the job’s state (e.g. "active" or "completed"). If the job is completed, we might include the
result (e.g. sitemap data) or have the client call another endpoint to fetch results.
```
```
Real-Time Updates (Future): Although our current plan uses polling, BullMQ also allows listening to
events for real-time updates. We could set up a QueueEvents listener on the server to push
progress to clients via WebSockets or Server-Sent Events if needed. For now, a simple polling
API is acceptable.
```
```
Job IDs and Tracking: The job ID returned when enqueuing is what the client/front-end will use to
query progress. By default, BullMQ job IDs are auto-generated (as increasing integers or UUIDs). We
can use the default or supply our own (e.g. use the engineId that was previously used internally
for crawls). If we want to specify a custom ID, queue.add accepts an opts parameter with an
id field. Just be careful to ensure uniqueness (BullMQ will reject duplicate IDs in the same
queue). Using the job’s ID for progress lookup is straightforward via queue.getJob(id) or
Job.fromId(queue, id).
```
## Future Considerations: Sub-Queues and Dependent Tasks

The initial implementation groups all tasks in one queue with basic differentiation by job name. As the
system scales, we should be prepared to adjust this model:

```
Dedicated Queues per Task Type: If we find that long-running dives hold up shorter scrape jobs
(or vice versa), we could split into separate queues. For example, a DiveQueue for crawling jobs
and a ScrapeQueue for individual page scrapes. BullMQ makes it easy to create multiple queues
for different purposes. We could then run separate workers (one per queue) to isolate
workloads. The decision to create sub-queues might depend on monitoring job throughput and
resource usage.
```
```
9 9
```
```
9
```
```
10
```
### •

```
11
```
### •

```
12 13
```
### •

```
14
```
```
8
```
### •

```
1
```

```
Chained Jobs / Flows: In scenarios where a dive job spawns many scrape jobs and we want to treat
them as a group, BullMQ provides Flows (job dependencies). A "parent" job (the dive) can
automatically trigger a batch of "child" jobs (scraping each discovered page) and even wait for all
children to finish before completing. Implementing flows is more advanced but could be
useful if we need the dive job to aggregate results from all scrapes. For now, a simpler approach is
for the dive job to directly perform scraping via SpiderScraper as it crawls (serially) or to
enqueue child scrape jobs without waiting (fire-and-forget). If we choose to enqueue separate
scrape jobs, we could either:
```
```
Treat them as independent jobs (the dive completes immediately after queuing scrapes, and scrapes
run in parallel). In this case, progress for each scrape is tracked separately, and the dive’s own job
might finish once links are queued.
```
```
Or use flows to have the dive job as a parent that only completes when scrapes are done (ensuring
one combined result). BullMQ’s flow support (via FlowProducer) can manage this by adding a job
with children and automatically marking the parent as "waiting-children" until all are done.
```
```
Progress for Multiple Jobs: If a dive triggers multiple sub-jobs, we would likely provide progress on
each job individually (e.g. separate progress endpoints for each scrape, or an aggregate progress in
the parent). This will require careful planning in the UI and API. For now, since our dive job internally
handles scraping, we will report overall progress in one job. When using multiple jobs, we might
extend the progress endpoint or add new ones (for example, an endpoint to list all jobs spawned by
a dive, etc., possibly using BullMQ’s getters for job counts and states ).
```
In summary, integrating BullMQ will involve: - Creating a Queue for dive/scrape jobs and returning job IDs
from the API. - Implementing a Worker to process jobs by type (full dive, preview, single-page scrape,
etc.). - Using job.updateProgress within SpiderDiver/SpiderScraper to regularly update crawl progress
(pages visited, queued, etc.). - Exposing a progress API that fetches the BullMQ job status and progress

. - Planning for future scaling by possibly splitting queues or using job flows for complex scenarios
.

By offloading crawling and scraping to BullMQ, we gain resilience (jobs persist in Redis), the ability to
handle concurrency, and introspection into job states. This will make the /api/dive operations non-
blocking and scalable, while providing a mechanism to track long-running crawl tasks in real time. All heavy
**“dive”** operations and any subsequent **scraping** of pages will execute in the background through the
queue, improving the API responsiveness and reliability.

### •

```
15 16
```
### •

### •

```
17
```
### •

```
18
```
```
9
5 11
1 15
```

BullMQ - Ultimate Guide + Getting Started Tutorial [2025]
https://www.dragonflydb.io/guides/bullmq

Queues | BullMQ
https://docs.bullmq.io/guide/queues

Getters | BullMQ
https://docs.bullmq.io/guide/jobs/getters

Flows | BullMQ
https://docs.bullmq.io/guide/flows

Named Processor | BullMQ
https://docs.bullmq.io/patterns/named-processor

Returning job data | BullMQ
https://docs.bullmq.io/guide/returning-job-data

Workers | BullMQ
https://docs.bullmq.io/guide/workers

Job | bullmq - v5.56.
https://api.docs.bullmq.io/classes/v4.Job.html

```
1 3 7 14
```
```
2
```
```
4 18
```
```
5 15 16 17
```
```
6
```
```
8
```
```
9 10 12 13
```
```
11
```

