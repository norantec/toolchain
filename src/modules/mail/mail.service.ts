import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import * as Handlebars from 'handlebars';
import * as axios from 'axios';
import { CheckerUtil } from '../../utilities/checker-util.class';
import { StringUtil } from '../../utilities/string-util.class';
import { ResultVO } from '../../vos/result.vo.class';
import { CommonExceptionUtil } from '../../utilities/common-exception-util.class';
import {
    MailModuleOptions,
    MessageConfig,
} from './mail.interface';

@Injectable()
export class MailService {
    public constructor(private readonly options: MailModuleOptions) {
        // setTimeout(() => {
        //     this.send({
        //         to: 'i@lenconda.top',
        //         messageId: 'requestSignInCode',
        //         bodyContext: {
        //             expirationMinutes: 5,
        //             code: '1029i309i',
        //         },
        //     }).then((result) => {
        //         console.log('LENCONDA:FUCK', result);
        //     });
        // }, 6000);
    }

    public async send(
        {
            messageId,
            to,
            bodyContext = {},
            titleContext = {},
            locale,
        }: {
            messageId: string;
            to: string;
            bodyContext?: Record<string, any>;
            locale?: string;
            titleContext?: Record<string, any>;
        },
    ) {
        CheckerUtil.check({
            to: () => StringUtil.isFalsyString(to),
            messageId: () => StringUtil.isFalsyString(messageId),
        });

        const result = new ResultVO();
        result.createdAt = Date.now();
        const localeTextMap = _.merge({}, this.options?.getLocaleTextMap?.(locale));
        const messageConfig: MessageConfig = this.options?.getMessage?.(messageId);

        if (!messageConfig || StringUtil.isFalsyString(messageConfig?.config?.body) || StringUtil.isFalsyString(messageConfig?.config?.title)) {
            throw CommonExceptionUtil.create(
                CommonExceptionUtil.Code.INVALID_PARAMS,
                {
                    params: [
                        'messageId',
                    ],
                },
            );
        }

        const i18n = Array.isArray(messageConfig?.i18n)
            ? messageConfig.i18n.map((key) => {
                if (StringUtil.isFalsyString(key)) {
                    return '';
                }

                let rawText = _.get(localeTextMap, key);

                if (StringUtil.isFalsyString(rawText)) {
                    rawText = key;
                }

                return Handlebars.compile(rawText)(bodyContext);
            })
            : [];
        const html = Handlebars.compile(
            this.options?.frameworkTemplate,
            {
                noEscape: true,
            },
        )({
            content: Handlebars.compile(messageConfig.config.body)({
                ...bodyContext,
                i18n,
            }),
        });
        const subject = Handlebars.compile(messageConfig.config.title)({
            ...titleContext,
            i18n,
        });

        try {
            const response = await axios.default.request({
                url: `${this.options?.apiPrefix}/mail/send`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    html,
                    subject,
                    to,
                    from: {
                        name: this.options?.displayName,
                        address: this.options?.displayAddress,
                    },
                }),
                auth: this.options?.auth,
            });

            if (response?.status >= 400) {
                result.updatedAt = Date.now();
                result.success = false;
                return result;
            }

            result.success = true;
            result.updatedAt = Date.now();

            return result;
        } catch (e) {
            result.success = false;
            result.updatedAt = Date.now();
            return result;
        }
    }
}
