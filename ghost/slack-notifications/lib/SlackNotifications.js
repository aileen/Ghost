const got = require('got');
const validator = require('@tryghost/validator');
const errors = require('@tryghost/errors');
const ghostVersion = require('@tryghost/version');
const moment = require('moment');

/**
 * @typedef {object} config
 * @property {URL} webhookUrl
 */

/**
 * @typedef {string} siteUrl
 */

/**
 * @typedef {import('./SlackNotificationsService').ISlackNotifications} ISlackNotifications
 */

/**
 * @implements {ISlackNotifications}
 */
class SlackNotifications {
    /** @type {config} */
    #config;

    /** @type {siteUrl} */
    #siteUrl;

    /** @type {import('@tryghost/logging')} */
    #logging;

    /**
     * @param {object} deps
     * @param {config} deps.config
     * @param {siteUrl} deps.siteUrl
     * @param {import('@tryghost/logging')} deps.logging
     */
    constructor(deps) {
        this.#siteUrl = deps.siteUrl;
        this.#config = deps.config;
        this.#logging = deps.logging;
    }

    /**
     * @param {object} eventData
     * @param {import('@tryghost/milestones/lib/InMemoryMilestoneRepository').Milestone} eventData.milestone
     * @param {object} [eventData.meta]
     * @param {'import'|'email'} [eventData.meta.reason]
     * @param {number} [eventData.meta.currentARR]
     * @param {number} [eventData.meta.currentMembers]
     *
     * @returns {Promise<void>}
     */
    async notifyMilestoneReceived({milestone, meta}) {
        const hasImportedMembers = meta?.reason === 'import' ? 'has imported members' : null;
        const lastEmailTooSoon = meta?.reason === 'email' ? 'last email too recent' : null;
        const emailNotSentReason = hasImportedMembers || lastEmailTooSoon;
        const milestoneTypePretty = milestone.type === 'arr' ? 'ARR' : 'Members';
        const valueFormatted = this.#getFormattedAmount({amount: milestone.value, currency: milestone?.currency});
        const emailSentText = milestone?.emailSentAt ? this.#getFormattedDate(milestone?.emailSentAt) : `no / ${emailNotSentReason}`;
        const title = `:tada: ${milestoneTypePretty} Milestone ${valueFormatted} reached!`;

        let valueSection;

        if (milestone.type === 'arr') {
            valueSection = {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Milestone:*\n${valueFormatted}`
                    }

                ]
            };

            if (meta?.currentARR) {
                valueSection.fields.push({
                    type: 'mrkdwn',
                    text: `*Current ARR:*\n${this.#getFormattedAmount({amount: meta.currentARR, currency: milestone?.currency})}`
                });
            }
        } else {
            valueSection = {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Milestone:*\n${valueFormatted}`
                    }
                ]
            };
            if (meta?.currentMembers) {
                valueSection.fields.push({
                    type: 'mrkdwn',
                    text: `*Current Members:*\n${this.#getFormattedAmount({amount: meta.currentMembers})}`
                });
            }
        }

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: title,
                    emoji: true
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `New *${milestoneTypePretty} Milestone* achieved for <${this.#siteUrl}|${this.#siteUrl}>`
                }
            },
            {
                type: 'divider'
            },
            valueSection,
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Email sent:*\n${emailSentText}`
                }
            }
        ];

        const slackData = {
            unfurl_links: false,
            username: 'Ghost Milestone Service',
            blocks
        };

        await this.send(slackData, this.#config.webhookUrl);
    }

    /**
     *
     * @param {object} slackData
     * @param {URL} url
     *
     * @returns {Promise<any>}
     */
    async send(slackData, url) {
        if (!url || typeof url !== 'string' || !validator.isURL(url)) {
            const err = new errors.InternalServerError({
                message: 'URL empty or invalid.',
                code: 'URL_MISSING_INVALID',
                context: url
            });

            return this.#logging.error(err);
        }

        const requestOptions = {
            body: JSON.stringify(slackData),
            headers: {
                'user-agent': 'Ghost/' + ghostVersion.original + ' (https://github.com/TryGhost/Ghost)'
            }
        };

        return await got(url, requestOptions);
    }

    /**
     * @param {object} options
     * @param {number} options.amount
     * @param {string} [options.currency]
     *
     * @returns {string}
     */
    #getFormattedAmount({amount = 0, currency}) {
        if (!currency) {
            return Intl.NumberFormat().format(amount);
        }

        return Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol'
        }).format(amount);
    }

    /**
     * @param {string|Date} date
     *
     * @returns {string}
     */
    #getFormattedDate(date) {
        return moment(date).format('D MMM YYYY');
    }
}

module.exports = SlackNotifications;
