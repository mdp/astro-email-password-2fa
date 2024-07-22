export class ConstantRefillTokenBucket<_Key> {
	public max: number;
	public refillIntervalSeconds: number;

	constructor(max: number, refillIntervalSeconds: number) {
		this.max = max;
		this.refillIntervalSeconds = refillIntervalSeconds;
	}

	private storage = new Map<_Key, Bucket>();

	public check(key: _Key, cost: number): boolean {
		let bucket = this.storage.get(key) ?? null;
		const now = Date.now();
		if (bucket === null) {
			bucket = {
				count: this.max - cost,
				refilledAt: now
			};
			this.storage.set(key, bucket);
			return true;
		}
		const refill = Math.floor((now - bucket.refilledAt) / (this.refillIntervalSeconds * 1000));
		if (refill > 0) {
			bucket.count = Math.min(bucket.count + refill, this.max);
			bucket.refilledAt = now;
		}
		if (bucket.count < cost) {
			return false;
		}
		bucket.count -= cost;
		this.storage.set(key, bucket);
		return true;
	}
}

export class Throttler<_Key> {
	public waitTimes: number[];

	private storage = new Map<_Key, ThrottlingCounter>();

	constructor(waitTimes: number[]) {
		this.waitTimes = waitTimes;
	}

	public check(key: _Key): boolean {
		let counter = this.storage.get(key) ?? null;
		const now = Date.now();
		if (counter === null) {
			counter = {
				waitTime: 0,
				updatedAt: now
			};
			this.storage.set(key, counter);
			return true;
		}
		return now - counter.updatedAt >= this.waitTimes[counter.waitTime] * 1000;
	}

	public increment(key: _Key): void {
		let counter = this.storage.get(key) ?? null;
		const now = Date.now();
		if (counter === null) {
			counter = {
				waitTime: 0,
				updatedAt: now
			};
			this.storage.set(key, counter);
			return;
		}
		counter.updatedAt = now;
		counter.waitTime = Math.min(counter.waitTime + 1, this.waitTimes.length - 1);
		this.storage.set(key, counter);
	}

	public reset(key: _Key): void {
		this.storage.delete(key);
	}
}

export class FixedRefillTokenBucket<_Key> {
	public max: number;
	public refillIntervalSeconds: number;

	private storage = new Map<_Key, Bucket>();

	constructor(max: number, refillIntervalSeconds: number) {
		this.max = max;
		this.refillIntervalSeconds = refillIntervalSeconds;
	}

	public check(key: _Key, cost: number): boolean {
		let bucket = this.storage.get(key) ?? null;
		const now = Date.now();
		if (bucket === null) {
			bucket = {
				count: this.max - cost,
				refilledAt: now
			};
			this.storage.set(key, bucket);
			return true;
		}
		if (now - bucket.refilledAt >= this.refillIntervalSeconds * 1000) {
			bucket.count = this.max;
		}
		if (bucket.count < cost) {
			return false;
		}
		bucket.count -= cost;
		this.storage.set(key, bucket);
		return true;
	}

	public reset(key: _Key): void {
		this.storage.delete(key);
	}
}

interface Bucket {
	count: number;
	refilledAt: number;
}

interface ThrottlingCounter {
	waitTime: number;
	updatedAt: number;
}
