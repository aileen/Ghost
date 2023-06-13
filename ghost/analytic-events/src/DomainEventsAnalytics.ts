import {MilestoneCreatedEvent} from '@tryghost/milestones';

interface IExceptionHandler {
    captureException(err: Error): void;
}

interface IDomainEventsAnalytics {
    analytics: AnalyticsNode;
    logging: Logging;
    trackDefaults: object;
    prefix: string;
    exceptionHandler: IExceptionHandler;
    DomainEvents: DomainEvents;
}

export class DomainEventsAnalytics {
    #analytics: AnalyticsNode;
    #trackDefaults: object;
    #prefix: string;
    #exceptionHandler: IExceptionHandler;
    #logging: Logging;
    #DomainEvents: DomainEvents;

    constructor(deps: IDomainEventsAnalytics) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#exceptionHandler = deps.exceptionHandler;
        this.#logging = deps.logging;
        this.#DomainEvents = deps.DomainEvents;
    }

    private async #handleMilestoneCreatedEvent(event: { data: { milestone: { value: number; type: string } } }) {
        if (
            event.data.milestone &&
            event.data.milestone.value === 100
        ) {
            const eventName =
                event.data.milestone.type === 'arr'
                    ? '$100 MRR reached'
                    : '100 Members reached';

            try {
                this.#analytics.track({
                    ...this.#trackDefaults,
                    event: this.#prefix + eventName
                });
            } catch (err) {
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
