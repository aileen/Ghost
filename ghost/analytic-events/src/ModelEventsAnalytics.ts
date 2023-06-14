import _ from 'lodash';

type ExceptionHandler = {
    captureException(err: Error): void;
}

type Logging = {
    error(err: Error): void;
}

type Analytics = {
    track(eventData: IAnalyticsTrackNode): void;
}

type EventNode = {
    event: string;
    data?: {
        name?: string;
    };
}

type ICommonEvents = {
    on(event: string, callback: (event: EventNode) => Promise<void>): void;
}

interface ITrackDefaults {
    userId: string;
    properties: object;
}

interface IAnalyticsTrackNode extends ITrackDefaults {
    event: string;
}

interface IModelEventsAnalytics {
    analytics: Analytics;
    logging: Logging;
    trackDefaults: ITrackDefaults;
    prefix: string;
    exceptionHandler: ExceptionHandler;
    events: ICommonEvents;
    subscribeToEvents(): void;
}

/**
 * Listens to model events to layer on analytics - also uses the "fake" theme.uploaded
 * event from the theme API
 */
export class ModelEventsAnalytics {
    #analytics: Analytics;
    #trackDefaults: ITrackDefaults;
    #prefix: string;
    #exceptionHandler: ExceptionHandler;
    #logging: Logging;
    #events: ICommonEvents;

    /**
     * @type {Array<{event: string, name: string, data?: object}>}
     */
    #toTrack = [
        {
            event: 'post.published',
            name: 'Post Published'
        },
        {
            event: 'page.published',
            name: 'Page Published'
        },
        {
            event: 'theme.uploaded',
            name: 'Theme Uploaded',
            // {keyOnSuppliedEventData: keyOnTrackedEventData}
            // - used to extract specific properties from event data and give them meaningful names
            data: {name: 'name'}
        },
        {
            event: 'integration.added',
            name: 'Custom Integration Added'
        }
    ];

    constructor(deps: IModelEventsAnalytics) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#exceptionHandler = deps.exceptionHandler;
        this.#events = deps.events;
        this.#logging = deps.logging;
    }

    async #handleEvent(event: IAnalyticsTrackNode) {
        try {
            this.#analytics.track(event);
        } catch (err: any) {
            this.#logging.error(err);
            this.#exceptionHandler.captureException(err);
        }
    }

    subscribeToEvents() {
        this.#toTrack.forEach(({event, name, data = {}}) => {
            this.#events.on(event, async (eventData: EventNode) => {
                // extract desired properties from eventData and rename keys if necessary
                const mappedData = _.mapValues(data || {}, v => eventData[v]);

                const eventToTrack: IAnalyticsTrackNode = {
                    ...this.#trackDefaults,
                    event: this.#prefix + name,
                    ...mappedData
                };

                await this.#handleEvent(eventToTrack);
            });
        });
    }
}
