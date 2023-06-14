import {MilestoneCreatedEvent} from '@tryghost/milestones';
import {events} from '@tryghost/members-stripe-service';
const {StripeLiveEnabledEvent, StripeLiveDisabledEvent} = events;

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
    subscribe(event: string, callback: (event: IMilestoneCreatedEvent) => Promise<void>): void;
}
interface ITrackDefaults {
    userId: string;
    properties: object;
}

interface IAnalyticsTrackNode extends ITrackDefaults {
    event: string;
}

interface IMilestoneCreatedEvent {
    data: {
        milestone: {
            value: number;
            type: string;
        };
    }
}

interface IStripeLiveEnabledEvent {
    data: {
        message: string;
    }
}

interface IStripeLiveDisabledEvent {
    data: {
        message: string;
    }
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
     * @param {IMilestoneCreatedEvent} event
     * @returns {Promise<void>}
     */
    async #handleMilestoneCreatedEvent(event: IMilestoneCreatedEvent) {
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

    /**
     * @param {StripeLiveEnabledEvent|StripeLiveDisabledEvent} eventType
     * @returns {Promise<void>}
     */
    async #handleStripeEvent(eventType: IStripeLiveEnabledEvent | IStripeLiveDisabledEvent) {
        const eventName = eventType === StripeLiveDisabledEvent ? 'Stripe Live Disabled' : 'Stripe Live Enabled';

        try {
            this.#analytics.track(Object.assign(this.#trackDefaults, {}, {event: this.#prefix + eventName}));
        } catch (err: any) {
            this.#logging.error(err);
            this.#exceptionHandler.captureException(err);
        }
    }

    subscribeToEvents() {
        this.#DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            await this.#handleMilestoneCreatedEvent(event);
        });

        this.#DomainEvents.subscribe(StripeLiveEnabledEvent, async () => {
            await this.#handleStripeEvent(StripeLiveEnabledEvent);
        });

        this.#DomainEvents.subscribe(StripeLiveDisabledEvent, async () => {
            await this.#handleStripeEvent(StripeLiveDisabledEvent);
        });
    }
}
