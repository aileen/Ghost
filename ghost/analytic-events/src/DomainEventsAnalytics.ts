import {MilestoneCreatedEvent} from '@tryghost/milestones';

type ExceptionHandler = {
    captureException(err: Error): void;
}

type Logging = {
    error(err: Error): void;
}

type Analytics = {
    track(eventData: IAnalyticsTrackNode): void;
}

type IDomainEvents = {
    subscribe(event: string, callback: (event: IMilestoneEvent) => Promise<void>): void;
}
interface ITrackDefaults {
    userId: string;
    properties: object;
}

interface IAnalyticsTrackNode extends ITrackDefaults {
    event: string;
}

interface IDomainEventsAnalytics {
    analytics: Analytics;
    logging: Logging;
    trackDefaults: ITrackDefaults;
    prefix: string;
    exceptionHandler: ExceptionHandler;
    DomainEvents: IDomainEvents;
    subscribeToEvents(): void;
}

interface IMilestoneEvent {
    data: {
        milestone: {
            value: number;
            type: string;
        };
    }
}

export class DomainEventsAnalytics {
    #analytics: Analytics;
    #trackDefaults: ITrackDefaults;
    #prefix: string;
    #exceptionHandler: ExceptionHandler;
    #logging: Logging;
    #DomainEvents: IDomainEvents;

    constructor(deps: IDomainEventsAnalytics) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#exceptionHandler = deps.exceptionHandler;
        this.#logging = deps.logging;
        this.#DomainEvents = deps.DomainEvents;
    }

    /**
     * @param {IMilestoneEvent} event
     * @returns {Promise<void>}
     */
    async #handleMilestoneCreatedEvent(event: IMilestoneEvent) {
        if (event.data.milestone
            && event.data.milestone.value === 100
        ) {
            const eventName = event.data.milestone.type === 'arr' ? '$100 MRR reached' : '100 Members reached';
            try {
                const eventData:IAnalyticsTrackNode = {
                    ...this.#trackDefaults,
                    event: `${this.#prefix} ${eventName}`
                };
                this.#analytics.track(eventData);
            } catch (err: any) {
                this.#logging.error(err);
                this.#exceptionHandler.captureException(err);
            }
        }
    }

    subscribeToEvents() {
        this.#DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            await this.#handleMilestoneCreatedEvent(event);
        });
    }
}
