import { EventEmitter } from 'events';

const buses = new Map();

export function getBus(jobId) {
  if (!buses.has(jobId)) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(30);
    buses.set(jobId, emitter);
  }
  return buses.get(jobId);
}

export function destroyBus(jobId) {
  buses.delete(jobId);
}

export function logToJob(jobId, message) {
  console.log(message);
  const bus = buses.get(jobId);
  if (bus) bus.emit('log', message);
}